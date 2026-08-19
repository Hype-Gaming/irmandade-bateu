# Banco de dados (MongoDB)

Conexão em [server/utils/mongodb.ts](../server/utils/mongodb.ts): client
singleton, lazy. `MONGODB_URI` e `MONGODB_DB` ausentes **falham alto** de
propósito — sem fallback, para nunca gravar no banco errado.

Não há migrations nem schema: as collections nascem no primeiro `upsert`.
Toda chave de usuário é o **e-mail em minúsculas**.

## Collections

### `subscriptions` — quem pagou

Escrita pelo [webhook da Lastlink](integracoes/lastlink.md) e pela aprovação
manual do admin. É a fonte de verdade do acesso pago.

| Campo | Nota |
|---|---|
| `email` | chave (lowercase) |
| `status` | `active` \| `inactive` |
| `role` | `paid` \| `free` |
| `product` | nome do produto na Lastlink |
| `lastlink_status` | evento que gerou o estado atual |
| `lastlink_order_id` | `SubscriptionId`/`PurchaseId` |
| `name`, `phone` | só gravados quando vêm no payload |
| `created_at`, `updated_at` | |

> Registro **sem** `lastlink_status` foi liberado na mão, não pelo webhook.

### `app_users` — quem abriu o app

Escrita pelo heartbeat `POST /api/track/session` e pelas ações do admin.

| Campo | Nota |
|---|---|
| `email` | chave (lowercase) |
| `name`, `phone` | só sobrescritos quando chegam preenchidos |
| `brand_slug` | casa com que o usuário logou |
| `cactus_user_id` | id numérico na Cactus |
| `first_seen_at`, `last_seen_at` | |
| `blocked`, `blocked_at` | bloqueio aplicado no próximo heartbeat |
| `tag`, `tag_updated_at`, `tag_updated_by` | tag de risco (`auto`, `none` ou override) |
| `created_via` | `admin-block` quando o doc nasceu de um bloqueio |

Pagar e nunca abrir o app produz registro em `subscriptions` **sem** par em
`app_users` — o `$unionWith` de
[adminUserEnrichment.ts](../server/utils/adminUserEnrichment.ts) injeta esses
casos como usuários sintéticos para que o painel não os perca de vista.

### `deposits`

`POST /api/track/deposit` insere um documento por depósito gerado (teto de
R$ 1.000.000 por registro).

`email` · `cactus_user_id` · `brand_slug` · `amount` · `transaction_id` ·
`status` (`generated`) · `created_at`.

### `push_subscriptions`

Chaveada por `endpoint` (único por navegador/dispositivo).

`endpoint` · `keys.p256dh` · `keys.auth` · `email` · `created_at` · `updated_at`.

Inscrição que responde `404`/`410` é removida automaticamente no próximo disparo.

### `scheduled_notifications`

`title` · `body` · `url` · `icon` · `type` (`once` \| `daily`) · `time` ·
`nextRunAt` · `status` (`active` \| `sending` \| `done` \| `canceled`) ·
`createdAt` · `lastSentAt` · `lastResult`.

`sending` é o claim atômico do agendador — ver
[integracoes/web-push.md](integracoes/web-push.md).

### `user_contact_status`

Status de contato definido no painel: `email` · `status` · `updated_by` ·
`created_at` · `updated_at`.

## O que NÃO é deste banco

- `users_eb`, `users_bb` e afins pertencem à **Cactus** — ver
  [api/cactus-usuarios.md](api/cactus-usuarios.md).
- Collections como `rainha-da-bet`, `zkdados` e `irmandade-hyper` aparecem apenas
  em scripts de migração/inspeção de projetos anteriores ([scripts/](../scripts/)).
