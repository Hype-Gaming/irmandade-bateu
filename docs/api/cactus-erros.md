# API Cactus — erros

## Formato

```json
{
  "message": "Descrição do erro",
  "endpoint": "GET /api/rota",
  "timestamp": "2025-11-24T13:00:00.000Z",
  "detail": { }
}
```

## Códigos

| Código | Significado |
|---|---|
| `400` | parâmetro inválido ou ausente |
| `401` | token inválido, ausente ou expirado |
| `404` | recurso não encontrado |
| `422` | credencial chegou na autenticação e foi recusada |
| `500` | erro interno |
| `502` | falha de comunicação com o provedor Cactus |

> `422` é sinal de que o **formato** do payload está certo e só a senha/usuário
> falhou. É por isso que o login multi-marca trata `422` como "tente a próxima
> casa" e não como erro fatal — ver
> [integracoes/cactus-multimarca.md](../integracoes/cactus-multimarca.md).

## Casos comuns

**Token expirado**

```json
{ "message": "Erro recebido do provedor Cactus.",
  "detail": { "status": "Wrong auth validation", "reason": "wrong_token" } }
```
→ refazer login (o token dura 7 dias).

**Brand slug ausente**

```json
{ "message": "Brand slug é obrigatório" }
```
→ faltou `X-Brand-Slug` / `brand_slug`.

**Método de pagamento inativo**

```json
{ "message": "Erro recebido do provedor Cactus.",
  "detail": { "success": false, "message": "Payment method is not available or inactive" } }
```
→ configuração da conta na casa; não é bug do app.
