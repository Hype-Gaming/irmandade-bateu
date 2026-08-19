# app/pages/jogo/

| Rota | Arquivo |
|---|---|
| `/jogo/:id` | `[id].vue` |

A tela mais densa do app: resolve o `id` no catálogo
([constants/gameRoutes.ts](../../constants/)), pede a URL do jogo à Cactus via
[useGame](../../composables/), carrega o iframe e exibe o histórico do
catalogador ao lado.

Duas coisas a saber antes de mexer:

- **O histórico vem do proxy `/api/casino-results`**, não direto do catalogador.
  O `casino-data.grupoautoma.com` responde `403` a domínios fora da allowlist
  dele; o servidor repassa a chamada com o `Referer` autorizado.
- **Assinatura é exigida aqui.** Sem assinatura ativa, o `SubscriptionModal`
  cobre a tela em vez de redirecionar — o usuário volta ao jogo assim que pagar.

Jogo cuja configuração de sinal não existe é degradado sem quebrar a página.
