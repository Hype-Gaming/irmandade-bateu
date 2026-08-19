# app/plugins/

Rodam no boot do app. Sufixo `.client` = só no browser (o que, num app
`ssr: false`, é a regra).

| Plugin | O que faz |
|---|---|
| `maska.ts` | registra a diretiva `v-maska` (máscaras de CPF/telefone) |
| `service-worker.client.ts` | registra `/sw.js` depois do `load` da página |
| `track-session.client.ts` | heartbeat de abertura: `POST /api/track/session` |

## Por que o registro do service worker é um plugin

Antes ele era um `<script>` dentro de um `app.html` na raiz — arquivo que o
**Nuxt 4 não lê**. O `register()` nunca rodava, e com isso: sem cache offline,
sem push, e o `UpdateNotification.vue` preso esperando um
`navigator.serviceWorker.ready` que nunca resolvia. O registro acontece depois do
`load` para não competir com os recursos da primeira tela.

## O heartbeat

Envia e-mail, nome, telefone e marca do usuário logado; grava `last_seen_at` em
`app_users` e recebe de volta `{ blocked }`, que alimenta `useBlocked`. É
**fail-open**: falha de rede não impede o uso do app.
