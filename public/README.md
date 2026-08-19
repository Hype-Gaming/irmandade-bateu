# public/

Servido cru na raiz do site (`public/logo.png` → `/logo.png`). Não passa pelo
bundler — para CSS processado, use [app/assets/](../app/assets/).

## PWA e runtime

| Arquivo | Papel |
|---|---|
| `manifest.json` | manifesto do PWA (nome, ícones, cores) |
| `sw.js` | service worker: cache offline e recepção de push |
| `version.json` | versão do build, escrita por `update-version.js` |
| `robots.txt` | indexação |

`version.json` é regravado a cada `npm run build`; o `UpdateNotification.vue`
compara com a versão carregada para avisar que há atualização.

`manifest.json` é **estático**: não lê `shared/app.ts`. Trocar o nome do app
exige editá-lo à mão.

## Ícones

`favicon.ico`, `favicon.png`, `favicon-32x32.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`. Todos referenciados em
`app.head` no [nuxt.config.ts](../nuxt.config.ts).

## Imagens

| Pasta | Conteúdo |
|---|---|
| `banners/` | banners da home (comunidade, redes, live) |
| `cards/` | capas dos cards de conteúdo |
| `games/` | miniaturas dos jogos |
| `highlights/` | destaques da home |
| `minicurso/` | capas das aulas, referenciadas em [app/constants/aulas.ts](../app/constants/) |

Soltos na raiz: `logo.png`, `banner-clube-da-bb.png`, `og-image.jpg`,
`acesso-bloqueado.png`.

`og-image.jpg` é referenciada por **URL absoluta** nas metas de Open Graph — os
scrapers de WhatsApp e Facebook ignoram caminho relativo.
