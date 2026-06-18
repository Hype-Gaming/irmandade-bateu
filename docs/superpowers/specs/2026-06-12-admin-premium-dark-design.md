# Admin Premium Dark — Design de UX/UI

Data: 2026-06-12
Status: aprovado pelo usuário (conversa)

## Objetivo

Elevar o visual e a experiência do painel admin (3 telas: `/admin`, `/admin/login`, `/admin/webhook`) para um padrão "premium dark refinado", evoluindo a identidade atual (preto profundo + ciano `#00ccff`) sem mudar nenhuma lógica, endpoint ou estrutura de dados.

## Direção visual (escolhida entre 3 opções)

**Premium dark refinado** — glows sutis, gradientes de profundidade, glassmorphism leve, micro-animações de entrada, números animados. Rejeitadas: "SaaS clean minimalista" e "neon bet vibrante".

## Abordagem técnica (escolhida entre 3 opções)

**Tokens compartilhados** em `app/assets/css/admin-theme.css` (variáveis CSS + keyframes), importado pelas 3 páginas via bloco `<style>` não-escopado (`@import`). Sem dependências novas, sem framework UI. Rejeitadas: polimento inline triplicado e adoção de Tailwind/Nuxt UI.

## Componentes do design

### 1. `admin-theme.css` (fundação)

- Variáveis: paleta (fundo `#070708`, superfícies vidro `rgba(18,18,22,.7)`, ciano, dourado `#f5c542`, âmbar/vermelho de risco), sombras em camadas, glows por accent, raios, curva padrão `cubic-bezier(0.22, 1, 0.36, 1)`.
- Keyframes globais: `admin-fade-up`, `admin-shimmer`, `admin-glow-pulse`, `admin-spin`, `admin-bar-grow`.
- Scrollbar dark (`::-webkit-scrollbar` + `scrollbar-color`), aplicada ao escopo `.admin-page`/`.login-page`.
- Bloco `@media (prefers-reduced-motion: reduce)` desliga animações/transições.

### 2. Dashboard (`/admin`)

- Fundo aurora: radial ciano no topo + radial roxo sutil num canto.
- Cards de métrica: vidro fosco (`backdrop-filter: blur`), borda que acende no hover com glow do accent, entrada em cascata (stagger 60ms via `animation-delay` por índice), números com **count-up** (~800ms, easing, `requestAnimationFrame`).
- Card "Em risco": glow-pulse vermelho quando `atRisk > 0`.
- Tabelas: cabeçalho sticky dentro do card, hover de linha com filete ciano à esquerda, avatar com matiz derivado do nome (hash → `hsl`), transições suaves.
- Chips de filtro: efeito press (scale 0.96 em `:active`), `:focus-visible` ring.
- Gráfico (`ActivityChart.vue`): gradiente vertical nas barras (`<linearGradient>`), animação de crescimento na entrada, linha pontilhada da média.
- Modal: entrada spring (scale 0.92 → overshoot leve). Toast: barra de progresso do tempo restante (animação width 3.2s linear).
- UX: tecla `/` foca a busca (fora de inputs).

### 3. Login (`/admin/login`)

Aurora de fundo, card em vidro com entrada fade-up, ícone com glow, botão com sombra ciano e hover de elevação, inputs com focus ring suave.

### 4. Webhook (`/admin/webhook`)

Mesmos tokens: aurora, cards vidro, botões/inputs/badges padronizados com o resto.

## Utilitários novos (front puro)

- `app/composables/useCountUp.ts` — anima número de 0 ao alvo via rAF; respeita `prefers-reduced-motion` (vai direto ao alvo).
- Função `avatarHue(name)` — hash simples → matiz HSL (local no index.vue).

## Fora de escopo

Lógica, endpoints, dados, rotas, autenticação. Nenhuma dependência nova.

## Critérios de aceite

- As 3 telas compartilham os mesmos tokens (1 fonte de verdade).
- `nuxt build` passa; dev sem erro de compilação.
- Com `prefers-reduced-motion`, nada anima.
- Mobile continua funcional (tabela→cards, chips quebram linha).
