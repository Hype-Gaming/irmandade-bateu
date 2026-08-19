# server/api/admin/subscriptions/

| Rota | O que faz |
|---|---|
| `approve.post` | libera acesso manualmente, gravando em `subscriptions` |

É a saída de emergência para quando o pagamento não chegou pelo
[webhook](../../webhook/): pagamento fora da Lastlink, cortesia, ou um payload
que o webhook não soube ler.

Registro criado por aqui fica **sem `lastlink_status`** — é justamente assim que
se distingue, no banco, quem entrou pelo webhook de quem foi liberado na mão.

> Uma leva de liberações manuais é sinal de que o webhook está falhando calado.
> Antes de aprovar em série, confira o log do webhook.
