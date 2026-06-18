# Painel Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel admin em `/admin` com usuários do app, ativos em 48h, depósitos gerados e bloqueio de usuário com pop-up de suporte (WhatsApp).

**Architecture:** O app (SPA Nuxt 4) passa a reportar eventos ao Nitro server (`/api/track/*`), que grava nas collections `app_users` e `deposits` do Mongo `irmandade-hyper`. O heartbeat de sessão devolve `{ blocked }` e serve de checagem de bloqueio. Endpoints `/api/admin/*` (protegidos pela sessão HMAC existente) alimentam o dashboard `/admin`.

**Tech Stack:** Nuxt 4.2 (SPA, `ssr: false`), Nitro server routes, MongoDB (driver `mongodb` já instalado), sessão admin HMAC existente (`server/utils/adminAuth.ts`).

**Spec:** `docs/superpowers/specs/2026-06-11-painel-admin-design.md`

---

## Avisos para o executor

1. **Use PowerShell para npm/dev/build.** O Bash desta máquina mascara `node_modules` (sandbox) — `npm` parece funcionar mas o Bash não enxerga o resultado. Edição de arquivos com Edit/Write funciona normal.
2. **Servidor dev:** os passos de verificação assumem `npm run dev` rodando em **http://localhost:3000** (PowerShell, background).
3. **Sem framework de testes no projeto.** A verificação é por requisições HTTP reais com `Invoke-RestMethod` + expected output. Não instale vitest/jest.
4. **Credenciais admin (dev):** e-mail `thiagoemanoel181@gmail.com`, senha `admin123` (defaults de `server/utils/adminAuth.ts` quando não há env var).
5. **Não é repositório git** (a menos que a Task 1 seja executada). Se a Task 1 for pulada, ignore os passos de commit.

## Estrutura de arquivos

| Ação | Arquivo | Responsabilidade |
|---|---|---|
| Create | `shared/support.ts` | Link de suporte (WhatsApp) |
| Create | `server/api/track/session.post.ts` | Heartbeat: upsert app_users + retorna blocked |
| Create | `server/api/track/deposit.post.ts` | Registra PIX gerado |
| Create | `server/api/admin/stats.get.ts` | Métricas do dashboard |
| Create | `server/api/admin/users.get.ts` | Lista/busca usuários |
| Create | `server/api/admin/users/block.post.ts` | Bloqueia/desbloqueia |
| Create | `server/api/admin/deposits.get.ts` | Lista depósitos |
| Create | `app/composables/useBlocked.ts` | Estado global de bloqueio |
| Create | `app/components/BlockedModal.vue` | Pop-up de bloqueio + suporte |
| Create | `app/plugins/track-session.client.ts` | Heartbeat na abertura do app |
| Create | `app/pages/admin/index.vue` | Dashboard admin |
| Modify | `app/composables/useAuth.ts` | Heartbeat pós-login + retorno `blocked` |
| Modify | `app/pages/auth/login.vue` | Sem mensagem de erro quando bloqueado |
| Modify | `app/composables/useDeposit.ts` | Track de depósito fire-and-forget |
| Modify | `app/app.vue` | Montar `<BlockedModal />` |
| Modify | `app/pages/admin/webhook.vue` | Link para `/admin` |

---

### Task 1: Inicializar git (recomendado; pular se o usuário recusar)

O projeto tem `.gitignore` mas não é repositório. Versionar protege todo o trabalho a seguir.

- [ ] **Step 1: Inicializar e commitar o estado atual**

```powershell
git init
git add -A
git commit -m "chore: estado inicial do projeto (pre painel admin)"
```

Expected: commit criado sem erros. Se o usuário não quiser git, pule e ignore os passos de commit das tasks seguintes.

---

### Task 2: Constante de suporte

**Files:**
- Create: `shared/support.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// Link de suporte mostrado no pop-up de bloqueio.
// Troque o número abaixo pelo WhatsApp oficial do suporte (com DDI, só dígitos).
export const SUPPORT_WHATSAPP_URL = 'https://wa.me/5500000000000'
```

- [ ] **Step 2: Commit**

```powershell
git add shared/support.ts
git commit -m "feat: constante do link de suporte (WhatsApp)"
```

---

### Task 3: Endpoint de heartbeat `POST /api/track/session`

**Files:**
- Create: `server/api/track/session.post.ts`

- [ ] **Step 1: Criar o endpoint**

```ts
import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    name?: string
    phone?: string
    userId?: number
    brandSlug?: string
  }>(event)

  const email = body?.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }

  const db = await getDb()
  const col = db.collection('app_users')
  const now = new Date()

  await col.updateOne(
    { email },
    {
      $set: {
        email,
        name: body?.name || null,
        phone: body?.phone || null,
        cactus_user_id: body?.userId ?? null,
        brand_slug: body?.brandSlug || null,
        last_seen_at: now
      },
      $setOnInsert: {
        first_seen_at: now,
        blocked: false,
        blocked_at: null
      }
    },
    { upsert: true }
  )

  const user = await col.findOne({ email }, { projection: { blocked: 1 } })
  return { blocked: !!user?.blocked }
})
```

- [ ] **Step 2: Verificar com requisição real (dev server no ar)**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/track/session" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com","name":"Teste Plano","phone":"11999990000","userId":1,"brandSlug":"esportiva"}'
```

Expected: `blocked: False`

- [ ] **Step 3: Verificar validação (400 sem email)**

```powershell
try { Invoke-RestMethod -Uri "http://localhost:3000/api/track/session" -Method POST -ContentType "application/json" -Body '{}' } catch { [int]$_.Exception.Response.StatusCode }
```

Expected: `400`

- [ ] **Step 4: Commit**

```powershell
git add server/api/track/session.post.ts
git commit -m "feat: endpoint de heartbeat com upsert de app_users e checagem de bloqueio"
```

---

### Task 4: Endpoint `POST /api/track/deposit`

**Files:**
- Create: `server/api/track/deposit.post.ts`

- [ ] **Step 1: Criar o endpoint**

```ts
import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    userId?: number
    brandSlug?: string
    amount?: number
    transactionId?: string
  }>(event)

  const email = body?.email?.trim().toLowerCase()
  const amount = Number(body?.amount)

  if (!email || !email.includes('@') || !Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: 'email e amount obrigatórios' })
  }

  const db = await getDb()
  await db.collection('deposits').insertOne({
    email,
    cactus_user_id: body?.userId ?? null,
    brand_slug: body?.brandSlug || null,
    amount,
    transaction_id: body?.transactionId || null,
    status: 'generated',
    created_at: new Date()
  })

  return { success: true }
})
```

- [ ] **Step 2: Verificar com requisição real**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/track/deposit" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com","userId":1,"brandSlug":"esportiva","amount":25.5,"transactionId":"tx-teste-1"}'
```

Expected: `success: True`

- [ ] **Step 3: Verificar validação (amount inválido → 400)**

```powershell
try { Invoke-RestMethod -Uri "http://localhost:3000/api/track/deposit" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com","amount":0}' } catch { [int]$_.Exception.Response.StatusCode }
```

Expected: `400`

- [ ] **Step 4: Commit**

```powershell
git add server/api/track/deposit.post.ts
git commit -m "feat: endpoint de registro de PIX gerado"
```

---

### Task 5: Endpoints admin (stats, users, block, deposits)

**Files:**
- Create: `server/api/admin/stats.get.ts`
- Create: `server/api/admin/users.get.ts`
- Create: `server/api/admin/users/block.post.ts`
- Create: `server/api/admin/deposits.get.ts`

- [ ] **Step 1: Criar `server/api/admin/stats.get.ts`**

```ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const db = await getDb()
  const users = db.collection('app_users')
  const deposits = db.collection('deposits')

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const [totalUsers, active48h, depositsCount, sumAgg] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ last_seen_at: { $gte: cutoff } }),
    deposits.countDocuments({}),
    deposits.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray()
  ])

  return {
    totalUsers,
    active48h,
    depositsCount,
    depositsSum: sumAgg[0]?.total || 0
  }
})
```

- [ ] **Step 2: Criar `server/api/admin/users.get.ts`**

```ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const q = getQuery(event)
  const search = String(q.search || '').trim()
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))

  const filter: Record<string, any> = {}
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ email: rx }, { name: rx }, { phone: rx }]
  }

  const db = await getDb()
  const col = db.collection('app_users')

  const [users, total] = await Promise.all([
    col.find(filter).sort({ last_seen_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter)
  ])

  return { users, total }
})
```

- [ ] **Step 3: Criar `server/api/admin/users/block.post.ts`**

```ts
import { getDb } from '../../../utils/mongodb'
import { getAdminSession } from '../../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const body = await readBody<{ email?: string; blocked?: boolean }>(event)
  const email = body?.email?.trim().toLowerCase()
  const blocked = !!body?.blocked

  if (!email) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }

  const db = await getDb()
  const result = await db.collection('app_users').updateOne(
    { email },
    { $set: { blocked, blocked_at: blocked ? new Date() : null } }
  )

  if (!result.matchedCount) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  return { success: true, email, blocked }
})
```

- [ ] **Step 4: Criar `server/api/admin/deposits.get.ts`**

```ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const q = getQuery(event)
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))

  const db = await getDb()
  const col = db.collection('deposits')

  const [deposits, total] = await Promise.all([
    col.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments({})
  ])

  return { deposits, total }
})
```

- [ ] **Step 5: Verificar 401 sem sessão**

```powershell
foreach ($p in "stats","users","deposits") { try { Invoke-RestMethod -Uri "http://localhost:3000/api/admin/$p" } catch { "$p -> " + [int]$_.Exception.Response.StatusCode } }
```

Expected: `stats -> 401`, `users -> 401`, `deposits -> 401`

- [ ] **Step 6: Verificar com sessão admin (login + cookie na mesma WebSession)**

```powershell
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/login" -Method POST -ContentType "application/json" -Body '{"email":"thiagoemanoel181@gmail.com","password":"admin123"}' -WebSession $s
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/stats" -WebSession $s
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users?search=teste-plano" -WebSession $s | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users/block" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com","blocked":true}' -WebSession $s
Invoke-RestMethod -Uri "http://localhost:3000/api/track/session" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users/block" -Method POST -ContentType "application/json" -Body '{"email":"teste-plano@x.com","blocked":false}' -WebSession $s
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/deposits" -WebSession $s | ConvertTo-Json -Depth 5
```

Expected (na ordem): login `success: True`; stats com `totalUsers >= 1` e `depositsSum >= 25.5`; users contendo `teste-plano@x.com`; block `blocked: True`; **heartbeat retorna `blocked: True`**; unblock `blocked: False`; deposits contendo `tx-teste-1`.

- [ ] **Step 7: Verificar 404 ao bloquear e-mail inexistente**

```powershell
try { Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users/block" -Method POST -ContentType "application/json" -Body '{"email":"naoexiste@x.com","blocked":true}' -WebSession $s } catch { [int]$_.Exception.Response.StatusCode }
```

Expected: `404`

- [ ] **Step 8: Commit**

```powershell
git add server/api/admin/stats.get.ts server/api/admin/users.get.ts server/api/admin/users/block.post.ts server/api/admin/deposits.get.ts
git commit -m "feat: endpoints admin de stats, usuarios, bloqueio e depositos"
```

---

### Task 6: Estado de bloqueio + BlockedModal + montagem no app

**Files:**
- Create: `app/composables/useBlocked.ts`
- Create: `app/components/BlockedModal.vue`
- Modify: `app/app.vue` (template, linha ~6)

- [ ] **Step 1: Criar `app/composables/useBlocked.ts`**

```ts
// Estado global de bloqueio do usuário (setado pelo heartbeat /api/track/session)
export const useBlocked = () => {
  const isBlocked = useState('app-blocked', () => false)
  const setBlocked = (value: boolean) => {
    isBlocked.value = value
  }
  return { isBlocked, setBlocked }
}
```

- [ ] **Step 2: Criar `app/components/BlockedModal.vue`** (mesmo padrão visual do `KycModal.vue`, em vermelho)

```vue
<template>
  <Teleport to="body">
    <div v-if="isBlocked" class="blocked-modal-overlay">
      <div class="blocked-modal">
        <div class="blocked-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>

        <h2 class="blocked-title">Acesso bloqueado</h2>

        <p class="blocked-description">
          Seu acesso à <strong>Irmandade Club</strong> foi suspenso.
          Se você acredita que isso é um engano, fale com o nosso suporte.
        </p>

        <a :href="supportUrl" target="_blank" class="support-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          Falar com suporte
        </a>

        <button class="exit-button" @click="handleExit">
          Sair
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { SUPPORT_WHATSAPP_URL } from '../../shared/support'

const supportUrl = SUPPORT_WHATSAPP_URL
const { isBlocked, setBlocked } = useBlocked()
const { clearAuth } = useAuth()

const handleExit = () => {
  setBlocked(false)
  clearAuth()
  navigateTo('/auth/login')
}
</script>

<style scoped>
.blocked-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.blocked-modal {
  background: linear-gradient(145deg, #111111, #0a0a0a);
  border: 2px solid #ff4444;
  border-radius: 20px;
  padding: 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 0 50px rgba(255, 68, 68, 0.3);
}

.blocked-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ff4444;
}

.blocked-icon svg {
  width: 40px;
  height: 40px;
  color: #ff4444;
}

.blocked-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.blocked-description {
  color: #aaa;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 28px;
}

.blocked-description strong {
  color: #ff4444;
}

.support-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #25d366, #1da851);
  color: #000;
  font-weight: 700;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.support-button:hover {
  transform: translateY(-2px);
}

.support-button svg {
  width: 20px;
  height: 20px;
}

.exit-button {
  margin-top: 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #888;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exit-button:hover {
  border-color: #fff;
  color: #fff;
}

@media (max-width: 480px) {
  .blocked-modal {
    padding: 28px 20px;
  }
}
</style>
```

- [ ] **Step 3: Montar no `app/app.vue`** — trocar:

```vue
    <KycModal :show="showKycModal" @logout="handleKycLogout" />
```

por:

```vue
    <KycModal :show="showKycModal" @logout="handleKycLogout" />
    <BlockedModal />
```

- [ ] **Step 4: Verificação visual rápida** — com o dev server no ar, abrir `http://localhost:3000` e conferir no console do navegador que não há erro de import/render (o modal não aparece pois `isBlocked` inicia `false`).

- [ ] **Step 5: Commit**

```powershell
git add app/composables/useBlocked.ts app/components/BlockedModal.vue app/app.vue
git commit -m "feat: estado de bloqueio + modal de acesso bloqueado com suporte"
```

---

### Task 7: Heartbeat pós-login no `useAuth` + tratamento na tela de login

**Files:**
- Modify: `app/composables/useAuth.ts` (função `login`, no bloco de sucesso após `fetchUserProfile()`)
- Modify: `app/pages/auth/login.vue` (função `handleLogin`)

- [ ] **Step 1: Em `useAuth.ts`**, mudar a assinatura de retorno do `login` de
`Promise<{ success: boolean; message?: string }>` para
`Promise<{ success: boolean; message?: string; blocked?: boolean }>`
e, dentro do `try` de sucesso (logo após `await fetchUserProfile()` e antes do `return { success: true }`), inserir:

```ts
          // Heartbeat: registra o usuário no painel admin e checa bloqueio.
          // Fail-open: se o nosso servidor estiver fora, o login segue normal.
          try {
            const track = await $fetch<{ blocked: boolean }>('/api/track/session', {
              method: 'POST',
              body: {
                email: response.user?.email,
                name: response.user?.name,
                phone: response.user?.phone,
                userId: response.user?.id,
                brandSlug: brand.slug
              }
            })
            if (track.blocked) {
              clearAuth()
              useBlocked().setBlocked(true)
              return { success: false, blocked: true }
            }
          } catch (trackErr) {
            console.warn('track/session falhou (ignorado):', trackErr)
          }
```

- [ ] **Step 2: Em `login.vue`**, trocar o final do `handleLogin`:

```ts
  if (result.success) {
    navigateTo('/')
  } else {
    errorMessage.value = result.message || 'Erro ao fazer login'
  }
```

por:

```ts
  if (result.success) {
    navigateTo('/')
  } else if (!result.blocked) {
    // Quando bloqueado, o BlockedModal é a única comunicação — sem erro duplicado.
    errorMessage.value = result.message || 'Erro ao fazer login'
  }
```

- [ ] **Step 3: Verificar fluxo de bloqueio no login (manual, conta real)**
  1. No PowerShell, bloquear o e-mail da conta de teste (sessão `$s` da Task 5, Step 6):
     ```powershell
     Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users/block" -Method POST -ContentType "application/json" -Body '{"email":"SEU_EMAIL_DE_TESTE","blocked":true}' -WebSession $s
     ```
     (o e-mail precisa existir em `app_users` — logue uma vez antes de bloquear)
  2. Tentar logar no app → deve aparecer o **modal de bloqueio** (não a mensagem de erro) e a sessão não persiste.
  3. Desbloquear (`"blocked":false`) → login volta a funcionar.

- [ ] **Step 4: Commit**

```powershell
git add app/composables/useAuth.ts app/pages/auth/login.vue
git commit -m "feat: heartbeat pos-login com checagem de bloqueio"
```

---

### Task 8: Heartbeat na abertura do app (plugin client)

**Files:**
- Create: `app/plugins/track-session.client.ts`

- [ ] **Step 1: Criar o plugin** (roda uma vez por carga de página, antes da montagem do app)

```ts
// Heartbeat na abertura do app: atualiza last_seen_at e aplica bloqueio.
// Fail-open: falha de rede não impede o uso do app.
export default defineNuxtPlugin(() => {
  const { isAuthenticated, user, brandSlug, clearAuth } = useAuth()
  const { setBlocked } = useBlocked()

  if (!isAuthenticated.value || !user.value?.email) return

  $fetch<{ blocked: boolean }>('/api/track/session', {
    method: 'POST',
    body: {
      email: user.value.email,
      name: user.value.name,
      phone: user.value.phone,
      userId: user.value.id,
      brandSlug: brandSlug.value
    }
  }).then((res) => {
    if (res.blocked) {
      clearAuth()
      setBlocked(true)
    }
  }).catch((err) => {
    console.warn('track/session falhou (ignorado):', err)
  })
})
```

- [ ] **Step 2: Verificar** — logado no app, recarregar a página e conferir (sessão `$s`):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -WebSession $s | ConvertTo-Json -Depth 5
```

Expected: o `last_seen_at` do usuário logado avança a cada reload do app.

- [ ] **Step 3: Verificar derrubada de sessão** — com o app aberto e logado, bloquear o e-mail via PowerShell, recarregar o app → modal de bloqueio aparece e o usuário é deslogado. Desbloquear em seguida.

- [ ] **Step 4: Commit**

```powershell
git add app/plugins/track-session.client.ts
git commit -m "feat: heartbeat de abertura do app com aplicacao de bloqueio"
```

---

### Task 9: Track de depósito no `useDeposit`

**Files:**
- Modify: `app/composables/useDeposit.ts`

- [ ] **Step 1: Pegar `user` e `brandSlug` do useAuth** — trocar:

```ts
  const { token, cookieKey, fetchUserProfile, apiBaseUrl, brandSlug, baseDomain } = useAuth()
```

por:

```ts
  const { token, cookieKey, fetchUserProfile, apiBaseUrl, brandSlug, baseDomain, user } = useAuth()
```

- [ ] **Step 2: Registrar o PIX gerado** — dentro de `createDeposit`, no bloco de sucesso, trocar:

```ts
      if (response.success) {
        depositState.depositData = response
        depositState.amount = amount
        depositState.step = 'payment'
        return { success: true }
      } else {
```

por:

```ts
      if (response.success) {
        depositState.depositData = response
        depositState.amount = amount
        depositState.step = 'payment'

        // Registro no painel admin (fire-and-forget: erro não afeta o usuário)
        $fetch('/api/track/deposit', {
          method: 'POST',
          body: {
            email: user.value?.email,
            userId: user.value?.id,
            brandSlug: brandSlug.value,
            amount,
            transactionId: response.transaction_id
          }
        }).catch((err) => {
          console.warn('track/deposit falhou (ignorado):', err)
        })

        return { success: true }
      } else {
```

- [ ] **Step 3: Verificar (manual, com conta real)** — gerar um PIX pelo app (valor mínimo R$ 1) e conferir:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/deposits" -WebSession $s | ConvertTo-Json -Depth 5
```

Expected: registro novo com o e-mail do usuário, valor e `transaction_id` reais.

- [ ] **Step 4: Commit**

```powershell
git add app/composables/useDeposit.ts
git commit -m "feat: registro de PIX gerado no painel admin"
```

---

### Task 10: Dashboard `/admin`

**Files:**
- Create: `app/pages/admin/index.vue`
- Modify: `app/pages/admin/webhook.vue` (header-actions)

- [ ] **Step 1: Criar `app/pages/admin/index.vue`**

```vue
<template>
  <div class="admin-page">
    <div class="admin-shell">

      <div class="admin-header">
        <div>
          <p class="eyebrow">Painel de Admin</p>
          <h1>Dashboard</h1>
          <p class="description">
            Usuários do app, atividade nas últimas 48h e depósitos gerados.
          </p>
        </div>

        <div class="header-actions">
          <NuxtLink to="/admin/webhook" class="back-link">
            <Icon name="ph:webhooks-logo-bold" />
            Webhook
          </NuxtLink>
          <NuxtLink to="/" class="back-link">
            <Icon name="ph:arrow-left-bold" />
            Home
          </NuxtLink>
          <button class="logout-btn" @click="handleLogout">
            <Icon name="ph:sign-out-bold" />
            Sair
          </button>
        </div>
      </div>

      <!-- Cards de métricas -->
      <div class="stats-grid">
        <div class="stat-card">
          <Icon name="ph:users-bold" />
          <div>
            <p class="stat-value">{{ stats?.totalUsers ?? '—' }}</p>
            <p class="stat-label">Usuários</p>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="ph:pulse-bold" />
          <div>
            <p class="stat-value">{{ stats?.active48h ?? '—' }}</p>
            <p class="stat-label">Ativos (48h)</p>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="ph:qr-code-bold" />
          <div>
            <p class="stat-value">{{ stats?.depositsCount ?? '—' }}</p>
            <p class="stat-label">PIX gerados</p>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="ph:currency-circle-dollar-bold" />
          <div>
            <p class="stat-value">{{ stats ? formatBRL(stats.depositsSum) : '—' }}</p>
            <p class="stat-label">Valor total</p>
          </div>
        </div>
      </div>

      <!-- Usuários -->
      <div class="admin-card">
        <div class="card-header">
          <h2>Usuários</h2>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Buscar por nome, e-mail ou telefone..."
          />
        </div>

        <p v-if="usersError" class="message error-message">{{ usersError }}</p>
        <p v-else-if="!users.length && !usersLoading" class="empty-text">
          Nenhum usuário ainda. Os registros começam quando alguém loga pelo app.
        </p>

        <div v-if="users.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Marca</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.email">
                <td>{{ u.name || '—' }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.phone || '—' }}</td>
                <td><span class="brand-chip">{{ u.brand_slug || '—' }}</span></td>
                <td :title="String(u.last_seen_at)">{{ relativeTime(u.last_seen_at) }}</td>
                <td>
                  <span class="badge" :class="u.blocked ? 'badge-blocked' : 'badge-active'">
                    {{ u.blocked ? 'Bloqueado' : 'Ativo' }}
                  </span>
                </td>
                <td>
                  <button
                    class="block-btn"
                    :class="{ unblock: u.blocked }"
                    :disabled="blockingEmail === u.email"
                    @click="toggleBlock(u)"
                  >
                    {{ u.blocked ? 'Desbloquear' : 'Bloquear' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          v-if="users.length < usersTotal"
          class="load-more"
          :disabled="usersLoading"
          @click="loadMoreUsers"
        >
          Carregar mais ({{ users.length }}/{{ usersTotal }})
        </button>
      </div>

      <!-- Depósitos -->
      <div class="admin-card">
        <div class="card-header">
          <h2>Depósitos (PIX gerados)</h2>
        </div>

        <p v-if="!depositsList.length && !depositsLoading" class="empty-text">
          Nenhum depósito registrado ainda.
        </p>

        <div v-if="depositsList.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>E-mail</th>
                <th>Marca</th>
                <th>Valor</th>
                <th>Transação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in depositsList" :key="String(d._id)">
                <td :title="String(d.created_at)">{{ relativeTime(d.created_at) }}</td>
                <td>{{ d.email }}</td>
                <td><span class="brand-chip">{{ d.brand_slug || '—' }}</span></td>
                <td>{{ formatBRL(d.amount) }}</td>
                <td class="tx-id">{{ d.transaction_id || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          v-if="depositsList.length < depositsTotal"
          class="load-more"
          :disabled="depositsLoading"
          @click="loadMoreDeposits"
        >
          Carregar mais ({{ depositsList.length }}/{{ depositsTotal }})
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface AppUser {
  email: string
  name: string | null
  phone: string | null
  brand_slug: string | null
  blocked: boolean
  last_seen_at: string
}

interface DepositRow {
  _id: string
  email: string
  brand_slug: string | null
  amount: number
  transaction_id: string | null
  created_at: string
}

interface Stats {
  totalUsers: number
  active48h: number
  depositsCount: number
  depositsSum: number
}

const PAGE = 50

const stats = ref<Stats | null>(null)
const users = ref<AppUser[]>([])
const usersTotal = ref(0)
const usersLoading = ref(false)
const usersError = ref('')
const search = ref('')
const blockingEmail = ref('')

const depositsList = ref<DepositRow[]>([])
const depositsTotal = ref(0)
const depositsLoading = ref(false)

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const relativeTime = (value: string | Date) => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days}d`
  return date.toLocaleDateString('pt-BR')
}

const fetchStats = async () => {
  try {
    stats.value = await $fetch<Stats>('/api/admin/stats')
  } catch { /* card mostra — */ }
}

const fetchUsers = async (append = false) => {
  usersLoading.value = true
  usersError.value = ''
  try {
    const res = await $fetch<{ users: AppUser[]; total: number }>('/api/admin/users', {
      params: { search: search.value, skip: append ? users.value.length : 0, limit: PAGE }
    })
    users.value = append ? [...users.value, ...res.users] : res.users
    usersTotal.value = res.total
  } catch (err: any) {
    usersError.value = err?.data?.message || 'Erro ao carregar usuários'
  } finally {
    usersLoading.value = false
  }
}

const fetchDeposits = async (append = false) => {
  depositsLoading.value = true
  try {
    const res = await $fetch<{ deposits: DepositRow[]; total: number }>('/api/admin/deposits', {
      params: { skip: append ? depositsList.value.length : 0, limit: PAGE }
    })
    depositsList.value = append ? [...depositsList.value, ...res.deposits] : res.deposits
    depositsTotal.value = res.total
  } finally {
    depositsLoading.value = false
  }
}

const loadMoreUsers = () => fetchUsers(true)
const loadMoreDeposits = () => fetchDeposits(true)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchUsers(false), 300)
})

const toggleBlock = async (u: AppUser) => {
  const action = u.blocked ? 'desbloquear' : 'bloquear'
  if (!confirm(`Tem certeza que deseja ${action} ${u.email}?`)) return

  blockingEmail.value = u.email
  try {
    const res = await $fetch<{ blocked: boolean }>('/api/admin/users/block', {
      method: 'POST',
      body: { email: u.email, blocked: !u.blocked }
    })
    u.blocked = res.blocked
  } catch (err: any) {
    alert(err?.data?.message || 'Erro ao alterar bloqueio')
  } finally {
    blockingEmail.value = ''
  }
}

const handleLogout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
  navigateTo('/admin/login')
}

onMounted(() => {
  fetchStats()
  fetchUsers()
  fetchDeposits()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #000;
  padding: 32px 20px;
}

.admin-shell {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.eyebrow {
  color: #00ccff;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.admin-header h1 {
  color: #fff;
  font-size: 28px;
  margin-bottom: 6px;
}

.description {
  color: #888;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.back-link,
.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid #333;
  background: #111;
  color: #ccc;
  transition: all 0.2s ease;
}

.back-link:hover,
.logout-btn:hover {
  border-color: #00ccff;
  color: #00ccff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #111;
  border: 1px solid #222;
  border-radius: 14px;
  padding: 20px;
}

.stat-card :deep(svg) {
  font-size: 30px;
  color: #00ccff;
  flex-shrink: 0;
}

.stat-value {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  color: #888;
  font-size: 13px;
}

.admin-card {
  background: #111;
  border: 1px solid #222;
  border-radius: 14px;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.card-header h2 {
  color: #fff;
  font-size: 18px;
}

.search-input {
  flex: 1;
  max-width: 360px;
  padding: 10px 14px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #00ccff;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  color: #888;
  font-weight: 600;
  padding: 10px 12px;
  border-bottom: 1px solid #222;
  white-space: nowrap;
}

td {
  color: #ddd;
  padding: 12px;
  border-bottom: 1px solid #1a1a1a;
  white-space: nowrap;
}

.brand-chip {
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid rgba(0, 204, 255, 0.3);
  color: #00ccff;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
}

.badge {
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-active {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.badge-blocked {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.block-btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid rgba(239, 68, 68, 0.5);
  background: transparent;
  color: #ef4444;
  transition: all 0.2s ease;
}

.block-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
}

.block-btn.unblock {
  border-color: rgba(34, 197, 94, 0.5);
  color: #22c55e;
}

.block-btn.unblock:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.12);
}

.block-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-more {
  margin-top: 16px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
}

.load-more:hover:not(:disabled) {
  border-color: #00ccff;
  color: #00ccff;
}

.empty-text {
  color: #666;
  font-size: 14px;
  padding: 12px 0;
}

.message.error-message {
  color: #ef4444;
  font-size: 14px;
}

.tx-id {
  font-family: monospace;
  font-size: 12px;
  color: #888;
}
</style>
```

- [ ] **Step 2: Link no `webhook.vue`** — no bloco `header-actions` (linha ~15), antes do link Home, adicionar:

```vue
          <NuxtLink to="/admin" class="back-link">
            <Icon name="ph:gauge-bold" />
            Dashboard
          </NuxtLink>
```

- [ ] **Step 3: Verificar no navegador**
  1. `http://localhost:3000/admin` sem sessão → redireciona para `/admin/login`.
  2. Logar (`thiagoemanoel181@gmail.com` / `admin123`) → dashboard carrega: 4 cards com números, tabela de usuários (com `teste-plano@x.com` das tasks anteriores), tabela de depósitos (com `tx-teste-1`).
  3. Buscar "teste-plano" → tabela filtra.
  4. Bloquear `teste-plano@x.com` → badge vira "Bloqueado"; desbloquear → volta.

- [ ] **Step 4: Commit**

```powershell
git add app/pages/admin/index.vue app/pages/admin/webhook.vue
git commit -m "feat: dashboard admin com metricas, usuarios e depositos"
```

---

### Task 11: Build de produção + verificação final

- [ ] **Step 1: Build (PowerShell)**

```powershell
npm run build
```

Expected: `✓ Client built`, `Nuxt Nitro server built`, exit 0.

- [ ] **Step 2: Checklist final (dev server)** — roteiro da seção 8 da spec:
  1. Logar com conta real → usuário aparece em `/admin` com nome/telefone/marca.
  2. Recarregar o app → "último acesso" atualiza; card "Ativos (48h)" conta o usuário.
  3. Gerar PIX de R$ 1 → aparece na tabela de depósitos e soma no card.
  4. Bloquear o usuário no painel → recarregar o app → pop-up de bloqueio com botão WhatsApp; "Sair" leva ao login. Desbloquear → volta ao normal.
  5. `Invoke-RestMethod http://localhost:3000/api/admin/stats` (sem WebSession) → 401.

- [ ] **Step 3: Limpar dados de teste do Mongo** — remover `teste-plano@x.com` e o depósito `tx-teste-1` (uma vez validado tudo):

```powershell
node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient(process.env.MONGODB_URI||'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/');await c.connect();const db=c.db('irmandade-hyper');console.log('users:',(await db.collection('app_users').deleteMany({email:'teste-plano@x.com'})).deletedCount);console.log('deposits:',(await db.collection('deposits').deleteMany({email:'teste-plano@x.com'})).deletedCount);await c.close()})()"
```

Expected: `users: 1`, `deposits: 1` (ou mais, se os steps de verificação rodaram mais vezes).

- [ ] **Step 4: Commit final**

```powershell
git add -A
git commit -m "chore: painel admin completo e verificado"
```
