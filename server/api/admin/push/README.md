# server/api/admin/push/

Notificações a partir do painel. Exigem sessão de admin, como todo o
[../](../).

| Rota | O que faz |
|---|---|
| `send.post` | dispara agora para todas as inscrições |
| `stats.get` | quantos navegadores estão inscritos |
| `subscriptions.get` | dispositivos inscritos, enriquecidos com `app_users` — **sem** as chaves de criptografia |
| `scheduled.get` | agendamentos ativos + últimos finalizados/cancelados |
| `scheduled.post` | cria agendamento (`once` ou `daily`); recusa `once` no passado |
| `scheduled/[id].delete` | ativo vira `canceled`; já finalizado é apagado |

O envio em si é de [../../../utils/pushDispatch.ts](../../../utils/pushDispatch.ts),
que devolve `{ sent, failed, removed, total }` e remove em lote as inscrições
mortas (`404`/`410`).

Quem executa os agendamentos é o
[notification-scheduler](../../../plugins/), no processo Nitro — a rota só grava
em `scheduled_notifications`.

Ver [docs/integracoes/web-push.md](../../../../docs/integracoes/web-push.md).
