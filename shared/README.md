# shared/

Constantes importáveis **tanto no client quanto no server** — em Nuxt 4 este
diretório vale para os dois lados. É onde fica o que muda entre marcas e deploys
sem virar variável de ambiente.

| Arquivo | Fonte única de |
|---|---|
| `app.ts` | nome, tagline, descrição e `APP_SLUG` do produto |
| `brands.ts` | as casas de aposta (slug, domínio, API, collection, link de afiliado) |
| `support.ts` | WhatsApp de suporte e link do grupo da comunidade |
| `videos.ts` | base pública dos vídeos das aulas + `videoUrl(key)` |

Importe por caminho relativo (`../../shared/brands`) — funciona nos dois contextos.

## Detalhes que economizam tempo

**`app.ts`** — `APP_NAME` é o nome do *clube*, não da casa de apostas (essa vive
em `brands.ts`). `APP_SLUG` é derivado sem acento, em minúsculas e com hífen,
para nome de arquivo (ex.: o CSV do painel). Trocar o nome do app é mexer só
nesta constante — **exceto** `public/manifest.json`, que é estático e não importa TS.

**`brands.ts`** — adicionar uma casa é acrescentar um item em `BRANDS`; o login
já percorre o array. A ordem importa: o login para na primeira que autenticar.
`getBrand()` cai em `DEFAULT_BRAND` e `getDefaultBrand(slug)` respeita o slug
ativo (`NUXT_PUBLIC_APP_BRAND`), com fallback em `BRANDS[0]`.

**`support.ts`** — o suporte usa um link curto `wa.me/message/<código>`, que
**não** aceita `?text=`. Por isso o usuário chega no chat em branco, sem mensagem
pré-preenchida.

**`videos.ts`** — `VIDEO_BASE_URL` vazio desliga o player: toda aula com
`videoKey` cai no aviso "Em breve" em vez de quebrar. `videoUrl(key)` recebe a
chave **completa** do objeto e não insere prefixo de pasta.

> ⚠️ Os vídeos ainda são servidos do bucket do projeto de referência
> (`clube_BB`). O domínio não aparece na interface, mas derrubar aquele bucket
> derruba as aulas daqui junto. Migrar para storage próprio segue pendente.
