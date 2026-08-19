# app/

Tudo que roda no browser. É o `srcDir` do Nuxt 4 — arquivos fora daqui **não**
são tratados como código da aplicação (foi o que aposentou o antigo `app.html`
da raiz).

| Diretório | Conteúdo |
|---|---|
| [assets/](assets/) | CSS que passa pelo bundler |
| [components/](components/) | componentes auto-importados |
| [composables/](composables/) | estado global e integração com as APIs |
| [constants/](constants/) | conteúdo editável (aulas, catálogo de jogos) |
| [middleware/](middleware/) | guardas de rota |
| [pages/](pages/) | rotas do app |
| [plugins/](plugins/) | inicialização no boot do client |

`app.vue` é a casca: layout raiz, `<NuxtPage/>` e o head dinâmico a partir de
[shared/app.ts](../shared/app.ts). `spa-loading-template.html` é a tela exibida
antes do JS assumir — como o app é SPA (`ssr: false`), ela é a primeira coisa
que o usuário vê.

## Como o estado circula

Sem Pinia. `useState` do Nuxt dentro dos composables:

```
useAuth  ── token, usuário, cookie_key, marca da sessão (localStorage)
   ├── useGame     → iniciar jogo na Cactus
   ├── useDeposit  → depósito PIX
   └── usePush     → inscrição de notificações
useSubscription ── assinatura, cache de 5 min em sessionStorage
useBlocked      ── flag setada pelo heartbeat de sessão
```

Bloqueio, assinatura e KYC aparecem como **modais** — nunca como rota separada.

Ver [docs/arquitetura.md](../docs/arquitetura.md).
