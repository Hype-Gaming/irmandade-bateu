# Troubleshooting

Problemas que já aconteceram e o que os resolveu.

---

## Ícones somem em produção (`@nuxt/icon`)

**Status neste repo: PENDENTE.** [nuxt.config.ts](../../nuxt.config.ts) ainda usa
`serverBundle: 'remote'` e não há nenhuma coleção `@iconify-json` instalada —
ou seja, o app está vulnerável.

### Sintoma

Ícones aparecem em `nuxt dev` mas **somem, ficam vazios ou piscam** em produção.
Pior em SPA (`ssr: false`, o caso daqui), onde cada ícone depende de um `fetch`
em runtime.

### Causa

```ts
icon: { serverBundle: 'remote' }   // busca na api.iconify.design em runtime
```

Com `remote` **e** sem `@iconify-json/*` instalado, o servidor precisa alcançar
`api.iconify.design` toda vez. Se a saída de internet estiver bloqueada, ou a
Iconify cair / aplicar rate-limit, os ícones não carregam.

### Diagnóstico

```bash
grep -A3 "icon:" nuxt.config.ts                     # 1) como está configurado
ls node_modules/@iconify-json 2>/dev/null || echo "NENHUMA coleção local"
grep -rhoE 'name="[a-z0-9-]+:' app | sed 's/name="//' | sort | uniq -c   # 3) prefixos usados
```

`remote` + "NENHUMA coleção local" = precisa do fix.

### Correção

1. Instale a coleção de **cada** prefixo que o passo 3 mostrou, como devDependency
   (só é usada no build):
   ```bash
   npm install -D @iconify-json/ph          # ph:
   # npm install -D @iconify-json/mdi       # mdi:
   # npm install -D @iconify-json/lucide    # lucide:
   ```
   Prefixo faltante continua quebrado — instale todos.
2. No `nuxt.config.ts`:
   ```ts
   icon: { serverBundle: 'local' }
   ```
   Deploy aqui é servidor Node (`node .output/server/index.mjs`), então `local`
   resolve. Para deploy 100% estático (`nuxt generate`), use
   `clientBundle: { scan: true, sizeLimitKb: 512 }`, que assa os ícones usados
   direto no JS do cliente. `scan` também combina com `serverBundle: 'local'` —
   é a opção mais robusta para SPA.
3. `npm run build`.

Não mexa nos `name="ph:..."` do código — só na configuração.

### Validar

Suba o build, abra DevTools → Network, filtre `iconify`: **nenhuma** requisição
para `api.iconify.design`. Teste decisivo: desligue a internet e recarregue —
os ícones devem continuar aparecendo.

---

## `require is not defined` ao conectar no Mongo

O driver `mongodb` v7 usa `require()` interno para dependências opcionais, e o
bundle ESM do Nitro não tem `require`. Resolvido pelo banner do
`nitro.rollupConfig` em [nuxt.config.ts](../../nuxt.config.ts), que define um
`globalThis.require` via `createRequire` em todos os chunks. Não remova.

## Head do documento sem efeito

Favicon, manifest, metas de PWA e Open Graph **não** vêm de um `app.html` na raiz:
o Nuxt 4 não lê esse arquivo. Tudo isso vive em `app.head` no
[nuxt.config.ts](../../nuxt.config.ts). O mesmo vale para o registro do service
worker, que virou o plugin
[service-worker.client.ts](../../app/plugins/service-worker.client.ts).

## Imagem de Open Graph não aparece no WhatsApp/Facebook

As URLs de `og:image` precisam ser **absolutas** — os scrapers ignoram caminho
relativo.

## `isIgnored` quebra no `nuxt dev` (Windows)

Vite 7.2 no Windows passa o id virtual `vite/modulepreload-polyfill` como caminho
absoluto para o pacote `ignore`, que lança
`path should be a path.relative()'d string`. Contornado com
`ignoreOptions: { allowRelativePaths: true }`.

## Notificação agendada dispara duas vezes

O agendador roda em memória do processo Nitro. PM2 em modo cluster daria um
intervalo por worker. Mantenha `instances: 1` e `exec_mode: 'fork'` nos
ecosystems — ver [web-push.md](../integracoes/web-push.md).

## Histórico do jogo vazio / 403 do catalogador

`casino-data.grupoautoma.com` bloqueia domínios fora da allowlist dele. Por isso
o front chama `/api/casino-results`, que faz o proxy pelo servidor com o `Referer`
autorizado (`CATALOGADOR_REFERER`). Se a allowlist mudar, ajuste essa env — não
volte a chamar o catalogador direto do browser.

## Assinatura paga mas usuário sem acesso

Ver [../integracoes/lastlink.md](../integracoes/lastlink.md) — quase sempre é
variação de payload ou token do webhook.
