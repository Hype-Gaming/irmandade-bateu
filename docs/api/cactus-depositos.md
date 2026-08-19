# API Cactus — depósitos PIX

Convenções de header em [cactus-visao-geral.md](cactus-visao-geral.md).
No app, quem consome é [app/composables/useDeposit.ts](../../app/composables/useDeposit.ts).

## POST `/api/deposit`

**Headers obrigatórios:** `Authorization`, `X-Brand-Slug`, `X-Cactus-Cookie-Key`.

| Campo | Nota |
|---|---|
| `amount` (ou `value`) | valor **em reais**; a API converte para centavos |
| `user_id` (ou `userId`) | opcional — resolvido pelo token quando ausente |

```bash
curl -X POST https://routes-eb.grupoautoma.com/api/deposit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Brand-Slug: bateu" -H "X-Cactus-Cookie-Key: SEU_COOKIE_KEY" \
  -H "Content-Type: application/json" -d '{"amount":100}'
```

```json
{
  "success": true,
  "transaction_id": "bateubetbr_11361812",
  "br_code": "00020101021226710014br.gov.bcb.pix...",
  "qr_code": "https://quickchart.io/qr?size=400&text=...",
  "payment_link": "00020101021226710014br.gov.bcb.pix...",
  "amount": 100, "amount_cents": 10000, "value": 10000,
  "user_id": 28313810
}
```

- `br_code` → PIX copia e cola.
- `qr_code` → URL de imagem do QR.
- `amount` em reais, `amount_cents`/`value` em centavos.

## GET `/api/deposit/:transactionId/status`

**Header obrigatório:** `Authorization`.

```bash
curl https://routes-eb.grupoautoma.com/api/deposit/tx-123/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

→ `{ "success": true, "transaction_id": "tx-123", "status": "completed", "amount": 100.50 }`

> Depósito confirmado também é registrado no banco **deste** app via
> `POST /api/track/deposit` — ver [interna.md](interna.md).
