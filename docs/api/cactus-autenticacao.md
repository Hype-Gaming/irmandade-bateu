# API Cactus — autenticação

Convenções de header em [cactus-visao-geral.md](cactus-visao-geral.md).

## POST `/api/auth/login`

Autentica na casa. **O campo `email` é o login único: aceita e-mail OU CPF**
(só dígitos). Mandar o CPF num campo `cpf` retorna `400`.

**Body**

| Campo | Obrig. | Nota |
|---|---|---|
| `email` | sim | e-mail **ou** CPF sem pontuação |
| `password` | sim | |
| `brand_slug` | sim | slug da casa |
| `base_domain` | não | domínio da casa |
| `app_source` | não | padrão `web` |
| `save_cookies` | não | padrão `true` |
| `cookie_key` | não | reaproveita uma sessão existente |

```bash
curl -X POST https://routes-eb.grupoautoma.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"SUA_SENHA","brand_slug":"bateu","base_domain":"bet.br"}'
```

**Resposta**

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 604800,
  "user": { "id": 28313810, "name": "...", "email": "...", "phone": "...", "is_active": 1, "country": "BRA", "currency": "BRL" },
  "cookie_key": 28313810,
  "brand_slug": "bateu",
  "base_domain": "bet.br",
  "need_change_password": false
}
```

Guarde `access_token` **e** `cookie_key`: depósito e iniciar jogo exigem os dois.

## POST `/api/auth/logout`

```bash
curl -X POST https://routes-eb.grupoautoma.com/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"cookie_key":"28313810"}'
```

→ `{ "success": true, "cookies_removed": true }`

## GET `/api/auth/user`

Perfil do usuário autenticado.

- **Header obrigatório:** `Authorization: Bearer <token>`
- **Opcionais:** `X-Cactus-Cookie-Key`, `X-Brand-Slug`, `X-Base-Domain`
- **Query `collection`:** grava/atualiza o usuário nessa collection do Mongo da
  Cactus (o app passa `userCollection` da marca — `users_eb` ou `users_bb`).

```bash
curl "https://routes-eb.grupoautoma.com/api/auth/user?collection=users_bb" \
  -H "Authorization: Bearer SEU_TOKEN" -H "X-Brand-Slug: bateu"
```

```json
{
  "id": 123, "name": "...", "email": "...", "phone": "...",
  "status": "ativo", "document": { "number": "..." }, "appInstall": true,
  "mongodb": { "saved": true, "action": "created", "collection": "users_bb" }
}
```

O bloco `mongodb` só aparece quando `collection` é passado.
