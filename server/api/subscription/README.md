# server/api/subscription/

| Rota | O que faz |
|---|---|
| `check.get` | `GET /api/subscription/check?email=` → `{ active, role, status }` |

Consulta `subscriptions` por e-mail em minúsculas. `active` é estritamente
`status === 'active'`; qualquer outro valor (inclusive assinatura inexistente)
devolve `role: 'free'`.

É a rota que decide se o app libera o conteúdo pago. Quem grava do outro lado é o
[webhook da Lastlink](../webhook/). O client cacheia a resposta por 5 minutos
([useSubscription](../../../app/composables/)), então mudança de status pode
levar até esse tempo para aparecer.
