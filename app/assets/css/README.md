# app/assets/css/

| Arquivo | O que é |
|---|---|
| `main.css` | reset (`margin/padding/box-sizing`) e família tipográfica base |
| `admin-theme.css` | tokens e componentes do painel admin |

`admin-theme.css` é importado por `@import "~/assets/css/admin-theme.css"` no
`<style>` de cada página em [../../pages/admin/](../../pages/admin/) — deixando o
tema do painel fora do bundle das páginas do usuário final.

> Existe também um `assets/css/main.css` na **raiz** do repositório, resquício de
> antes do Nuxt 4 mover o `srcDir` para `app/`. Ele não é carregado por nada.
