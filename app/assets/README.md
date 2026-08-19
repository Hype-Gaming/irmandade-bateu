# app/assets/

Arquivos processados pelo bundler (diferente de [public/](../../public/), que é
copiado cru para a raiz do site).

| Arquivo | Uso |
|---|---|
| `css/main.css` | reset e base tipográfica |
| `css/admin-theme.css` | tema escuro do painel, importado por cada página de `pages/admin/` |

`nuxt.config.ts` tem `css: []` — nada é injetado globalmente. Cada página importa
o que precisa:

```css
@import "~/assets/css/admin-theme.css";
```

A identidade visual (dark premium, rosa `#ff1493`) vive majoritariamente em
`<style>` dentro dos `.vue`, não aqui.
