# Seed misturado — repopular o MongoDB de produção

**Data:** 2026-06-17
**Contexto:** O servidor MongoDB antigo (`104.234.186.24` / banco `irmandade-hyper`) caiu. Precisamos
repopular um banco novo com a base de membros pagantes, combinando duas fontes.

## Objetivo

Gerar um banco MongoDB novo com os membros pagantes do Irmandade.

Popular duas collections no destino: `subscriptions` (fonte da verdade de "quem pagou") e
`app_users` (pra aparecer no painel admin).

### Decisão final de composição (2026-06-17)

Ao inspecionar o `.xlsx`, os pagantes IRMANDADE aprovados deram **95 emails únicos — já acima
dos ~86** estimados. Cruzando com a `users_eb`, o overlap é de apenas 3 e só 3 nomes seriam
recuperáveis. **Decisão: o seed leva apenas os 95 do Lastlink IRMANDADE; a esportiva não é usada.**
O `name` fica `null` (o export do Lastlink não trouxe nome).

- **Destino confirmado:** `mongodb://admin:***@104.131.7.171:27017/admin?authSource=admin`,
  banco **`irmandade-hyper`** (nome que o código espera; o usuário escreveu "irmanadade-huper",
  corrigido para casar com `mongodb.ts`).
- **Fonte confirmada:** `sales_list_2026-06-17.xlsx` (sheet `SalesReport`, 553 linhas).

## Fontes de dados

### 1. Lastlink (irmandade)
- **Formato real:** CSV original do Lastlink (o PDF recebido é só preview; o CSV tem as colunas
  alinhadas numa única tabela e é a fonte confiável — **o PDF paginado separa cada coluna em
  blocos de páginas e a coluna Nome veio vazia**, então não usaremos o PDF para o build).
- **Filtro:** `Status da venda == "Aprovada"` **E** produto principal ∈
  `{ "[APP] IRMANDADE CLUB", "IRMANDADE CLUB [VIP]", "[VIP] IRMANDADE CLUB" }`.
- Campos aproveitados: `E-mail do membro`, `Telefone do membro`, `Produto principal`,
  `Identificador da venda` (→ order id), `Data do pagamento`.
- **Nome:** ausente no export → fica `null` para registros vindos do Lastlink.

### 2. Esportiva (`users_apps_eb` → collection `users_eb`)
- Servidor: `168.195.14.106:27018` (somente leitura).
- Schema: `{ name, email, phone, documentNumber (CPF), platformId, status (UF), appInstall, createdAt }`.
- 100 docs. `status` é a UF do usuário (não é status de assinatura).

### Destino
- **Servidor/URI:** a definir (o usuário vai fornecer). Provavelmente banco `irmandade-hyper`
  pra casar com `DB_NAME` em [server/utils/mongodb.ts](server/utils/mongodb.ts).
- Após criado, atualizar `MONGODB_URI`/`mongodb.ts` para apontar pro destino.

## Pipeline (script `scripts/seed-mixed.mjs`)

Configuração 100% via env / flags — nada hardcoded:
`LASTLINK_CSV`, `ESPORTIVA_URI`, `ESPORTIVA_DB=users_apps_eb`, `ESPORTIVA_COLL=users_eb`,
`DEST_URI`, `DEST_DB`, `TARGET_TOTAL=86`, `--dry-run`.

1. **Lê o CSV** do Lastlink → normaliza linhas em `{ email, phone, product, orderId, paidAt }`
   (email em lowercase). Aborta se as colunas esperadas não existirem.
2. **Filtra** por status aprovado + produto IRMANDADE. **Dedup por email** (mantém a venda mais recente).
3. **Conecta na esportiva** (read-only) e lê `users_eb` → normaliza
   `{ email, name, phone, document, uf, createdAt }` (email lowercase). Dedup por email.
4. **Monta lista final:** todos do Lastlink + preenche da esportiva (ordenado por `createdAt` desc,
   pulando emails já presentes) até `length == TARGET_TOTAL` (86). Loga quantos de cada fonte.
5. Para cada registro, gera **2 documentos** (upsert por email):
   - `subscriptions`: `{ email, status:'active', role:'paid', product, phone, name,
     lastlink_status:'seed', lastlink_order_id, created_at, updated_at, source }`
   - `app_users`: `{ email, name, phone, brand_slug, blocked:false,
     first_seen_at:null, last_seen_at:null, created_at, updated_at, source }`
   - `source` = `'lastlink'` ou `'esportiva'` (rastreabilidade).
   - `brand_slug` = `null` (lastlink) / `'esportiva'` (esportiva), pra filtrar no painel.
6. **Upsert por `email`** no destino → rodar de novo é idempotente (não duplica).
7. Imprime resumo: `X lastlink + Y esportiva = N total inseridos/atualizados`.

## Mapeamento de campos

| Destino (`subscriptions`/`app_users`) | Lastlink | Esportiva (`users_eb`) |
|---|---|---|
| email | E-mail do membro | email |
| name | `null` | name |
| phone | Telefone do membro | phone |
| product | Produto principal | `'esportiva'` (literal) |
| status / role | `active` / `paid` | `active` / `paid` |
| created_at | Data do pagamento | createdAt |
| first_seen_at / last_seen_at | `null` | `null` |
| brand_slug | `null` | `'esportiva'` |
| source | `'lastlink'` | `'esportiva'` |

## Decisões

- **Esportiva = read-only.** Destino é banco separado. Sem risco de bagunçar a fonte.
- **Idempotente** via `upsert` por email; Lastlink tem prioridade em colisão de email.
- **`first_seen_at` = null** (não acessaram o app ainda) — honesto e não dispara tags de risco erradas.
- **Dry-run** pra conferir contagens antes de gravar.

## Inputs necessários na implementação

1. O **CSV original** do Lastlink (não o PDF).
2. O **URI + nome do banco destino**.
3. Confirmar se atualizamos `mongodb.ts`/`.env` pro destino novo após o seed.

## Riscos

- **Contagem do Lastlink:** se os pagantes IRMANDADE aprovados já passarem de 86, o seed leva só
  eles (sem esportiva) e o total pode estourar 86 — nesse caso o script avisa e pergunta se trunca.
- **CSV com colunas diferentes do esperado:** o script valida o cabeçalho e aborta com mensagem clara.
