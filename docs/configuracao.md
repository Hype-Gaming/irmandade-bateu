# Configuração

Toda configuração de deploy vem do `.env` (não versionado). O mesmo código roda
como Irmandade ou como Bateu/Clube da BB — o que muda é o env.

## Variáveis

### Servidor

| Variável | Obrigatória | Padrão | Nota |
|---|---|---|---|
| `NODE_ENV` | prod | — | `production` na VPS |
| `PORT` | não | `3110` | os ecosystems do PM2 **forçam** a porta depois de ler o `.env` |
| `NUXT_PUBLIC_APP_BRAND` | sim | `esportiva` | slug da casa padrão, de [shared/brands.ts](../shared/brands.ts) |

### MongoDB

| Variável | Obrigatória | Nota |
|---|---|---|
| `MONGODB_URI` | **sim** | sem ela o app lança erro na primeira query |
| `MONGODB_DB` | **sim** | sem fallback, de propósito |

### Admin

| Variável | Obrigatória | Nota |
|---|---|---|
| `ADMIN_ALLOWED_EMAILS` | sim | lista de e-mails que podem entrar em `/admin` |
| `ADMIN_PASSWORD` | sim | senha única do painel |
| `ADMIN_SESSION_SECRET` | sim em prod | assina o cookie HMAC de 8h |

> `ADMIN_SESSION_SECRET` e `ADMIN_PASSWORD` têm default no código só para dev.
> Em produção sem eles, [adminAuth.ts](../server/utils/adminAuth.ts) emite um
> aviso — e a sessão fica assinada com segredo público. Configure ambos.

### Web Push

| Variável | Obrigatória | Nota |
|---|---|---|
| `VAPID_PUBLIC_KEY` | para push | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | para push | |
| `VAPID_SUBJECT` | não | default `mailto:admin@app.clubdabb2.online` |

Ausentes: o push é desabilitado silenciosamente e o agendador não dispara.

### Lastlink

| Variável | Obrigatória | Nota |
|---|---|---|
| `LASTLINK_WEBHOOK_SECRET` | sim | token do produto principal |
| `LASTLINK_WEBHOOK_SECRET_SEM_GALE` | se houver 2º produto | |

Sem nenhum dos dois, todo webhook responde `401`.

### Catalogador

| Variável | Obrigatória | Nota |
|---|---|---|
| `CATALOGADOR_REFERER` | não | default `https://app.irmandadebacbo.com`; domínio já aceito na allowlist do grupoautoma |

## `.env` de exemplo

```dotenv
PORT=3110
NODE_ENV=production
NUXT_PUBLIC_APP_BRAND=bateu

MONGODB_URI=mongodb://usuario:senha@host:27017
MONGODB_DB=clube-da-bb

ADMIN_ALLOWED_EMAILS=admin@example.com
ADMIN_PASSWORD=troque-esta-senha
ADMIN_SESSION_SECRET=troque-este-segredo

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@app.clubdabb2.online

LASTLINK_WEBHOOK_SECRET=
LASTLINK_WEBHOOK_SECRET_SEM_GALE=
```

## `runtimeConfig`

[nuxt.config.ts](../nuxt.config.ts) expõe só o necessário:

```ts
runtimeConfig: {
  mongodbUri: process.env.MONGODB_URI,   // server-only
  mongodbDb: process.env.MONGODB_DB,     // server-only
  public: { appBrand: process.env.NUXT_PUBLIC_APP_BRAND }
}
```

Nada de segredo em `public` — o que vai ali chega no browser. Os demais segredos
são lidos direto de `process.env` nos handlers do servidor.

## PM2

Os dois ecosystems leem o `.env` do diretório e injetam **todas** as chaves no
processo — nada precisa ser duplicado neles. `PORT` é definido **depois** da
leitura, para sobrepor o valor de dev.

| Arquivo | App | Porta |
|---|---|---|
| [ecosystem.config.cjs](../ecosystem.config.cjs) | `irmandade` | 3099 |
| [ecosystem.bateu.config.cjs](../ecosystem.bateu.config.cjs) | `bateu` | 3110 |

Ambos ficam em `instances: 1` / `exec_mode: 'fork'` — o agendador de push roda
dentro do processo e em cluster duplicaria os envios.

## Constantes que não são env

Coisas que mudam por código, não por variável de ambiente:

| O quê | Onde |
|---|---|
| Nome e slug do app | [shared/app.ts](../shared/app.ts) |
| Casas de aposta | [shared/brands.ts](../shared/brands.ts) |
| Links de suporte/comunidade | [shared/support.ts](../shared/support.ts) |
| Base dos vídeos das aulas | [shared/videos.ts](../shared/videos.ts) |
| Conteúdo do minicurso | [app/constants/aulas.ts](../app/constants/aulas.ts) |
| Catálogo de jogos e sinais | [app/constants/gameRoutes.ts](../app/constants/gameRoutes.ts) |

`public/manifest.json` é estático e **não** lê o `shared/app.ts` — trocar o nome
do app exige editá-lo à mão.
