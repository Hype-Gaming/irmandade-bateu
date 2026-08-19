# app/middleware/

Guardas de rota. Sufixo `.global` roda em **toda** navegação; sem sufixo, só onde
a página declarar `definePageMeta({ middleware: '...' })`.

| Arquivo | Escopo | O que faz |
|---|---|---|
| `auth.global.ts` | todas as rotas | exige login fora das rotas públicas |
| `admin.ts` | páginas de `/admin` | valida a sessão chamando `/api/admin/me` |
| `auth.ts` | — | versão antiga, não-global, sem a exceção de `/admin`; **não está em uso** |

## Duas autenticações diferentes

Usuário do app e administrador não se misturam:

- **Usuário** → token da Cactus no localStorage, checado por `auth.global.ts`.
- **Admin** → cookie HMAC de 8h emitido pelo servidor
  ([server/utils/adminAuth.ts](../../server/utils/adminAuth.ts)), checado por
  `admin.ts` e reforçado pelo `401` de cada rota `/api/admin/*`.

Por isso `auth.global.ts` sai cedo quando a rota começa com `/admin`: quem manda
ali é o `admin.ts`. A guarda do client é conveniência de navegação — a de
verdade é o `401` do servidor.

Rotas públicas: `/`, `/aulas`, `/auth/login`, `/auth/register`,
`/auth/forgot-password`. Usuário logado que tenta `/auth/login` é redirecionado
para `/`.
