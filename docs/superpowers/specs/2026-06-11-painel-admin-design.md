# Painel Admin — Irmandade Club

**Data:** 2026-06-11
**Status:** aprovado pelo usuário (conversa de 2026-06-11)

## Objetivo

Painel administrativo em `/admin` que mostre:
1. Usuários do app (quem logou pelo app)
2. Usuários ativos — abriram o app nas últimas 48 horas
3. Depósitos gerados pelo app (PIX gerado; pagamento não é confirmável)
4. Bloqueio de usuário — bloqueado vê pop-up direcionando ao suporte (Telegram)

## Contexto e restrição central

O app é um SPA Nuxt 4 (`ssr: false`). Hoje, login, perfil e depósito vão
direto do navegador para a API Cactus (`routes-eb.grupoautoma.com`) — o nosso
servidor Nitro não vê nada disso. Portanto:

- É preciso **instrumentar o client** para reportar eventos ao nosso servidor.
- Os dados passam a existir **a partir do deploy** (sem retroativo).
- Depósito registrado = **PIX gerado**, não pagamento confirmado (decisão do
  usuário: registrar apenas gerados, sem heurística de confirmação).

### O que já existe e será reaproveitado
- Autenticação admin: `server/utils/adminAuth.ts` (sessão HMAC em cookie,
  e-mails permitidos), página `/admin/login`, middleware `app/middleware/admin.ts`.
- Mongo: `server/utils/mongodb.ts` → banco `irmandade-hyper` (collection
  `subscriptions` já usada pelo webhook Lastlink).
- Padrão visual de página admin: `app/pages/admin/webhook.vue`.
- Multi-marca: `shared/brands.ts` (esportiva + bateu); a marca do usuário
  logado vive em `useAuth` (`brandSlug`).
- A API de login/perfil da Cactus **retorna `phone`** (confirmado em `api.md`
  e na interface `User` de `useAuth.ts`) — o telefone será capturado.

## Arquitetura escolhida

**Client reporta eventos ao nosso Nitro server, que grava no nosso Mongo.**

Alternativas rejeitadas:
- *Proxy total das chamadas Cactus*: refatoração grande, latência, ponto único
  de falha — desproporcional ao objetivo.
- *Ler coleções espelho do Cactus (`users_eb`/`users_bb`)*: não cobre
  atividade em 48h nem depósitos; mistura usuários de outros apps da marca.

## 1. Modelo de dados (Mongo `irmandade-hyper`)

### Collection `app_users` (nova)
| Campo | Tipo | Observação |
|---|---|---|
| `email` | string | minúsculo; chave lógica do upsert |
| `name` | string | da API Cactus |
| `phone` | string | da API Cactus |
| `cactus_user_id` | number | `user.id` da Cactus |
| `brand_slug` | string | última marca usada (`esportiva` / `bateu`) |
| `blocked` | boolean | default `false` |
| `blocked_at` | Date \| null | setado ao bloquear |
| `first_seen_at` | Date | `$setOnInsert` |
| `last_seen_at` | Date | atualizado a cada heartbeat |

### Collection `deposits` (nova)
| Campo | Tipo | Observação |
|---|---|---|
| `email` | string | minúsculo |
| `cactus_user_id` | number | |
| `brand_slug` | string | |
| `amount` | number | em reais (o que o usuário digitou) |
| `transaction_id` | string | da resposta da Cactus |
| `status` | string | sempre `'generated'` nesta versão |
| `created_at` | Date | |

Sem criação explícita de índices nesta versão (volume baixo; upsert por
`{ email }`). Otimização futura: índice único em `app_users.email` e índice
`deposits.created_at`.

## 2. Endpoints de rastreamento (públicos, chamados pelo app)

Mesmo nível de confiança do `/api/subscription/check` existente: recebem
dados do client sem autenticação forte. Aceitável para este app; não são
fonte de verdade financeira.

### `POST /api/track/session`
Body: `{ email, name, phone, userId, brandSlug }`
- Upsert em `app_users` por `email` (minúsculo): atualiza `name`, `phone`,
  `cactus_user_id`, `brand_slug`, `last_seen_at`; `first_seen_at` no insert.
- **Resposta: `{ blocked: boolean }`** — o heartbeat dobra como checagem de
  bloqueio (uma chamada só).
- Body sem `email` válido → 400.

### `POST /api/track/deposit`
Body: `{ email, userId, brandSlug, amount, transactionId }`
- Insert em `deposits` com `status: 'generated'` e `created_at: now`.
- Resposta: `{ success: true }`. Falha de validação → 400.

## 3. Instrumentação no client

### Heartbeat (2 pontos)
1. **Após login com sucesso** — dentro de `useAuth.login()`, depois de fixar a
   sessão: chama `/api/track/session`. Se `blocked: true` → `clearAuth()`,
   ativa o estado de bloqueio (modal) e retorna `{ success: false, blocked: true }`
   (a página de login não navega e, quando `blocked` vier `true`, **não exibe
   mensagem de erro** — o modal de bloqueio é a única comunicação).
2. **Ao abrir o app já logado** — novo plugin `app/plugins/track-session.client.ts`:
   no boot, se `isAuthenticated`, envia o heartbeat **uma vez por carga de
   página** (flag de módulo; sem repetição em navegação SPA). Se
   `blocked: true` → `clearAuth()` + ativa modal de bloqueio.

Falha de rede no heartbeat **não** bloqueia o uso do app (fail-open): erro é
só logado no console.

### Depósito (1 ponto)
Em `useDeposit.createDeposit()`, no caminho de sucesso (PIX gerado): chama
`/api/track/deposit` com `fire-and-forget` (erro não afeta o fluxo do
usuário).

## 4. Fluxo de bloqueio

- Estado global `useBlocked()` (novo composable, `useState` simples):
  `{ isBlocked: boolean }`.
- **`BlockedModal.vue`** (novo, mesmo padrão visual do `KycModal.vue`):
  título "Acesso bloqueado", texto explicando que o acesso ao app foi
  suspenso, botão **"Falar com suporte"** abrindo o WhatsApp, e botão
  secundário "Sair" (clearAuth + vai para `/auth/login`).
- Link do suporte: constante `SUPPORT_WHATSAPP_URL` em `shared/support.ts`,
  valor inicial **placeholder** `https://wa.me/5500000000000` — o usuário
  fornecerá o número definitivo (única linha a trocar).
- O modal é renderizado no `app.vue` (ou layout default — onde o `KycModal`
  já é montado; seguir o mesmo local), visível quando `isBlocked`.
- Comportamento decidido: bloqueio **barra login e derruba sessão na próxima
  abertura/heartbeat**, sempre com o pop-up de suporte (não é silencioso).

## 5. API do admin (protegida pela sessão admin existente)

Todos validam `getAdminSession(event)`; sem sessão → 401 (padrão do
`subscriptions/approve.post.ts`).

### `GET /api/admin/stats`
Resposta: `{ totalUsers, active48h, depositsCount, depositsSum }`
- `active48h`: `app_users` com `last_seen_at >= now - 48h`.
- `depositsSum`: soma de `amount` (todos os registros).

### `GET /api/admin/users?search=&skip=0&limit=50`
- `search`: regex case-insensitive em `email`, `name`, `phone`.
- Ordenação: `last_seen_at` desc.
- Resposta: `{ users: [...], total }` (todos os campos de `app_users`).

### `POST /api/admin/users/block`
Body: `{ email, blocked: boolean }` → atualiza `blocked` (+ `blocked_at`).
Resposta: `{ success: true, email, blocked }`. E-mail inexistente → 404.

### `GET /api/admin/deposits?skip=0&limit=50`
- Ordenação: `created_at` desc. Resposta: `{ deposits: [...], total }`.

## 6. UI — dashboard único em `/admin`

Nova página `app/pages/admin/index.vue`, `definePageMeta({ middleware: 'admin' })`,
mesmo estilo da `webhook.vue` (dark, cards, mesma paleta `#00ccff`):

1. **Header**: título "Painel de Admin", e-mail do admin, links: Webhook
   (`/admin/webhook`), Home, Sair.
2. **Cards de métricas** (de `/api/admin/stats`): Usuários, Ativos 48h,
   Depósitos gerados, Valor total (R$, `Intl.NumberFormat pt-BR`).
3. **Tabela de usuários**: busca (debounce ~300ms), colunas: nome, e-mail,
   telefone, marca, último acesso (relativo: "há 2h"), status (badge
   Ativo/Bloqueado), ação Bloquear/Desbloquear com `confirm()` nativo.
   Paginação "carregar mais" (skip/limit).
4. **Tabela de depósitos**: data, e-mail, marca, valor, transaction_id.
   Paginação "carregar mais".

Na `webhook.vue`: adicionar link de volta para `/admin` no header.

## 7. Fora de escopo (explícito)

- Confirmação de pagamento de PIX.
- Histórico anterior ao deploy.
- Bloqueio server-side das chamadas à Cactus (o bloqueio é aplicado pelo
  client via heartbeat — mesmo nível de proteção do check de assinatura).
- Gestão de admins (continua por env var `ADMIN_ALLOWED_EMAILS`).
- Exportação de dados (CSV etc.).

## 8. Verificação

1. `npm run build` (PowerShell — o Bash desta máquina mascara `node_modules`).
2. Dev server: logar com conta real → conferir `app_users` ganhou o registro
   (via tela do admin) e `last_seen_at` atualiza ao recarregar o app.
3. Gerar um PIX de teste (valor mínimo) → aparece na tabela de depósitos.
4. Bloquear o próprio usuário no painel → recarregar o app → pop-up de
   bloqueio aparece e sessão cai; desbloquear → volta ao normal.
5. Endpoints admin sem cookie de sessão → 401.
