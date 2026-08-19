# Arquitetura

## Em uma frase

SPA Nuxt 4 (`ssr: false`) que é ao mesmo tempo **vitrine de conteúdo** (minicurso,
gestão de banca) e **casca de casa de apostas**: o usuário loga com a conta da casa,
deposita e abre jogos sem sair do app — desde que tenha assinatura ativa.

## Camadas

```
Browser (SPA + PWA + Service Worker)
  ├── fala DIRETO com a API Cactus  ......  login, perfil, depósito, iniciar jogo
  └── fala com o Nitro deste app  ........  assinatura, tracking, push, admin, proxy
        └── MongoDB  ....................  subscriptions, app_users, deposits, push
Nginx (80/443) → Nitro (127.0.0.1:3110, PM2)
```

Duas decisões explicam quase tudo:

1. **A Cactus é chamada do browser, não por proxy.** O servidor não guarda token
   de usuário nem intermedeia jogo/depósito. A exceção é `/api/casino-results`:
   o catalogador bloqueia domínios fora da allowlist dele, então ali o servidor
   precisa entrar como intermediário.
2. **Pagamento e conta da casa são independentes.** A casa autentica; a Lastlink
   diz quem pagou. O cruzamento é feito pelo **e-mail**, e é por isso que ele é a
   chave de tudo no banco.

## Fluxo do usuário

```
/auth/login → useAuth tenta cada marca de shared/brands.ts (e-mail OU CPF)
            → a casa que autenticar vira a marca da sessão
            → plugin track-session grava last_seen_at e devolve `blocked`
            → useSubscription consulta /api/subscription/check (cache 5 min)
                ├── sem assinatura → SubscriptionModal → /assinar (Lastlink)
                └── com assinatura → /jogo/[id] abre o jogo via Cactus
```

Bloqueio, assinatura e KYC são **modais**, não rotas: o usuário nunca fica preso
numa tela morta.

## Do pagamento ao acesso

```
Lastlink (compra aprovada)
  → POST /api/webhook/lastlink?token=...
  → upsert em `subscriptions` (status/role por e-mail)
  → próxima chamada de /api/subscription/check libera o app
```

Ver [integracoes/lastlink.md](integracoes/lastlink.md).

## Multi-marca e multi-deploy

O mesmo código roda como apps diferentes:

- `NUXT_PUBLIC_APP_BRAND` escolhe a casa padrão exibida antes do login.
- Cada deploy tem seu banco (`MONGODB_DB`) e seu ecosystem/porta no PM2.
- `shared/` centraliza o que muda entre marcas — nome do app, casas, links,
  base dos vídeos.

Ver [integracoes/cactus-multimarca.md](integracoes/cactus-multimarca.md).

## Estado no client

Não há Pinia nem Vuex. Estado global = composables com `useState` do Nuxt:

| Composable | Guarda |
|---|---|
| `useAuth` | token, usuário, `cookie_key` e a marca da sessão (persistidos no localStorage) |
| `useSubscription` | assinatura, com cache de 5 min em sessionStorage |
| `useBlocked` | flag de bloqueio vinda do heartbeat |

As chaves de storage ainda usam o prefixo `irmandade_`. **Isso é proposital**:
renomeá-las invalidaria o cache de quem já usa o app, jogando todo mundo de volta
no modal de assinatura.

## Onde o servidor é indispensável

Só existe rota de servidor onde o browser não daria conta:

| Necessidade | Por quê |
|---|---|
| `/api/subscription/check` | o browser não pode ler o Mongo |
| `/api/webhook/lastlink` | a Lastlink precisa de um endpoint público |
| `/api/push/*` e agendador | VAPID privada e o `setInterval` do agendador |
| `/api/admin/*` | painel autenticado por cookie HMAC |
| `/api/casino-results` | contornar o 403 por allowlist do catalogador |

## PWA

`public/manifest.json` + `public/sw.js`, registrado pelo plugin
[service-worker.client.ts](../app/plugins/service-worker.client.ts). O
[UpdateNotification.vue](../app/components/) avisa quando há versão nova —
`update-version.js` grava `public/version.json` a cada build.

## Convenções

- `shared/` para o que client e server compartilham (Nuxt 4 importa nos dois).
- `app/constants/` para conteúdo editável (aulas, jogos) — trocar conteúdo não
  deve exigir mexer em `.vue`.
- Server: nada de segredo com fallback hardcoded; falhar alto é preferível.
- Persistência: `upsert` por e-mail em lowercase, e campo ausente no payload
  **nunca** sobrescreve dado já gravado.
- Comentários no código explicam **por quê**, não o quê — vários registram
  armadilhas reais (Nuxt 4 sem `app.html`, `require` no bundle do Mongo, `ignore`
  no Windows). Não os apague ao refatorar.
