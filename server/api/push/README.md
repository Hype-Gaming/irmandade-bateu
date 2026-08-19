# server/api/push/

Rotas **públicas** de inscrição em Web Push, chamadas por
[usePush](../../../app/composables/).

| Rota | O que faz |
|---|---|
| `vapid-public-key.get` | devolve a chave pública VAPID para o `pushManager.subscribe()` |
| `subscribe.post` | grava a inscrição em `push_subscriptions`, chaveada por `endpoint` |
| `unsubscribe.post` | remove a inscrição quando o usuário desliga as notificações |

`subscribe` exige `endpoint`, `keys.p256dh` e `keys.auth`; sem isso, `400`.
O `email` é opcional — sem ele a inscrição existe, mas não dá para cruzar com o
usuário no painel.

Só a chave **pública** sai daqui. A privada nunca deixa o servidor.

O envio fica em [../admin/push/](../admin/push/) (exige sessão) e no agendador
([../../plugins/](../../plugins/)).
