# API interna (Nitro)

Rotas servidas por este app, implementadas em [server/api/](../../server/api/).
Toda rota `/admin/**` (exceto `login`) exige o cookie de sessão de admin —
ver [server/utils/adminAuth.ts](../../server/utils/adminAuth.ts).

## Público (sem autenticação)

| Rota | Método | O que faz |
|---|---|---|
| `/api/subscription/check?email=` | GET | Consulta `subscriptions`. Devolve `{ active, role, status }`. Cacheado 5 min no client por [useSubscription.ts](../../app/composables/useSubscription.ts). |
| `/api/track/session` | POST | Heartbeat de abertura do app: grava `last_seen_at` em `app_users` e devolve `{ blocked }`. Campos vazios **não** sobrescrevem dados existentes. |
| `/api/track/deposit` | POST | Registra um depósito confirmado em `deposits`. |
| `/api/casino-results` | GET | Proxy do catalogador (`casino-data.grupoautoma.com`), que responde 403 a domínios fora da allowlist. Repassa os params (`collection`, `game`, `limit`, `_t`) e injeta o `Referer` autorizado (`CATALOGADOR_REFERER`). |
| `/api/push/vapid-public-key` | GET | Chave pública VAPID para o browser se inscrever. |
| `/api/push/subscribe` | POST | Salva a inscrição em `push_subscriptions`. |
| `/api/push/unsubscribe` | POST | Remove a inscrição. |
| `/api/webhook/lastlink` | POST | Webhook de compra. Autenticado por token (`?token=` ou `X-Lastlink-Token`) — ver [integracoes/lastlink.md](../integracoes/lastlink.md). |

## Admin — sessão

| Rota | Método | O que faz |
|---|---|---|
| `/api/admin/login` | POST | E-mail (em `ADMIN_ALLOWED_EMAILS`) + `ADMIN_PASSWORD`. Cria cookie HMAC de 8h. |
| `/api/admin/logout` | POST | Limpa o cookie. |
| `/api/admin/me` | GET | 200 se a sessão vale, 401 se não. É o que o middleware [admin.ts](../../app/middleware/admin.ts) consulta. |

## Admin — usuários e métricas

| Rota | Método | O que faz |
|---|---|---|
| `/api/admin/stats` | GET | Números do painel. Usa o `$unionWith` de [adminUserEnrichment.ts](../../server/utils/adminUserEnrichment.ts) para contar assinantes que pagaram mas nunca abriram o app. |
| `/api/admin/activity` | GET | Série temporal para o [ActivityChart.vue](../../app/components/admin/). |
| `/api/admin/users` | GET | Lista paginada/filtrada, cruzando `app_users` + `subscriptions`. |
| `/api/admin/users/export` | GET | CSV dos usuários (nome do arquivo vem de `APP_SLUG`, em [shared/app.ts](../../shared/app.ts)). |
| `/api/admin/users/block` | POST | Liga/desliga o bloqueio lido pelo heartbeat. |
| `/api/admin/users/status` | POST | Atualiza o status de contato em `user_contact_status`. |
| `/api/admin/users/tag` | POST | Tag de risco: `auto` (usa o cálculo), `none` ou override fixo. |
| `/api/admin/deposits` | GET | Lista `deposits`. |
| `/api/admin/ftd` | POST | Registra manualmente um FTD (primeiro depósito). |
| `/api/admin/subscriptions/approve` | POST | Libera acesso na mão, sem passar pelo webhook. |

## Admin — push

| Rota | Método | O que faz |
|---|---|---|
| `/api/admin/push/send` | POST | Dispara para todas as inscrições via [pushDispatch.ts](../../server/utils/pushDispatch.ts). |
| `/api/admin/push/stats` | GET | Quantos navegadores estão inscritos. |
| `/api/admin/push/subscriptions` | GET | Dispositivos inscritos, enriquecidos com `app_users`. Não expõe as chaves de criptografia. |
| `/api/admin/push/scheduled` | GET | Agendamentos ativos + últimos finalizados/cancelados. |
| `/api/admin/push/scheduled` | POST | Cria um agendamento. |
| `/api/admin/push/scheduled/:id` | DELETE | Ativo vira `canceled`; já finalizado é apagado. |

Os agendamentos são executados pelo plugin
[notification-scheduler.ts](../../server/plugins/notification-scheduler.ts),
que roda a cada 60s **dentro do processo Nitro** — por isso o PM2 precisa ficar
em `instances: 1` / `exec_mode: 'fork'`.

## API externa

O app também fala direto com a Cactus a partir do browser — ver
[README.md](README.md) desta pasta.
