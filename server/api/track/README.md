# server/api/track/

Rotas **públicas** de telemetria. Alimentam o painel admin com quem usa o app e
quem depositou.

| Rota | O que faz |
|---|---|
| `session.post` | heartbeat de abertura: upsert em `app_users` com `last_seen_at`; devolve `{ blocked }` |
| `deposit.post` | insere em `deposits` um depósito gerado |

## Cuidados por serem públicas

- **Campo ausente não apaga dado gravado.** O `$set` é montado só com o que
  chegou preenchido — um POST vazio não pode zerar nome ou telefone de ninguém.
- **Strings são truncadas** (200 chars; telefone 30, slug 50).
- **`deposit` valida o valor**: número finito, positivo e abaixo de R$ 1.000.000.
- E-mail é obrigatório, precisa conter `@` e é normalizado para minúsculas.

O `blocked` devolvido pelo heartbeat é o que alimenta `useBlocked` e faz o
`BlockedModal` aparecer. O bloqueio é aplicado no **próximo** heartbeat, não na hora.

Quem chama: [plugins/track-session.client.ts](../../../app/plugins/) e o fluxo de
depósito de [useDeposit](../../../app/composables/).
