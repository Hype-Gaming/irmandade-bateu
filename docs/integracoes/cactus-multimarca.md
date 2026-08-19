# Cactus — login multi-marca (e-mail ou CPF)

Já implementado neste repositório. O documento explica **como funciona** e
**como adicionar uma casa nova**.

"Login duplo" são duas coisas ao mesmo tempo:

1. **Multi-marca** — o usuário entra com conta de qualquer casa cadastrada; o app
   tenta uma por uma até alguma autenticar.
2. **E-mail ou CPF** — o mesmo campo aceita os dois.

## As duas descobertas que sustentam o desenho

### 1. O campo `email` é o login único

Testes reais contra `routes-eb.grupoautoma.com`:

| Enviado | Resposta |
|---|---|
| CPF no campo `cpf` | `400 "Informe e-mail e senha."` |
| CPF em `username` / `document` | `400` |
| CPF no campo **`email`** | `422 "check your email/username and password"` — chegou na autenticação |

Ou seja: o CPF (só dígitos) vai **no campo `email`**. Código que envia `body.cpf`
nunca funciona.

### 2. Marca = `brand_slug` + `base_domain` + `user_collection`

As casas costumam compartilhar host e domínio, mudando só o slug e a collection:

| Marca | slug | baseDomain | apiBaseUrl | userCollection |
|---|---|---|---|---|
| Esportiva | `esportiva` | `bet.br` | `https://routes-eb.grupoautoma.com` | `users_eb` |
| Bateu Bet | `bateu` | `bet.br` | `https://routes-eb.grupoautoma.com` | `users_bb` |

## Como está implementado

Fonte única: [shared/brands.ts](../../shared/brands.ts) — `BRANDS`, `DEFAULT_BRAND`,
`getBrand(slug)`, `getDefaultBrand(slug)`. Em Nuxt 4, `shared/` é importável tanto
no client quanto no server.

```
login → tenta marca A, depois B → a que autenticar é gravada na sessão
      → perfil, iniciar jogo, depósito e headers passam a usar a marca DAQUELE usuário
```

O estado da marca vive em [useAuth.ts](../../app/composables/useAuth.ts)
(`brandSlug`, `baseDomain`, `apiBaseUrl`, `userCollection`), é persistido no
localStorage e restaurado por `getBrand()`. Quem consome:

- [useGame.ts](../../app/composables/useGame.ts) — iniciar jogo
- [useDeposit.ts](../../app/composables/useDeposit.ts) — depósito
- telas de login e o modal de KYC — nome e `affiliateUrl` da casa

Nenhum desses arquivos deve ter `brand_slug` ou URL fixos: tudo vem do `useAuth`.

## Marca padrão do deploy

`NUXT_PUBLIC_APP_BRAND` (via `runtimeConfig.public.appBrand`, em
[nuxt.config.ts](../../nuxt.config.ts)) define a casa **exibida antes do login**.
Slug desconhecido cai em `BRANDS[0]`.

## Adicionar uma casa nova

1. Descubra `brand_slug`, `base_domain` e `user_collection` da casa (a casa/parceiro
   informa; dá pra confirmar testando o login e vendo o `brand_slug` que volta).
2. Acrescente um item em `BRANDS` — **e só isso**. O loop do login, os headers e a
   validação já são genéricos.
3. Valide: login com conta daquela casa, perfil, iniciar jogo e depósito.

> Ordem importa: o login tenta as marcas na ordem do array e para na primeira que
> autenticar. Coloque a casa mais usada primeiro para reduzir round-trips.
