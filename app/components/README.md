# app/components/

Componentes Vue, auto-importados pelo Nuxt (sem `import` manual). Componentes em
subpasta ganham prefixo: `admin/ActivityChart.vue` → `<AdminActivityChart />`.

| Componente | Papel |
|---|---|
| `BlockedModal.vue` | bloqueio aplicado pelo heartbeat; oferece o suporte de [shared/support.ts](../../shared/support.ts) |
| `SubscriptionModal.vue` | sem assinatura ativa; leva para `/assinar` |
| `DepositModal.vue` | depósito PIX (QR + copia e cola) via [useDeposit](../composables/) |
| `KycModal.vue` | pendência de verificação na casa |
| `PageLoader.vue` | carregamento entre rotas |
| `UpdateNotification.vue` | avisa que há versão nova (compara `public/version.json`, escrito no build) |
| [`admin/`](admin/) | componentes exclusivos do painel |

## Padrão dos modais

Acesso negado nunca vira rota morta: bloqueio, assinatura e KYC são modais sobre
a tela atual. Quem decide exibir são os composables (`useBlocked`,
`useSubscription`), não o roteador — assim o usuário volta ao fluxo assim que a
condição é resolvida.

`UpdateNotification.vue` depende de `navigator.serviceWorker.ready`. Se o
service worker não for registrado, ele **fica travado esperando** — foi
exatamente o que acontecia quando o registro ainda vivia no `app.html`. Hoje o
registro está em [plugins/service-worker.client.ts](../plugins/).
