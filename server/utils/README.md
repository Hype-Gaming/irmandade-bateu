# server/utils/

Auto-importados pelas rotas do Nitro (sem `import` explícito).

| Arquivo | O que oferece |
|---|---|
| `mongodb.ts` | `getDb()` — client singleton, conexão lazy |
| `adminAuth.ts` | cookie de sessão do painel: emissão, validação, `COOKIE_NAME`, `MAX_AGE` |
| `adminUserEnrichment.ts` | `buildSubsOnlyUnion()` — pipeline compartilhado entre a lista e as métricas |
| `webpush.ts` | `sendToSubscription()`, `isPushConfigured()`, `getVapidPublicKey()` |
| `pushDispatch.ts` | `dispatchToAllSubscriptions()` — envio em massa com limpeza de inscrições mortas |

## `mongodb.ts`

Client e `Db` em módulo, reaproveitados entre requisições. `MONGODB_URI` ou
`MONGODB_DB` ausentes **lançam** — sem fallback, para nunca gravar no banco
errado por engano.

## `adminAuth.ts`

Cookie assinado por HMAC (`ADMIN_SESSION_SECRET`), 8h de validade, comparação em
tempo constante (`timingSafeEqual`). Em produção sem `ADMIN_SESSION_SECRET` ou
`ADMIN_PASSWORD` configurados, o módulo emite aviso e cai em defaults públicos.

## `adminUserEnrichment.ts`

`$unionWith` que injeta, como usuários sintéticos, os assinantes ativos **sem**
registro em `app_users` — quem pagou e nunca abriu o app. Fica aqui, e não dentro
de uma rota, porque `/api/admin/users` e `/api/admin/stats` **precisam** usar o
mesmo pipeline: se divergirem, o total do painel não bate com a lista.

## `webpush.ts` / `pushDispatch.ts`

`sendToSubscription()` nunca lança: devolve `{ ok, gone, statusCode }`, e `gone`
(`404`/`410`) significa inscrição morta. `dispatchToAllSubscriptions()` usa isso
para remover as mortas em lote e devolve `{ sent, failed, removed, total }`.
Reaproveitado pelo envio manual do painel e pelo agendador.
