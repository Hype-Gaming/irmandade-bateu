# server/api/admin/

Rotas do painel. **Todas** exigem o cookie de sessão de
[../../utils/adminAuth.ts](../../utils/adminAuth.ts) — exceto `login.post.ts`,
que é quem o emite. A validação acontece dentro de cada handler: o middleware do
client é só conveniência de navegação.

| Grupo | Rotas |
|---|---|
| Sessão | `login.post`, `logout.post`, `me.get` |
| Métricas | `stats.get`, `activity.get` |
| Usuários | `users.get`, `users/block.post`, `users/status.post`, `users/tag.post`, `users/export.get` |
| Financeiro | `deposits.get`, `ftd.post`, `subscriptions/approve.post` |
| Push | [`push/`](push/) |

## Sessão

E-mail precisa estar em `ADMIN_ALLOWED_EMAILS` e a senha bater com
`ADMIN_PASSWORD`. O cookie é assinado por HMAC com `ADMIN_SESSION_SECRET` e vale
8 horas. Em produção sem esses segredos configurados, o módulo emite um aviso e
usa defaults públicos — configure-os.

## Usuários "sintéticos"

Quem paga mas nunca abre o app existe em `subscriptions` e **não** em
`app_users`. `users.get` e `stats.get` compartilham o `$unionWith` de
[../../utils/adminUserEnrichment.ts](../../utils/adminUserEnrichment.ts) para
incluir esses casos — as duas rotas precisam usar o mesmo pipeline, ou os números
do painel divergem da lista.

Tags de risco: `auto` usa o risco calculado, `none` remove, qualquer outro valor
é override fixo.
