# Admin Premium Dark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign premium dark das 3 telas do admin (dashboard, login, webhook) com tokens compartilhados, micro-animações e UX refinada — zero mudança de lógica.

**Architecture:** `app/assets/css/admin-theme.css` (tokens + keyframes globais, importado via `@import` em bloco `<style>` não-escopado nas 3 páginas) + composable `useCountUp` + edições de template/CSS por tela.

**Tech Stack:** CSS puro com custom properties, Vue 3, zero dependências novas.

**Testes:** Projeto sem framework de teste. Verificação: compilar SFCs via Vite (`curl /_nuxt/@fs/...`), checagem visual, `npx nuxt build` no final.

**Spec:** `docs/superpowers/specs/2026-06-12-admin-premium-dark-design.md`

---

### Task 1: Fundação — `admin-theme.css` + `useCountUp`

**Files:**
- Create: `app/assets/css/admin-theme.css`
- Create: `app/composables/useCountUp.ts`

- [ ] **Step 1: Criar `admin-theme.css`** com: variáveis `--adm-*` (paleta, sombras, glows, raio, easing), keyframes `admin-fade-up`, `admin-shimmer`, `admin-glow-pulse`, `admin-spin`, `admin-bar-grow`, `admin-toast-timer`, scrollbar dark escopada em `.admin-page`/`.login-page`, e bloco `prefers-reduced-motion` que zera animações/transições nessas telas. (Código completo na execução — arquivo novo inteiro.)

- [ ] **Step 2: Criar `useCountUp.ts`**:

```ts
import type { Ref } from 'vue'

// Anima um número de 0 (ou do valor atual) até o alvo via rAF.
// Respeita prefers-reduced-motion: vai direto ao alvo.
export const useCountUp = (target: Ref<number | null | undefined>, duration = 800) => {
  const display = ref(0)
  let raf = 0

  const animate = (to: number) => {
    cancelAnimationFrame(raf)
    if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      display.value = to
      return
    }
    const from = display.value
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      display.value = from + (to - from) * eased
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  watch(target, (v) => { if (typeof v === 'number') animate(v) }, { immediate: true })
  onUnmounted(() => cancelAnimationFrame(raf))
  return display
}
```

- [ ] **Step 3: Commit** — `feat: tokens premium dark + composable de count-up para o admin`

### Task 2: Dashboard (`app/pages/admin/index.vue`)

- [ ] **Step 1: Importar tema** — bloco `<style>` (não-escopado) antes do scoped: `@import "~/assets/css/admin-theme.css";`
- [ ] **Step 2: Count-up nos 8 cards** — `useCountUp` por métrica (computed do stats), template usa `Math.round()` para inteiros, `formatBRL`/`formatPct` para os demais.
- [ ] **Step 3: Aurora no fundo** — `.admin-page` ganha radial ciano no topo + radial roxo no canto inferior-direito.
- [ ] **Step 4: Cards vidro + cascata** — `.stat-card`: `rgba` + `backdrop-filter: blur(14px)`, borda `--adm-border`, `animation: admin-fade-up` com `animation-delay` por `nth-child`, hover com glow do accent; "Em risco" com `admin-glow-pulse` quando `atRisk > 0` (classe `alert`).
- [ ] **Step 5: Tabelas** — `.table-wrap` com `max-height: 62vh; overflow: auto` e `thead th` sticky; hover de linha com filete ciano (gradiente); avatar com matiz por usuário: função `avatarHue(seed)` (hash → hue) + `:style` no avatar.
- [ ] **Step 6: Chips/inputs** — `:active { transform: scale(0.96) }`, `:focus-visible` ring ciano; search com ring no focus.
- [ ] **Step 7: Modal spring + toast com timer** — transição do modal com `cubic-bezier(0.34, 1.56, 0.64, 1)`; `<span class="toast-timer">` com `animation: admin-toast-timer 3.2s linear`.
- [ ] **Step 8: Atalho `/`** — no `onKeydown` existente: se `/` e alvo não é input/textarea/select, foca a busca (`searchInput` ref).
- [ ] **Step 9: Verificar compilação via Vite + commit** — `feat: dashboard admin com visual premium dark`

### Task 3: Gráfico (`app/components/admin/ActivityChart.vue`)

- [ ] **Step 1:** `<defs><linearGradient id="admBarGrad">` ciano→transparente; barras com `fill="url(#admBarGrad)"`.
- [ ] **Step 2:** Animação de crescimento: `.bar { transform-box: fill-box; transform-origin: bottom; animation: admin-bar-grow 0.5s var(--adm-ease) both }` + delay por índice (`:style`).
- [ ] **Step 3:** Linha de média pontilhada da série ativa (`avgY` computed) + label.
- [ ] **Step 4:** Commit — `feat: grafico admin com gradiente, animacao e linha de media`

### Task 4: Login (`app/pages/admin/login.vue`)

- [ ] **Step 1:** Import do tema; aurora no `.login-page`; card vidro com `admin-fade-up`; escudo com `filter: drop-shadow` ciano; inputs com focus ring (`box-shadow` 3px rgba ciano); botão com sombra ciano e hover `translateY(-1px)`.
- [ ] **Step 2:** Commit — `feat: login admin premium dark`

### Task 5: Webhook (`app/pages/admin/webhook.vue`)

- [ ] **Step 1:** Import do tema; aurora; cards vidro com borda `--adm-border`; textarea/botões com focus ring e press; result-rows com `admin-fade-up` em cascata.
- [ ] **Step 2:** Commit — `feat: webhook admin premium dark`

### Task 6: Verificação final

- [ ] **Step 1:** Compilar as 3 páginas + componente via `curl /_nuxt/@fs/...` → 200.
- [ ] **Step 2:** `npx nuxt build` → passa.
- [ ] **Step 3:** Checagem visual (usuário) — desktop + mobile + reduced motion.
