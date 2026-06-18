# Fix dos Ícones em Produção (@nuxt/icon) — Documento de Referência

## Contexto

Os apps Nuxt (Irmandade, Rainha, e qualquer outro com o mesmo padrão) usam o módulo
**@nuxt/icon** com ícones **Phosphor (`ph:`)**. Pela configuração padrão
(`serverBundle: 'remote'`) e **sem nenhuma coleção `@iconify-json` instalada
localmente**, os ícones são buscados na **API externa da Iconify
(api.iconify.design) em tempo de execução**.

Isso funciona no ambiente de desenvolvimento (máquina com internet livre), mas é
**frágil em produção**.

## Sintoma

- Ícones aparecem normalmente em `nuxt dev`, mas **somem / ficam vazios / piscam**
  em produção.
- Mais grave em apps **SPA (`ssr: false`)**, onde cada ícone depende de um `fetch`
  em runtime — qualquer falha de rede quebra a renderização.

## Causa raiz

No `nuxt.config.ts`:

```ts
icon: {
  serverBundle: 'remote',   // <- busca os ícones na API da Iconify em runtime
}
```

Com `serverBundle: 'remote'` **e** nenhum pacote `@iconify-json/*` instalado, o
servidor de produção precisa alcançar `api.iconify.design` toda vez que serve um
ícone. Se o ambiente de produção:

- não tiver internet de saída (firewall / rede fechada / serverless isolado), ou
- a Iconify estiver fora / com rate-limit,

→ **os ícones não carregam.**

## Diagnóstico (rodar na raiz do projeto)

```bash
# 1) Como o icon está configurado
grep -A3 "icon:" nuxt.config.ts

# 2) Tem coleção Iconify instalada localmente?
ls node_modules/@iconify-json 2>/dev/null || echo "NENHUMA coleção local"

# 3) Quais prefixos de ícone o app usa (ph, mdi, lucide, etc.)
grep -rhoE 'name="[a-z0-9-]+:' app 2>/dev/null | sed 's/name="//' | sort | uniq -c

# 4) Como é servido (server Node vs estático)
node -e "const p=require('./package.json');console.log('start:',p.scripts.start,'| build:',p.scripts.build)"
```

Se (2) disser "NENHUMA" e (1) mostrar `serverBundle: 'remote'`, **o app está
vulnerável** e precisa do fix.

## Fix

### Passo 1 — Instalar as coleções dos prefixos usados

O diagnóstico (3) mostra os prefixos. Para cada prefixo, instale a coleção
correspondente como **devDependency** (só é usada no build):

```bash
# Phosphor (ph:) — o caso do Irmandade/Rainha
npm install -D @iconify-json/ph

# se o grep mostrar outros prefixos, instale também. Exemplos:
# npm install -D @iconify-json/mdi        (mdi:)
# npm install -D @iconify-json/lucide     (lucide:)
# npm install -D @iconify-json/heroicons  (heroicons:)
```

### Passo 2 — Empacotar localmente no `nuxt.config.ts`

Trocar `remote` por `local`:

```ts
icon: {
  serverBundle: 'local',
}
```

- **`local`** → o próprio app serve os ícones do bundle. **Zero chamada externa.**
  Ideal para deploy via **servidor Node** (`node .output/server/index.mjs`), que é
  o caso do Irmandade e do Rainha.

### Passo 2-alt — Se o deploy for ESTÁTICO (`nuxt generate`)

Num site 100% estático não há servidor pra servir os ícones. Nesse caso use
`clientBundle` pra assar os ícones usados direto no JS do cliente:

```ts
icon: {
  clientBundle: {
    scan: true,        // varre o código e inclui só os ícones realmente usados
    sizeLimitKb: 512,  // teto de segurança do bundle
  },
}
```

> `clientBundle.scan` também funciona junto com `serverBundle: 'local'` — é a opção
> mais robusta para SPA, porque não depende nem do servidor em runtime.

### Passo 3 — Rebuild

```bash
npm run build
```

## Validação

1. Suba o build de produção localmente (`node .output/server/index.mjs` ou o
   comando `start` do projeto).
2. Abra o app, vá no DevTools → aba **Network**, filtre por `iconify`.
   - **Antes do fix:** aparecem requisições para `api.iconify.design`.
   - **Depois do fix:** **nenhuma** requisição externa de ícone — eles vêm do
     próprio app.
3. Teste-chave: **desligue a internet** e recarregue. Os ícones devem continuar
   aparecendo.

## Prompt reutilizável (para o Rainha ou outro app)

Cole no assistente dentro do projeto Rainha:

```
# Tarefa: Garantir que os ícones (@nuxt/icon) funcionem em produção

## Sintoma
O app usa @nuxt/icon. Os ícones aparecem em dev mas podem sumir em produção porque
estão sendo buscados na API externa da Iconify em runtime (serverBundle: 'remote' e
nenhuma coleção @iconify-json instalada localmente).

## Diagnóstico (rode primeiro)
1. grep -A3 "icon:" nuxt.config.ts            -> ver serverBundle
2. ls node_modules/@iconify-json              -> ver se há coleção local
3. grep -rhoE 'name="[a-z0-9-]+:' app | sed 's/name="//' | sort | uniq -c
                                              -> ver os prefixos usados
4. cat package.json | grep -A5 scripts        -> ver se é server Node ou estático

## O que fazer
1. Para cada prefixo de ícone usado (ex.: ph, mdi, lucide), instalar a coleção
   correspondente como devDependency: npm install -D @iconify-json/<prefixo>
2. No nuxt.config.ts, trocar serverBundle: 'remote' por serverBundle: 'local'
   (deploy via servidor Node). Se o deploy for estático (nuxt generate), usar
   clientBundle: { scan: true, sizeLimitKb: 512 } em vez de / além do serverBundle.
3. Rodar npm run build.
4. Validar: subir o build, abrir DevTools > Network, filtrar 'iconify' e confirmar
   que NÃO há requisições para api.iconify.design. Testar offline: ícones devem
   continuar aparecendo.

## Importante
- Não mude os nomes dos ícones no código (name="ph:...") — só a configuração/empacote.
- Instale a coleção como -D (devDependency); ela só é usada no build.
- Se o grep mostrar mais de um prefixo, instale TODAS as coleções correspondentes,
  senão os ícones do prefixo faltante continuam quebrando.
```

## Referência (Irmandade)

- App usa só `ph:` (Phosphor) — ~71 ícones únicos.
- Servido por servidor Node (`node .output/server/index.mjs`).
- Fix recomendado: `npm install -D @iconify-json/ph` + `serverBundle: 'local'`.
