# Lastlink — webhook de assinaturas

Implementação: [server/api/webhook/lastlink.post.ts](../../server/api/webhook/lastlink.post.ts).

Uma compra aprovada na Lastlink cria/atualiza o documento em `subscriptions`, e é
isso que libera o acesso ao app.

## Endpoint

```
POST /api/webhook/lastlink?token=<TOKEN>
```

Token também aceito no header `X-Lastlink-Token`. Válidos: `LASTLINK_WEBHOOK_SECRET`
e `LASTLINK_WEBHOOK_SECRET_SEM_GALE` (dois produtos, mesma conta). **Sem fallback
hardcoded** — token ausente no `.env` significa webhook recusado com `401`.

## O formato do payload (a parte que quebra)

A Lastlink envia **PascalCase** e aninhado em `Data`:

```json
{
  "Id": "a7c1653d-4e42-11f1-9788-121476759c93",
  "IsTest": false,
  "Event": "Product_Access_Started",
  "CreatedAt": "2026-05-12T20:39:21",
  "Data": {
    "Product": { "Id": "...", "Name": "[APP] PRODUTO X" },
    "Member": { "Id": "...", "Email": "comprador@email.com" },
    "AccessType": "Paid",
    "SubscriptionId": "..."
  }
}
```

Três armadilhas que já custaram caro:

- O e-mail está em **`Data.Member.Email`** — não em `Buyer.Email` nem `customer.email`.
- O produto está em **`Data.Product`** (singular) — mas algumas variações mandam
  `Data.Products[]` (array).
- O identificador é **`Data.SubscriptionId`** — não `PurchaseId`.

Um handler que só lia `body.customer.email` respondia `400 "Email não encontrado
no payload"` e as compras nunca chegavam ao banco. Por isso os helpers
`pickEmail` / `pickEvent` / `pickProductName` / `pickPhone` / `pickName` /
`pickOrderId` varrem **todas** as variações conhecidas, em PascalCase e camelCase.

## Eventos

| Classe | Eventos | Efeito |
|---|---|---|
| **Ativo** | `paid`, `active`, `approved`, `completed`, `product_access_started`, `purchase_approved`, `purchase_completed`, `subscription_started`, `subscription_renewed` | `status: 'active'`, `role: 'paid'` |
| **Inativo** | `product_access_ended`, `purchase_refused`, `purchase_canceled`, `purchase_refunded`, `subscription_canceled`, `subscription_expired`, `chargeback` | `status: 'inactive'`, `role: 'free'` |
| **Outros** | qualquer coisa | `200 { received: true, ignored: true }` |

Evento desconhecido responde **200 de propósito**: um `4xx` faria a Lastlink
retentar indefinidamente.

Evento sem mudança de status ainda atualiza nome/telefone — mas só com
`updateOne` sem upsert, para não criar assinatura a partir de um evento neutro.
Campos ausentes no payload nunca sobrescrevem dados já gravados.

## Persistência

`updateOne({ email: <lowercase> }, { $set, $setOnInsert: { created_at } }, { upsert: true })`
na collection `subscriptions`. Campos gravados: `email`, `status`, `role`,
`lastlink_status`, `lastlink_order_id`, `product`, `updated_at` e, quando vierem,
`phone` e `name`.

## Testar

Todo payload recebido é logado inteiro (`console.log`) — é o primeiro lugar a
olhar quando algo não entra.

```bash
curl -X POST 'https://app.clubdabb2.online/api/webhook/lastlink?token=SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"Event":"Product_Access_Started",
       "Data":{"Member":{"Email":"teste@example.com"},
               "Product":{"Name":"Plano X"},
               "SubscriptionId":"abc-123"}}'
```

Esperado: `200 {"received":true,"email":"teste@example.com","status":"active"}`
e o documento criado em `subscriptions`.

Para testar com a Lastlink real em ambiente local, exponha a porta com um túnel
(cloudflared já está liberado no `vite.server.allowedHosts` do
[nuxt.config.ts](../../nuxt.config.ts)).

## Sintomas conhecidos

| Sintoma | Causa provável |
|---|---|
| `401 Token inválido` | `LASTLINK_WEBHOOK_SECRET` ausente ou diferente do painel |
| `400 Email não encontrado` | variação de payload nova — veja o log e acrescente o caminho em `pickEmail` |
| Compra entra mas sem acesso | evento fora da lista de ativos; conferir `lastlink_status` no documento |
| Poucos registros com `lastlink_status` | os demais foram liberados na mão pelo painel admin, não pelo webhook |
