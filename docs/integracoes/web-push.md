# Web Push (notificações)

Push nativo do browser via VAPID, sem serviço terceiro. Cobre envio manual pelo
painel admin e agendamentos (únicos ou diários).

## Peças

| Camada | Arquivo |
|---|---|
| Service worker | [public/sw.js](../../public/sw.js) |
| Registro do SW | [app/plugins/service-worker.client.ts](../../app/plugins/service-worker.client.ts) |
| Permissão + inscrição | [app/composables/usePush.ts](../../app/composables/usePush.ts) |
| Envio unitário | [server/utils/webpush.ts](../../server/utils/webpush.ts) |
| Envio em massa | [server/utils/pushDispatch.ts](../../server/utils/pushDispatch.ts) |
| Agendador | [server/plugins/notification-scheduler.ts](../../server/plugins/notification-scheduler.ts) |
| Painel | [app/pages/admin/push.vue](../../app/pages/admin/) |

## Configuração

```dotenv
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@app.clubdabb2.online
```

Gerar o par: `npx web-push generate-vapid-keys`.

Sem as chaves, `isPushConfigured()` devolve `false`: o push é **desabilitado
silenciosamente** (log de warn) e o agendador não dispara nada. Não quebra o app.

A configuração do `web-push` é lazy e feita uma única vez.

## Fluxo de inscrição

1. O plugin registra `/sw.js` depois do `load` da página.
2. `usePush` pede permissão, busca a chave em `/api/push/vapid-public-key`,
   converte de base64url para `Uint8Array` e chama `pushManager.subscribe()`.
3. A inscrição (`endpoint` + `keys.p256dh` + `keys.auth`) vai para
   `POST /api/push/subscribe` e é gravada em `push_subscriptions`.

## Envio

`dispatchToAllSubscriptions()` percorre todas as inscrições e devolve
`{ sent, failed, removed, total }`. `sendToSubscription()` **nunca lança**:
`404`/`410` marcam a inscrição como morta (`gone`) e ela é removida em lote.
É assim que a base se limpa sozinha de navegadores desinstalados.

## Agendamentos

O plugin do Nitro roda um tick 5s após o boot e depois a cada 60s:

- Busca em `scheduled_notifications` os jobs `status: 'active'` com
  `nextRunAt <= now`.
- **Claim atômico** via `findOneAndUpdate` para `status: 'sending'` — dois ticks
  simultâneos não disparam a mesma notificação.
- `type: 'daily'` volta para `active` com `nextRunAt` no próximo horário futuro;
  os demais viram `done`.
- O primeiro tick após o boot recupera agendamentos vencidos enquanto o servidor
  estava fora.

> **O agendador vive em memória do processo Nitro.** Por isso o PM2 fica em
> `instances: 1` / `exec_mode: 'fork'` — ver [../operacao/deploy-vps.md](../operacao/deploy-vps.md).
> Com cluster, cada worker teria seu próprio intervalo. Em dev, uma flag em
> `globalThis` evita intervalos duplicados no hot-reload.
