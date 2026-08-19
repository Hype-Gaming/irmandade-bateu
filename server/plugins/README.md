# server/plugins/

Código que roda no boot do Nitro — não são rotas.

| Plugin | O que faz |
|---|---|
| `notification-scheduler.ts` | dispara as notificações agendadas em `scheduled_notifications` |

## Como o agendador funciona

Um tick 5s após o boot (para recuperar agendamentos vencidos enquanto o servidor
estava fora) e depois a cada 60s:

1. Busca jobs `status: 'active'` com `nextRunAt <= now`.
2. **Claim atômico** — `findOneAndUpdate` move para `status: 'sending'` antes de
   enviar, então dois ticks não disparam a mesma notificação.
3. Envia por [../utils/pushDispatch.ts](../utils/).
4. `type: 'daily'` volta para `active` com `nextRunAt` na próxima ocorrência
   futura; os demais viram `done`.

Sem chaves VAPID configuradas, o tick sai cedo e nada é enviado.

## Duas armadilhas

- **O estado vive na memória do processo.** PM2 em modo cluster daria um
  `setInterval` por worker, e cada notificação sairia N vezes. Os ecosystems
  ficam em `instances: 1` / `exec_mode: 'fork'` por causa disso — não mude sem
  mover o agendador para fora do processo.
- **Hot-reload em dev** recriaria o intervalo a cada recarga; uma flag em
  `globalThis` evita isso.

Ver [docs/integracoes/web-push.md](../../docs/integracoes/web-push.md).
