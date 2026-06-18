# Login Duplo (Multi-marca + E-mail/CPF) — Guia para replicar na Irmandade

Documento de referência para implementar o **login duplo** no app da Irmandade
(`app_irmandade/irmandade-club-hypegaming/`), igual ao que foi feito no app Rainha.

"Login duplo" = duas coisas:
1. **Multi-marca**: o usuário entra com conta de **mais de uma casa** (ex.: esportiva
   **ou** bateu bet). O app tenta cada marca até uma autenticar.
2. **E-mail ou CPF**: o mesmo campo de login aceita **e-mail OU CPF**.

---

## 1. O que você precisa saber da API Cactus (descobertas testadas)

Essas descobertas vieram de testes reais contra `routes-eb.grupoautoma.com` e
**economizam horas** — valem para qualquer app que usa o mesmo provedor.

### 1.1. Cada marca = `brand_slug` + `base_domain` + `user_collection`
As marcas geralmente **compartilham o mesmo host e domínio**, mudando só o slug e a
coleção de usuários:

| Marca | brand_slug | base_domain | apiBaseUrl | user_collection |
|---|---|---|---|---|
| Esportiva | `esportiva` | `bet.br` | `https://routes-eb.grupoautoma.com` | `users_eb` |
| Bateu Bet | `bateu` | `bet.br` | `https://routes-eb.grupoautoma.com` | `users_bb` |

> ⚠️ Para a Irmandade, **descubra os valores da(s) marca(s) dela** (veja a seção 4).
> Não assuma que são os mesmos.

### 1.2. O campo `email` é o LOGIN ÚNICO (aceita e-mail E CPF)
Esse é o ponto que mais confunde. Testando o endpoint `POST /api/auth/login`:

| O que enviei | Resposta |
|---|---|
| CPF no campo `cpf` | ❌ `400 "Informe e-mail e senha."` |
| CPF nos campos `username` / `document` | ❌ `400` |
| CPF no campo **`email`** | ✅ `422 "check your email/username and password"` (chegou na autenticação) |

**Conclusão:** o CPF (só dígitos) deve ser enviado **no campo `email`**, não num campo
`cpf`. Código que manda `body.cpf` **nunca funciona** (dá 400).

### 1.3. Como o login responde
- Senha < 6 chars → `422 { detail.errors.password }`
- Marca inexistente → erro de marca (não chega na senha)
- Credenciais erradas → `422 { detail.x: "Failed to authenticate...", detail.error: "..." }`
- Sucesso → `{ access_token, cookie_key, user, ... }`

---

## 2. Arquitetura: a marca vira "por usuário"

Hoje o app fixa a marca em constantes globais (`BRAND_SLUG = 'esportiva'`). No login
duplo, **a marca deixa de ser global e passa a ser do usuário logado**:

```
login → tenta marca A, depois B → a que autenticar é gravada na sessão
       → perfil, iniciar jogo, depósito e validação admin usam a marca DAQUELE usuário
```

Lugares que fixam a marca hoje (procure por `BRAND_SLUG`, `BASE_DOMAIN`,
`USER_COLLECTION`, `routes-eb`, `esportiva`):
- `composables/useAuth.ts` (login, perfil, logout, headers)
- `composables/useGame.ts` (iniciar jogo)
- `composables/useDeposit.ts` (depósito)
- `server/utils/admin.ts` (validação admin, se existir)
- textos/links: tela de login e modal de KYC

---

## 3. Implementação passo a passo

### Passo 1 — Fonte única das marcas: `shared/brands.ts`
(Em Nuxt 4 o diretório `shared/` é importável tanto no client quanto no server.)

```ts
export interface BrandConfig {
  slug: string
  name: string
  baseDomain: string
  apiBaseUrl: string
  userCollection: string
  affiliateUrl: string // link de cadastro/afiliado da casa
}

export const BRANDS: BrandConfig[] = [
  {
    slug: 'esportiva',
    name: 'Esportiva',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_eb',
    affiliateUrl: 'https://esportiva.bet.br/?src=SEU_CODIGO'
  },
  {
    slug: 'bateu',
    name: 'Bateu Bet',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_bb',
    affiliateUrl: 'https://go.aff.bateu.bet.br/SEU_CODIGO'
  }
]

export const DEFAULT_BRAND: BrandConfig = BRANDS[0]!

export const getBrand = (slug?: string | null): BrandConfig =>
  BRANDS.find((b) => b.slug === slug) || DEFAULT_BRAND
```

> Importar com caminho relativo funciona nos dois contextos:
> client `../../shared/brands`, server `../../shared/brands`.

### Passo 2 — `useAuth.ts`: estado da marca + login tentando todas + e-mail/CPF

1. **Adicione a marca ao estado** (e persista no localStorage):
```ts
import { BRANDS, DEFAULT_BRAND, getBrand } from '../../shared/brands'

const authState = reactive({
  // ...campos existentes...
  brandSlug: DEFAULT_BRAND.slug,
  baseDomain: DEFAULT_BRAND.baseDomain,
  apiBaseUrl: DEFAULT_BRAND.apiBaseUrl,
  userCollection: DEFAULT_BRAND.userCollection
})
```
No `saveAuthState` inclua `brandSlug`; no `loadAuthState` restaure via
`getBrand(parsed.brandSlug)`; no `clearAuth` volte para `DEFAULT_BRAND`.

2. **Login tentando cada marca** (e CPF no campo `email`):
```ts
const login = async (credentials: { email?: string; cpf?: string; password: string }) => {
  loading.value = true
  let lastError: any = null
  try {
    for (const brand of BRANDS) {
      const body: Record<string, any> = {
        password: credentials.password,
        brand_slug: brand.slug,
        base_domain: brand.baseDomain,
        app_source: 'web',
        save_cookies: true
      }
      // A API usa o campo "email" como login único: aceita e-mail OU CPF (só dígitos).
      if (credentials.email) body.email = credentials.email
      else if (credentials.cpf) body.email = credentials.cpf.replace(/\D/g, '')

      try {
        const response = await $fetch(`${brand.apiBaseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Brand-Slug': brand.slug,
            'X-Base-Domain': brand.baseDomain
          },
          body
        })
        // Sucesso: fixa a marca que autenticou
        authState.brandSlug = brand.slug
        authState.baseDomain = brand.baseDomain
        authState.apiBaseUrl = brand.apiBaseUrl
        authState.userCollection = brand.userCollection
        // ...salva token/user/cookieKey, saveAuthState(), fetchUserProfile()...
        return { success: true }
      } catch (err) {
        lastError = err // credencial não existe nessa marca → tenta a próxima
      }
    }
    // nenhuma marca autenticou → monta mensagem a partir de lastError
    return { success: false, message: parseLoginError(lastError) }
  } finally {
    loading.value = false
  }
}
```

3. **Use a marca do estado** em `fetchUserProfile`, `logout` e `getAuthHeaders`
   (troque as constantes por `authState.apiBaseUrl/brandSlug/baseDomain/userCollection`).

4. **Exponha a marca** no `return` para os outros composables:
```ts
brandSlug: computed(() => authState.brandSlug),
baseDomain: computed(() => authState.baseDomain),
apiBaseUrl: computed(() => authState.apiBaseUrl),
brandName: computed(() => getBrand(authState.brandSlug).name),
affiliateUrl: computed(() => getBrand(authState.brandSlug).affiliateUrl),
```

### Passo 3 — `useGame.ts` e `useDeposit.ts`
Remova as constantes `API_BASE/BRAND_SLUG/BASE_DOMAIN` e pegue do `useAuth`:
```ts
const { token, cookieKey, apiBaseUrl, brandSlug, baseDomain } = useAuth()
// ...
await $fetch(`${apiBaseUrl.value}/api/start-game`, {
  headers: {
    'Authorization': `Bearer ${token.value}`,
    'X-Brand-Slug': brandSlug.value,
    'X-Base-Domain': baseDomain.value,
    'X-Cactus-Cookie-Key': String(cookieKey.value || '')
  }
})
```

### Passo 4 — Validação admin no server (se o app tiver)
O server não sabe a marca; **leia do header** que o front já envia:
```ts
import { getBrand } from '../../shared/brands'
const brand = getBrand(getHeader(event, 'x-brand-slug'))
await $fetch(`${brand.apiBaseUrl}/api/auth/user`, {
  params: { collection: brand.userCollection },
  headers: { Authorization, 'X-Brand-Slug': brand.slug, 'X-Base-Domain': brand.baseDomain, ... }
})
```

### Passo 5 — Tela de login: um campo "E-mail ou CPF"
```vue
<input v-model="form.identifier" type="text" placeholder="seu@email.com ou CPF" required />
```
```ts
const identifier = form.identifier.trim()
const isEmail = identifier.includes('@')        // com "@" é e-mail; senão, CPF
const result = await login(
  isEmail ? { email: identifier, password } : { cpf: identifier, password }
)
```
E, se quiser, mostre os links de cadastro das duas casas iterando `BRANDS`:
```vue
<a v-for="brand in brands" :key="brand.slug" :href="brand.affiliateUrl" target="_blank">
  Criar conta na {{ brand.name }}
</a>
```

### Passo 6 — KYC / links de afiliado por marca
No modal de KYC, use `affiliateUrl`/`brandName` do `useAuth` (em vez do link fixo da
esportiva), para o usuário da bateu ir pro link da bateu.

---

## 4. Como descobrir os valores da marca (curl)

Rode com o app de dev no ar (ou direto contra a API). Os testes usam credenciais
**falsas** — são inofensivos, só revelam o comportamento.

```bash
# A marca é válida? (senha 6+ chars → chega na autenticação = slug ok)
curl -s -X POST 'https://routes-eb.grupoautoma.com/api/auth/login' \
  -H 'Content-Type: application/json' -H 'X-Brand-Slug: bateu' -H 'X-Base-Domain: bet.br' \
  -d '{"email":"naoexiste@x.com","password":"123456","brand_slug":"bateu","base_domain":"bet.br","app_source":"web"}'
# Esperado: 422 "Failed to authenticate..." (marca válida, só credencial errada)

# CPF entra no campo email (não no campo cpf):
curl -s -X POST '.../api/auth/login' -H 'Content-Type: application/json' \
  -H 'X-Brand-Slug: bateu' -H 'X-Base-Domain: bet.br' \
  -d '{"email":"12345678901","password":"123456","brand_slug":"bateu","base_domain":"bet.br","app_source":"web"}'
# Esperado: 422 (chegou na autenticação). Se mandar "cpf":"..." → 400 "Informe e-mail e senha".
```

O `user_collection` (`users_eb`, `users_bb`, ...) normalmente segue o padrão da marca
e você confirma com quem administra o Cactus/Automa.

---

## 5. Verificação final
1. `npx nuxt build` compila (client + server resolvem `shared/brands.ts`).
2. Login com conta da **marca A** entra; com conta da **marca B** entra (na 2ª tentativa).
3. Login por **CPF** (real) entra; por **e-mail** entra.
4. Depois de logado: iniciar jogo, depósito e (se houver) admin funcionam na marca certa.

---

## 6. Prompt reutilizável (cole no assistente, dentro do repo da Irmandade)

```
# Tarefa: implementar login duplo (multi-marca + e-mail/CPF) neste app

Hoje o login fixa a marca em constantes (BRAND_SLUG='esportiva', BASE_DOMAIN,
USER_COLLECTION, routes-eb). Quero:
1. Multi-marca: no login, tentar cada marca até uma autenticar; a que logar fica na
   sessão e é usada em perfil, iniciar jogo, depósito e validação admin.
2. E-mail OU CPF no mesmo campo de login.

Fatos importantes da API Cactus (já testados, NÃO refaça do zero):
- Cada marca = brand_slug + base_domain + apiBaseUrl + user_collection. Geralmente só
  mudam slug e coleção (host/domínio iguais).
- O endpoint POST /api/auth/login usa o campo "email" como LOGIN ÚNICO: o CPF (só
  dígitos) deve ir no campo "email". Mandar "cpf"/"username"/"document" → 400
  "Informe e-mail e senha".

Passos:
1. Crie shared/brands.ts com a lista de marcas (slug, name, baseDomain, apiBaseUrl,
   userCollection, affiliateUrl) + getBrand(slug). Descubra os valores reais da(s)
   marca(s) deste app (não copie cegamente esportiva/bateu).
2. Em useAuth: adicione a marca ao authState (persistida); reescreva login() para
   iterar BRANDS e tentar cada uma; envie CPF no campo "email"; fixe a marca que
   autenticou; use authState.* (apiBaseUrl/brandSlug/baseDomain/userCollection) em
   fetchUserProfile/logout/getAuthHeaders; exponha brandSlug/baseDomain/apiBaseUrl/
   brandName/affiliateUrl no return.
3. Em useGame e useDeposit: troque as constantes pela marca vinda do useAuth.
4. Se houver server/utils/admin.ts (ou similar): valide o token lendo a marca do
   header X-Brand-Slug (getBrand) em vez de fixar esportiva.
5. Tela de login: campo único "E-mail ou CPF" (detecta "@" = email, senão cpf) e,
   opcional, links "Criar conta" por marca iterando BRANDS. KYC: use affiliateUrl/
   brandName da marca logada.
6. Valide com: npx nuxt build, e os curl de teste da seção 4 deste guia.

Procure por: grep -rE "esportiva|BRAND_SLUG|BASE_DOMAIN|USER_COLLECTION|routes-eb" .
para achar todos os pontos que fixam a marca.
```

---

## Referência
A implementação completa está no app **Rainha** (mesmo padrão):
- `shared/brands.ts`
- `app/composables/useAuth.ts` (login multi-marca + e-mail/CPF)
- `app/composables/useGame.ts`, `app/composables/useDeposit.ts`
- `server/utils/admin.ts` (validação na marca do header)
- `app/pages/auth/login.vue`, `app/components/KycModal.vue`
