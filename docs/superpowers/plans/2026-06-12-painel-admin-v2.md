# Painel Admin v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tags de risco de churn (24h/48h sem PIX para assinantes pagos), métricas de conversão, gráfico de atividade 14 dias e filtros server-side no painel admin.

**Architecture:** Agregação no MongoDB (`$lookup` de `subscriptions` e `deposits` sobre `app_users`) com estágios compartilhados num util; endpoint novo `/api/admin/activity`; frontend em página única com gráfico SVG artesanal (componente separado) e filtros em chips que refazem a query.

**Tech Stack:** Nuxt 4 / Nitro, MongoDB driver nativo, Vue 3 `<script setup>`, CSS scoped artesanal (sem framework UI, sem lib de gráfico).

**Testes:** O projeto não tem framework de teste (decisão existente do codebase). Verificação por task = `curl` autenticado contra o dev server + checagem visual. Login: `POST /api/admin/login` com credenciais do `.env` (`ADMIN_ALLOWED_EMAILS`/`ADMIN_PASSWORD`), cookie em jar.

**Spec:** `docs/superpowers/specs/2026-06-12-painel-admin-v2-design.md`

**Atenção:** `app/pages/admin/index.vue` e `app/composables/useAuth.ts` têm modificações não commitadas pré-existentes do usuário. Trabalhar sobre a working tree; nos commits das tasks de frontend, commitar apenas os arquivos da task (não arrastar `useAuth.ts`).

---

### Task 1: Util de enriquecimento + `/api/admin/users` com agregação e filtros

**Files:**
- Create: `server/utils/adminUserEnrichment.ts`
- Modify: `server/api/admin/users.get.ts` (reescrita completa)

- [ ] **Step 1: Criar o util com os estágios compartilhados**

```ts
// server/utils/adminUserEnrichment.ts
import type { Document } from 'mongodb'

export const HOUR_MS = 60 * 60 * 1000

// Estágios de $lookup + campos derivados (assinatura, depósitos e tag de risco)
// compartilhados entre /api/admin/users e /api/admin/stats.
//
// Regra da tag (spec 2026-06-12): elegível se assinatura ativa E first_seen_at
// posterior à ativação da assinatura E zero PIX gerados. Aí:
//   first_seen_at <= now-48h  -> 'risk_48h'
//   first_seen_at <= now-24h  -> 'risk_24h'
export const buildUserEnrichmentStages = (now = new Date()): Document[] => {
  const cutoff24 = new Date(now.getTime() - 24 * HOUR_MS)
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)

  return [
    { $lookup: { from: 'subscriptions', localField: 'email', foreignField: 'email', as: 'sub' } },
    { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
    {
      $addFields: {
        subscription: {
          $cond: [{ $eq: [{ $arrayElemAt: ['$sub.status', 0] }, 'active'] }, 'paid', 'free']
        },
        sub_created_at: { $arrayElemAt: ['$sub.created_at', 0] },
        deposits_count: { $size: '$deps' },
        deposits_sum: { $sum: '$deps.amount' }
      }
    },
    {
      $addFields: {
        // $gt contra null usa a ordem de tipos do BSON: qualquer Date > null,
        // então isso cobre "campo existe e não é null".
        risk_eligible: {
          $and: [
            { $eq: ['$subscription', 'paid'] },
            { $gt: ['$first_seen_at', null] },
            { $gt: ['$sub_created_at', null] },
            { $gte: ['$first_seen_at', '$sub_created_at'] },
            { $eq: ['$deposits_count', 0] }
          ]
        }
      }
    },
    {
      $addFields: {
        risk_tag: {
          $switch: {
            branches: [
              { case: { $and: ['$risk_eligible', { $lte: ['$first_seen_at', cutoff48] }] }, then: 'risk_48h' },
              { case: { $and: ['$risk_eligible', { $lte: ['$first_seen_at', cutoff24] }] }, then: 'risk_24h' }
            ],
            default: null
          }
        }
      }
    },
    { $project: { sub: 0, deps: 0, risk_eligible: 0 } }
  ]
}
```

- [ ] **Step 2: Reescrever `users.get.ts` com pipeline + filtros**

```ts
// server/api/admin/users.get.ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'
import { buildUserEnrichmentStages } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const q = getQuery(event)
  const search = String(q.search || '').trim()
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))
  const risk = String(q.risk || '')                 // '24h' | '48h' | 'any'
  const subscription = String(q.subscription || '') // 'paid' | 'free'
  const status = String(q.status || '')             // 'active' | 'blocked'
  const brand = String(q.brand || '').trim()

  // filtros que rodam direto sobre app_users (antes dos $lookup)
  const match: Record<string, any> = {}
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [{ email: rx }, { name: rx }, { phone: rx }]
  }
  if (status === 'active') match.blocked = { $ne: true }
  if (status === 'blocked') match.blocked = true
  if (brand) match.brand_slug = brand

  // filtros que dependem dos campos derivados (depois do enriquecimento)
  const post: Record<string, any> = {}
  if (subscription === 'paid' || subscription === 'free') post.subscription = subscription
  if (risk === '24h') post.risk_tag = 'risk_24h'
  if (risk === '48h') post.risk_tag = 'risk_48h'
  if (risk === 'any') post.risk_tag = { $ne: null }

  const pipeline: any[] = [
    { $match: match },
    ...buildUserEnrichmentStages(),
    ...(Object.keys(post).length ? [{ $match: post }] : []),
    { $sort: { last_seen_at: -1 } },
    {
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }]
      }
    }
  ]

  const db = await getDb()
  const col = db.collection('app_users')

  const [aggRes, brands] = await Promise.all([
    col.aggregate(pipeline).toArray(),
    col.distinct('brand_slug', { brand_slug: { $nin: [null, ''] } })
  ])

  const res = aggRes[0]
  return {
    users: res?.rows || [],
    total: res?.meta?.[0]?.total || 0,
    brands: (brands as string[]).sort()
  }
})
```

- [ ] **Step 3: Verificar com curl (dev server já rodando em :3000)**

```bash
cd /c/Users/Thiago/Desktop/irmandade
EMAIL=$(grep -oP '^ADMIN_ALLOWED_EMAILS=\K[^,]+' .env || grep -oP '^ADMIN_EMAIL=\K.+' .env)
PASS=$(grep -oP '^ADMIN_PASSWORD=\K.+' .env)
curl -s -c /tmp/adm.jar -X POST localhost:3000/api/admin/login \
  -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
curl -s -b /tmp/adm.jar 'localhost:3000/api/admin/users?limit=3' | head -c 2000
curl -s -b /tmp/adm.jar 'localhost:3000/api/admin/users?risk=any&limit=3'
curl -s -b /tmp/adm.jar 'localhost:3000/api/admin/users?subscription=paid&status=active&limit=3'
```

Expected: login `{"success":true,...}`; users com campos `subscription`, `deposits_count`, `deposits_sum`, `risk_tag`, `first_seen_at`, mais `brands` no envelope; filtros reduzem `total` de forma coerente; sem 500.

- [ ] **Step 4: Commit**

```bash
git add server/utils/adminUserEnrichment.ts server/api/admin/users.get.ts
git commit -m "feat: usuarios admin com assinatura, depositos e tag de risco via agregacao"
```

---

### Task 2: `/api/admin/stats` com métricas novas

**Files:**
- Modify: `server/api/admin/stats.get.ts` (reescrita completa)

- [ ] **Step 1: Reescrever `stats.get.ts`**

```ts
// server/api/admin/stats.get.ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'
import { buildUserEnrichmentStages, HOUR_MS } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const db = await getDb()
  const users = db.collection('app_users')
  const deposits = db.collection('deposits')
  const subscriptions = db.collection('subscriptions')

  const now = new Date()
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)
  const cutoff7d = new Date(now.getTime() - 7 * 24 * HOUR_MS)
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const [totalUsers, active48h, depositsCount, sumAgg, newToday, new7d, atRiskAgg, convAgg] =
    await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ last_seen_at: { $gte: cutoff48 } }),
      deposits.countDocuments({}),
      deposits.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
      users.countDocuments({ first_seen_at: { $gte: startOfDay } }),
      users.countDocuments({ first_seen_at: { $gte: cutoff7d } }),
      users.aggregate([
        ...buildUserEnrichmentStages(now),
        { $match: { risk_tag: { $ne: null } } },
        { $count: 'n' }
      ]).toArray(),
      subscriptions.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $gt: [{ $size: '$deps' }, 0] }, 1, 0] } }
          }
        }
      ]).toArray()
    ])

  const depositsSum = sumAgg[0]?.total || 0
  const conv = convAgg[0]

  return {
    totalUsers,
    active48h,
    depositsCount,
    depositsSum,
    newToday,
    new7d,
    avgTicket: depositsCount ? depositsSum / depositsCount : 0,
    atRisk: atRiskAgg[0]?.n || 0,
    conversionRate: conv?.total ? (conv.converted / conv.total) * 100 : 0
  }
})
```

- [ ] **Step 2: Verificar com curl**

```bash
curl -s -b /tmp/adm.jar localhost:3000/api/admin/stats
```

Expected: JSON com os 4 campos antigos + `newToday`, `new7d`, `avgTicket`, `atRisk`, `conversionRate` (número 0–100). Sem 500.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/stats.get.ts
git commit -m "feat: stats admin com conversao, novos usuarios, ticket medio e em risco"
```

---

### Task 3: `/api/admin/activity` (novo endpoint)

**Files:**
- Create: `server/api/admin/activity.get.ts`

- [ ] **Step 1: Criar o endpoint**

```ts
// server/api/admin/activity.get.ts
import { getDb } from '../../utils/mongodb'
import { getAdminSession } from '../../utils/adminAuth'
import { HOUR_MS } from '../../utils/adminUserEnrichment'

const TZ = 'America/Sao_Paulo'
const DAYS = 14

export default defineEventHandler(async (event) => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }

  const db = await getDb()
  const since = new Date(Date.now() - DAYS * 24 * HOUR_MS)

  const [userAgg, depAgg] = await Promise.all([
    db.collection('app_users').aggregate([
      { $match: { first_seen_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$first_seen_at', timezone: TZ } },
          n: { $sum: 1 }
        }
      }
    ]).toArray(),
    db.collection('deposits').aggregate([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: TZ } },
          n: { $sum: 1 },
          sum: { $sum: '$amount' }
        }
      }
    ]).toArray()
  ])

  const usersByDay = new Map(userAgg.map(d => [d._id as string, d.n as number]))
  const depsByDay = new Map(depAgg.map(d => [d._id as string, d]))

  // série contínua dos últimos 14 dias (datas no fuso de SP; en-CA = YYYY-MM-DD)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const days: Array<{ date: string; newUsers: number; pixCount: number; pixSum: number }> = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = fmt.format(new Date(Date.now() - i * 24 * HOUR_MS))
    const dep = depsByDay.get(date)
    days.push({
      date,
      newUsers: usersByDay.get(date) || 0,
      pixCount: dep?.n || 0,
      pixSum: dep?.sum || 0
    })
  }

  return { days }
})
```

- [ ] **Step 2: Verificar com curl**

```bash
curl -s -b /tmp/adm.jar localhost:3000/api/admin/activity
curl -s localhost:3000/api/admin/activity   # sem cookie
```

Expected: com cookie → `{"days":[...]}` com exatamente 14 itens, datas contínuas terminando hoje; sem cookie → 401.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/activity.get.ts
git commit -m "feat: endpoint de atividade diaria (novos usuarios e PIX) para o admin"
```

---

### Task 4: Componente `ActivityChart.vue` (gráfico SVG)

**Files:**
- Create: `app/components/admin/ActivityChart.vue`

- [ ] **Step 1: Criar o componente completo**

```vue
<!-- app/components/admin/ActivityChart.vue -->
<template>
  <section class="admin-card chart-card">
    <div class="card-header">
      <div class="card-title">
        <h2>Atividade</h2>
        <span class="subtitle-tag">últimos 14 dias</span>
      </div>
      <div class="chart-toggle">
        <button :class="{ active: mode === 'users' }" @click="mode = 'users'">Novos usuários</button>
        <button :class="{ active: mode === 'pix' }" @click="mode = 'pix'">PIX gerados</button>
      </div>
    </div>

    <p v-if="error" class="state-msg error">{{ error }}</p>

    <div v-else-if="loading" class="chart-skeleton">
      <span v-for="n in 14" :key="n" class="skeleton bar-skel" :style="{ height: (20 + (n * 37) % 60) + '%' }" />
    </div>

    <div v-else class="chart-area">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart-svg">
        <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="(H - PAD_B) * g / 4" :y2="(H - PAD_B) * g / 4" class="gridline" />
        <g v-for="(d, i) in days" :key="d.date">
          <rect
            :x="i * slot + gap / 2"
            :y="barY(value(d))"
            :width="slot - gap"
            :height="barH(value(d))"
            rx="3"
            class="bar"
            :class="{ hover: hoverIdx === i }"
            @mouseenter="hoverIdx = i"
            @mouseleave="hoverIdx = -1"
          />
        </g>
      </svg>
      <div class="chart-labels">
        <span v-for="(d, i) in days" :key="d.date" class="chart-label">
          {{ i % 2 === 0 ? shortDate(d.date) : '' }}
        </span>
      </div>
      <div v-if="hoverIdx >= 0" class="chart-tooltip" :style="tooltipStyle">
        <strong>{{ shortDate(days[hoverIdx].date) }}</strong>
        <span v-if="mode === 'users'">{{ days[hoverIdx].newUsers }} novo(s) usuário(s)</span>
        <template v-else>
          <span>{{ days[hoverIdx].pixCount }} PIX</span>
          <span class="tt-sum">{{ formatBRL(days[hoverIdx].pixSum) }}</span>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface DayPoint { date: string; newUsers: number; pixCount: number; pixSum: number }

const props = defineProps<{ days: DayPoint[]; loading: boolean; error: string }>()

const mode = ref<'users' | 'pix'>('users')
const hoverIdx = ref(-1)

const W = 700
const H = 220
const PAD_B = 6
const slot = computed(() => W / Math.max(1, props.days.length))
const gap = 10

const value = (d: DayPoint) => (mode.value === 'users' ? d.newUsers : d.pixCount)
const maxVal = computed(() => Math.max(1, ...props.days.map(value)))
const barH = (v: number) => Math.max(v > 0 ? 4 : 2, (v / maxVal.value) * (H - PAD_B - 14))
const barY = (v: number) => H - PAD_B - barH(v)

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const tooltipStyle = computed(() => {
  const pct = ((hoverIdx.value + 0.5) / Math.max(1, props.days.length)) * 100
  return { left: `clamp(60px, ${pct}%, calc(100% - 70px))` }
})

watch(mode, () => { hoverIdx.value = -1 })
</script>

<style scoped>
.admin-card {
  background: #101010;
  border: 1px solid #1f1f1f;
  border-radius: 16px;
  padding: 22px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title h2 {
  font-size: 17px;
  font-weight: 700;
}

.subtitle-tag {
  font-size: 12px;
  color: #777;
}

.chart-toggle {
  display: flex;
  gap: 6px;
  background: #161616;
  border: 1px solid #242424;
  border-radius: 10px;
  padding: 4px;
}

.chart-toggle button {
  border: none;
  background: transparent;
  color: #999;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 13px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s;
}

.chart-toggle button.active {
  background: rgba(0, 204, 255, 0.12);
  color: #00ccff;
}

.chart-area {
  position: relative;
}

.chart-svg {
  width: 100%;
  height: 220px;
  display: block;
}

.gridline {
  stroke: #1c1c1c;
  stroke-width: 1;
}

.bar {
  fill: rgba(0, 204, 255, 0.35);
  stroke: rgba(0, 204, 255, 0.55);
  stroke-width: 1;
  transition: fill 0.15s;
  cursor: pointer;
}

.bar.hover {
  fill: rgba(0, 204, 255, 0.75);
}

.chart-labels {
  display: flex;
  margin-top: 6px;
}

.chart-label {
  flex: 1;
  text-align: center;
  font-size: 10.5px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.chart-tooltip {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
  background: #1c1c1c;
  border: 1px solid #2e2e2e;
  border-radius: 9px;
  padding: 7px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #ddd;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.chart-tooltip strong {
  color: #fff;
  font-size: 11px;
}

.tt-sum {
  color: #f5c542;
  font-weight: 700;
}

.chart-skeleton {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 220px;
}

.bar-skel {
  flex: 1;
  border-radius: 4px 4px 0 0;
}

.skeleton {
  display: block;
  background: linear-gradient(90deg, #1a1a1a 25%, #242424 37%, #1a1a1a 63%);
  background-size: 400% 100%;
  animation: shimmer 1.3s ease infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.state-msg.error {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  padding: 18px 4px;
  color: #ef4444;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/admin/ActivityChart.vue
git commit -m "feat: componente de grafico de atividade em SVG para o admin"
```

(Verificação visual acontece na Task 5, quando o componente é montado na página.)

---

### Task 5: `index.vue` — script: tipos, filtros, fetches novos

**Files:**
- Modify: `app/pages/admin/index.vue` (bloco `<script setup>`)

- [ ] **Step 1: Atualizar interfaces e estado**

Substituir as interfaces `AppUser` e `Stats` por:

```ts
interface AppUser {
  email: string
  name: string | null
  phone: string | null
  brand_slug: string | null
  blocked: boolean
  last_seen_at: string
  first_seen_at: string | null
  subscription: 'paid' | 'free'
  deposits_count: number
  deposits_sum: number
  risk_tag: 'risk_24h' | 'risk_48h' | null
}

interface Stats {
  totalUsers: number
  active48h: number
  depositsCount: number
  depositsSum: number
  newToday: number
  new7d: number
  avgTicket: number
  atRisk: number
  conversionRate: number
}

interface DayPoint { date: string; newUsers: number; pixCount: number; pixSum: number }
```

Logo após `const search = ref('')`, adicionar o estado dos filtros e da atividade:

```ts
// filtros server-side da tabela de usuários
const riskFilter = ref<'' | '24h' | '48h' | 'any'>('')
const subFilter = ref<'' | 'paid' | 'free'>('')
const statusFilter = ref<'' | 'active' | 'blocked'>('')
const brandFilter = ref('')
const brands = ref<string[]>([])

const activityDays = ref<DayPoint[]>([])
const activityLoading = ref(true)
const activityError = ref('')
```

- [ ] **Step 2: Atualizar `fetchUsers` para enviar filtros e receber `brands`**

```ts
const fetchUsers = async (append = false) => {
  usersLoading.value = true
  usersError.value = ''
  try {
    const res = await $fetch<{ users: AppUser[]; total: number; brands: string[] }>('/api/admin/users', {
      params: {
        search: search.value,
        risk: riskFilter.value,
        subscription: subFilter.value,
        status: statusFilter.value,
        brand: brandFilter.value,
        skip: append ? users.value.length : 0,
        limit: PAGE
      }
    })
    users.value = append ? [...users.value, ...res.users] : res.users
    usersTotal.value = res.total
    brands.value = res.brands
  } catch (err: any) {
    usersError.value = err?.data?.message || 'Erro ao carregar usuários'
  } finally {
    usersLoading.value = false
  }
}
```

- [ ] **Step 3: Adicionar `fetchActivity`, watch dos filtros e helpers**

Depois de `fetchDeposits`, adicionar:

```ts
const fetchActivity = async () => {
  activityLoading.value = true
  activityError.value = ''
  try {
    const res = await $fetch<{ days: DayPoint[] }>('/api/admin/activity')
    activityDays.value = res.days
  } catch (err: any) {
    activityError.value = err?.data?.message || 'Erro ao carregar atividade'
  } finally {
    activityLoading.value = false
  }
}

// qualquer filtro refaz a query do zero (sem debounce — são cliques)
watch([riskFilter, subFilter, statusFilter, brandFilter], () => fetchUsers(false))

const hasFilters = computed(() =>
  !!(riskFilter.value || subFilter.value || statusFilter.value || brandFilter.value || search.value)
)

const clearFilters = () => {
  riskFilter.value = ''
  subFilter.value = ''
  statusFilter.value = ''
  brandFilter.value = ''
  search.value = ''
}

const usersSection = ref<HTMLElement | null>(null)
const focusRisk = () => {
  riskFilter.value = 'any'
  usersSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const riskLabel = (tag: AppUser['risk_tag']) =>
  tag === 'risk_48h' ? '48h+ sem depósito' : tag === 'risk_24h' ? '24h sem depósito' : ''

const formatPct = (v: number) => `${(v || 0).toFixed(1).replace('.', ',')}%`
```

- [ ] **Step 4: Incluir atividade no `refreshAll` e no `onMounted`**

```ts
const refreshAll = async () => {
  refreshing.value = true
  await Promise.all([fetchStats(), fetchUsers(false), fetchDeposits(false), fetchActivity()])
  refreshing.value = false
}
```

```ts
onMounted(() => {
  fetchStats()
  fetchUsers()
  fetchDeposits()
  fetchActivity()
})
```

(O `onMounted` do listener de teclado já existe separado — manter.)

- [ ] **Step 5: Verificar que a página ainda compila**

Com o dev server rodando, abrir `localhost:3000/admin` (logado) e conferir no log do dev server que não há erro de compilação Vue/TS.

- [ ] **Step 6: Commit** (junto com a Task 6 — template depende deste script)

---

### Task 6: `index.vue` — template: cards novos, gráfico, chips de filtro, colunas

**Files:**
- Modify: `app/pages/admin/index.vue` (template)

- [ ] **Step 1: Segunda linha de cards após a `stats-grid` atual**

Inserir logo após o `</div>` da `stats-grid` existente:

```html
<div class="stats-grid">
  <div class="stat-card accent-cyan">
    <div class="stat-icon"><Icon name="ph:chart-pie-slice-bold" /></div>
    <div class="stat-body">
      <span v-if="!stats" class="skeleton skeleton-num" />
      <p v-else class="stat-value">{{ formatPct(stats.conversionRate) }}</p>
      <p class="stat-label">Conversão de assinantes</p>
    </div>
  </div>
  <div class="stat-card accent-green">
    <div class="stat-icon"><Icon name="ph:user-plus-bold" /></div>
    <div class="stat-body">
      <span v-if="!stats" class="skeleton skeleton-num" />
      <p v-else class="stat-value">{{ stats.new7d }}</p>
      <p class="stat-label">Novos (7d) · {{ stats?.newToday ?? 0 }} hoje</p>
    </div>
  </div>
  <div class="stat-card accent-gold">
    <div class="stat-icon"><Icon name="ph:coins-bold" /></div>
    <div class="stat-body">
      <span v-if="!stats" class="skeleton skeleton-num" />
      <p v-else class="stat-value">{{ formatBRL(stats.avgTicket) }}</p>
      <p class="stat-label">Ticket médio</p>
    </div>
  </div>
  <button class="stat-card accent-red stat-clickable" :disabled="!stats" @click="focusRisk">
    <div class="stat-icon"><Icon name="ph:warning-bold" /></div>
    <div class="stat-body">
      <span v-if="!stats" class="skeleton skeleton-num" />
      <p v-else class="stat-value" :class="{ 'pulse-red': stats.atRisk > 0 }">{{ stats.atRisk }}</p>
      <p class="stat-label">Em risco · clique p/ filtrar</p>
    </div>
  </button>
</div>

<AdminActivityChart :days="activityDays" :loading="activityLoading" :error="activityError" />
```

- [ ] **Step 2: Chips de filtro na seção Usuários**

Adicionar `ref="usersSection"` na `<section class="admin-card">` de usuários. Abaixo do `card-header`, inserir:

```html
<div class="filter-bar">
  <span class="filter-group-label">Risco:</span>
  <button class="chip chip-amber" :class="{ on: riskFilter === '24h' }"
    @click="riskFilter = riskFilter === '24h' ? '' : '24h'">⚠ 24h</button>
  <button class="chip chip-red" :class="{ on: riskFilter === '48h' }"
    @click="riskFilter = riskFilter === '48h' ? '' : '48h'">48h+</button>
  <button class="chip chip-red" :class="{ on: riskFilter === 'any' }"
    @click="riskFilter = riskFilter === 'any' ? '' : 'any'">Todos em risco</button>

  <span class="filter-sep" />
  <button class="chip" :class="{ on: subFilter === 'paid' }"
    @click="subFilter = subFilter === 'paid' ? '' : 'paid'">Pago</button>
  <button class="chip" :class="{ on: subFilter === 'free' }"
    @click="subFilter = subFilter === 'free' ? '' : 'free'">Free</button>

  <span class="filter-sep" />
  <button class="chip" :class="{ on: statusFilter === 'active' }"
    @click="statusFilter = statusFilter === 'active' ? '' : 'active'">Ativos</button>
  <button class="chip" :class="{ on: statusFilter === 'blocked' }"
    @click="statusFilter = statusFilter === 'blocked' ? '' : 'blocked'">Bloqueados</button>

  <template v-if="brands.length">
    <span class="filter-sep" />
    <select v-model="brandFilter" class="brand-select">
      <option value="">Todas as marcas</option>
      <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
    </select>
  </template>

  <button v-if="hasFilters" class="chip chip-clear" @click="clearFilters">
    <Icon name="ph:x-bold" /> Limpar
  </button>
</div>
```

Mensagem de vazio com filtros — trocar o `state-msg empty` de usuários por:

```html
<p v-else-if="!users.length" class="state-msg empty">
  <Icon name="ph:user-circle-dashed-bold" />
  {{ hasFilters ? 'Nenhum usuário com esse filtro.' : 'Nenhum usuário ainda. Os registros começam quando alguém loga pelo app.' }}
</p>
```

- [ ] **Step 3: Colunas novas na tabela de usuários**

Cabeçalho passa a ser:

```html
<tr>
  <th>Usuário</th>
  <th>Assinatura</th>
  <th>PIX</th>
  <th>Marca</th>
  <th>1º acesso</th>
  <th>Último acesso</th>
  <th>Status</th>
  <th class="col-action"></th>
</tr>
```

Na célula Usuário, tag de risco junto ao nome (dentro de `.user-meta`, após `.user-name`):

```html
<span class="user-name">
  {{ u.name || 'Sem nome' }}
  <span v-if="u.risk_tag" class="risk-chip" :class="u.risk_tag === 'risk_48h' ? 'risk-48' : 'risk-24'">
    <Icon name="ph:warning-bold" /> {{ riskLabel(u.risk_tag) }}
  </span>
</span>
```

Linhas novas (substituir a célula Telefone — telefone vira subtítulo do email pra não estourar a largura; remover `<th>Telefone</th>` e a `<td>` correspondente):

```html
<td data-label="Assinatura">
  <span class="sub-chip" :class="u.subscription === 'paid' ? 'sub-paid' : 'sub-free'">
    {{ u.subscription === 'paid' ? 'Pago' : 'Free' }}
  </span>
</td>
<td data-label="PIX">
  <div class="pix-cell">
    <span class="pix-count">{{ u.deposits_count }}</span>
    <span v-if="u.deposits_count" class="pix-sum">{{ formatBRL(u.deposits_sum) }}</span>
  </div>
</td>
<td data-label="1º acesso" :title="String(u.first_seen_at || '')">
  {{ u.first_seen_at ? relativeTime(u.first_seen_at) : '—' }}
</td>
```

E no `.user-meta`, mostrar o telefone discreto sob o email quando existir:

```html
<span class="user-email">{{ u.email }}<template v-if="u.phone"> · {{ u.phone }}</template></span>
```

- [ ] **Step 4: CSS novo (acrescentar ao final do `<style scoped>`)**

```css
/* ---------- v2: cards extras ---------- */
.accent-cyan .stat-icon { background: rgba(34, 211, 238, 0.12); color: #22d3ee; }
.accent-red .stat-icon { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.stat-clickable {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.stat-clickable:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.5);
}

.pulse-red { color: #ef4444; }

/* ---------- v2: filtros ---------- */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-group-label {
  font-size: 12px;
  color: #777;
  font-weight: 600;
}

.filter-sep {
  width: 1px;
  height: 18px;
  background: #262626;
  margin: 0 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #2a2a2a;
  background: #161616;
  color: #aaa;
  transition: all 0.16s;
}

.chip:hover { border-color: #3a3a3a; color: #ddd; }

.chip.on {
  border-color: rgba(0, 204, 255, 0.5);
  background: rgba(0, 204, 255, 0.1);
  color: #00ccff;
}

.chip-amber.on {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.chip-red.on {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.chip-clear { border-style: dashed; }

.brand-select {
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 999px;
  color: #aaa;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
  outline: none;
}

.brand-select:focus { border-color: #00ccff; }

/* ---------- v2: tags de risco ---------- */
.risk-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
  white-space: nowrap;
}

.risk-chip :deep(svg) { font-size: 11px; }

.risk-24 {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}

.risk-48 {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

/* ---------- v2: células novas ---------- */
.sub-chip {
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
}

.sub-paid {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.sub-free {
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #94a3b8;
}

.pix-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.pix-count { font-weight: 700; color: #fff; }

.pix-sum {
  font-size: 12px;
  color: #f5c542;
}
```

- [ ] **Step 5: Verificar visualmente**

Abrir `localhost:3000/admin`: duas linhas de cards, gráfico com toggle, chips filtram a tabela (conferir no Network que a query vai com `risk=`/`subscription=`...), tags aparecem nos usuários em risco, card "Em risco" clica e filtra. Testar largura mobile (DevTools) — tabela vira cards com `data-label`.

- [ ] **Step 6: Commit (Tasks 5+6 juntas)**

```bash
git add app/pages/admin/index.vue app/components/admin/ActivityChart.vue
git commit -m "feat: painel admin v2 - tags de risco, metricas, grafico e filtros"
```

---

### Task 7: Verificação final

- [ ] **Step 1: Fluxo completo via curl** — login, users com cada filtro, stats, activity (comandos das Tasks 1–3). Sem 500, shapes corretos.
- [ ] **Step 2: Checagem visual final** — desktop + mobile, estados de loading (recarregar com cache desabilitado), busca + filtro combinados, bloquear/desbloquear continua funcionando.
- [ ] **Step 3:** `npx nuxt build` para garantir que o build de produção passa.
- [ ] **Step 4:** Commit final de ajustes, se houver.
