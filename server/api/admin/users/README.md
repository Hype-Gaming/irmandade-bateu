# server/api/admin/users/

Ações sobre um usuário, a partir do painel. Exigem sessão de admin.

| Rota | O que faz |
|---|---|
| `block.post` | liga/desliga `blocked` em `app_users`; grava `blocked_at` |
| `status.post` | status de contato em `user_contact_status`, com `updated_by` |
| `tag.post` | tag de risco: `auto` (usa o cálculo), `none` (sem tag) ou override fixo |
| `export.get` | CSV dos usuários; o nome do arquivo vem de `APP_SLUG` ([shared/app.ts](../../../../shared/app.ts)) |

A listagem em si é `../users.get.ts`, um nível acima.

O bloqueio **não** derruba a sessão na hora: ele é aplicado no próximo heartbeat
de `/api/track/session`, que devolve `{ blocked: true }` e faz o app abrir o
`BlockedModal`.

`block.post` faz upsert — bloquear um e-mail que ainda não abriu o app cria o
registro com `created_via: 'admin-block'`.
