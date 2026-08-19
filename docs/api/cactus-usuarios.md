# API Cactus — usuários

Convenções de header em [cactus-visao-geral.md](cactus-visao-geral.md).

## POST `/api/register`

Cria a conta na casa de apostas.

| Campo | Obrig. | Nota |
|---|---|---|
| `email` | sim | |
| `password` | sim | |
| `number` | sim | CPF |
| `phone` | sim | com DDD |
| `affiliation_code` | sim | código de afiliado |
| `src` | sim | source da campanha |
| `utm_source` | sim | |
| `brand_slug` / `base_domain` | não | também aceitos por header |

Preenchidos automaticamente pela API: `country: "BRA"`, `ddi: "+55"`,
`nationalities` e `optIn: true`.

```bash
curl -X POST https://routes-eb.grupoautoma.com/api/register \
  -H "Content-Type: application/json" -H "X-Brand-Slug: bateu" \
  -d '{"number":"12345678900","phone":"11999999999","email":"usuario@example.com",
       "password":"SUA_SENHA","affiliation_code":"CODIGO","src":"SRC","utm_source":"000000"}'
```

Resposta traz `access_token` e o `user` já criado — não precisa de login extra.

> Hoje o app **não** usa esta rota: o cadastro acontece no site da casa, pelo
> `affiliateUrl` da marca ([shared/brands.ts](../../shared/brands.ts)).

## GET `/api/users/:collection`

Lista o cache de usuários que a Cactus mantém no Mongo dela.

Query: `limit` (50), `skip` (0), `sort` (JSON, padrão `{"createdAt":-1}`).

```bash
curl "https://routes-eb.grupoautoma.com/api/users/users_bb?limit=10&skip=0"
```

```json
{
  "success": true,
  "users": [{ "_id": "...", "id": 123, "email": "...", "userIdentifier": "...", "collection_name": "users_bb" }],
  "pagination": { "total": 1, "limit": 10, "skip": 0, "hasMore": false }
}
```

## GET `/api/users/:collection/:identifier`

Busca um usuário por `_id`, e-mail ou `userIdentifier`. Devolve o documento cru.

> Este cache é da Cactus e **não** é o banco deste app —
> ver [banco-de-dados.md](../banco-de-dados.md).
