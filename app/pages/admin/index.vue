<template>
  <div class="admin-page">
    <!-- Header fixo -->
    <header class="admin-topbar">
      <div class="topbar-inner">
        <div class="brand">
          <Icon name="ph:shield-check-bold" class="brand-icon" />
          <div class="brand-text">
            <span class="brand-eyebrow">Irmandade Club</span>
            <strong>Painel Admin</strong>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="ghost-btn" :disabled="refreshing" title="Atualizar dados" @click="refreshAll">
            <Icon name="ph:arrows-clockwise-bold" :class="{ spin: refreshing }" />
            <span class="hide-sm">Atualizar</span>
          </button>
          <NuxtLink to="/admin/webhook" class="ghost-btn">
            <Icon name="ph:webhooks-logo-bold" />
            <span class="hide-sm">Webhook</span>
          </NuxtLink>
          <NuxtLink to="/admin/push" class="ghost-btn">
            <Icon name="ph:bell-ringing-bold" />
            <span class="hide-sm">Notificar</span>
          </NuxtLink>
          <NuxtLink to="/auth/login" class="ghost-btn">
            <Icon name="ph:sign-in-bold" />
            <span class="hide-sm">Login</span>
          </NuxtLink>
          <button class="ghost-btn danger" @click="handleLogout">
            <Icon name="ph:sign-out-bold" />
            <span class="hide-sm">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <div class="admin-shell">
      <div class="page-title">
        <h1>Dashboard</h1>
        <p>Usuários do app, atividade nas últimas 48 horas e depósitos gerados.</p>
      </div>

      <!-- Cards de métricas -->
      <div class="stats-grid">
        <div class="stat-card accent-blue">
          <div class="stat-icon"><Icon name="ph:users-three-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ Math.round(cuUsers) }}</p>
            <p class="stat-label">Usuários</p>
          </div>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-icon"><Icon name="ph:pulse-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ Math.round(cuActive) }}</p>
            <p class="stat-label">Ativos (48h)</p>
          </div>
        </div>
        <div class="stat-card accent-purple">
          <div class="stat-icon"><Icon name="ph:qr-code-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ Math.round(cuPix) }}</p>
            <p class="stat-label">PIX gerados</p>
          </div>
        </div>
        <div class="stat-card accent-gold">
          <div class="stat-icon"><Icon name="ph:currency-circle-dollar-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ formatBRL(cuSum) }}</p>
            <p class="stat-label">Valor total</p>
          </div>
        </div>
      </div>

      <!-- Segunda linha: conversão, novos, ticket médio, em risco -->
      <div class="stats-grid">
        <div class="stat-card accent-cyan">
          <div class="stat-icon"><Icon name="ph:chart-pie-slice-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ formatPct(cuConv) }}</p>
            <p class="stat-label">Conversão de assinantes</p>
          </div>
        </div>
        <div class="stat-card accent-green">
          <div class="stat-icon"><Icon name="ph:user-plus-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ Math.round(cuNew7d) }}</p>
            <p class="stat-label">Novos (7d) · {{ stats?.newToday ?? 0 }} hoje</p>
          </div>
        </div>
        <div class="stat-card accent-gold">
          <div class="stat-icon"><Icon name="ph:coins-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value">{{ formatBRL(cuTicket) }}</p>
            <p class="stat-label">Ticket médio</p>
          </div>
        </div>
        <button class="stat-card accent-red stat-clickable" :class="{ 'card-alert': stats && stats.atRisk > 0 }" :disabled="!stats" @click="focusRisk">
          <div class="stat-icon"><Icon name="ph:warning-bold" /></div>
          <div class="stat-body">
            <span v-if="!stats" class="skeleton skeleton-num" />
            <p v-else class="stat-value" :class="{ 'pulse-red': stats.atRisk > 0 }">{{ Math.round(cuRisk) }}</p>
            <p class="stat-label">Em risco · clique p/ filtrar</p>
          </div>
        </button>
      </div>

      <!-- Gráfico de atividade -->
      <AdminActivityChart :days="activityDays" :loading="activityLoading" :error="activityError" />

      <!-- Usuários -->
      <section ref="usersSection" class="admin-card">
        <div class="card-header">
          <div class="card-title">
            <h2>Usuários</h2>
            <span v-if="usersTotal" class="count-pill">{{ usersTotal }}</span>
          </div>
          <div class="header-tools">
            <button class="export-btn" :disabled="exporting || !usersTotal" title="Exportar a lista filtrada em CSV" @click="exportCsv">
              <Icon :name="exporting ? 'ph:spinner-bold' : 'ph:download-simple-bold'" :class="{ spin: exporting }" />
              <span class="hide-sm">Exportar CSV</span>
            </button>
            <div class="search-wrap">
              <Icon name="ph:magnifying-glass-bold" class="search-icon" />
              <input
                ref="searchInput"
                v-model="search"
                type="text"
                class="search-input"
                placeholder="Buscar por nome, e-mail ou telefone...  ( / )"
              />
              <button v-if="search" class="search-clear" title="Limpar" @click="search = ''">
                <Icon name="ph:x-bold" />
              </button>
            </div>
          </div>
        </div>

        <div class="filter-bar">
          <span class="filter-group-label">Risco:</span>
          <button class="chip chip-amber" :class="{ on: riskFilter === '24h' }"
            @click="riskFilter = riskFilter === '24h' ? '' : '24h'">⚠ 24h</button>
          <button class="chip chip-red" :class="{ on: riskFilter === '48h' }"
            @click="riskFilter = riskFilter === '48h' ? '' : '48h'">48h+</button>
          <button class="chip chip-purple" :class="{ on: riskFilter === 'no_access' }"
            @click="riskFilter = riskFilter === 'no_access' ? '' : 'no_access'">🌙 Pago s/ acesso</button>
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

        <p v-if="usersError" class="state-msg error">
          <Icon name="ph:warning-circle-bold" /> {{ usersError }}
        </p>

        <!-- Skeleton inicial -->
        <div v-else-if="usersLoading && !users.length" class="table-wrap">
          <div v-for="n in 4" :key="n" class="skeleton-row">
            <span class="skeleton skeleton-line" style="width: 60%" />
            <span class="skeleton skeleton-line" style="width: 40%" />
          </div>
        </div>

        <p v-else-if="!users.length" class="state-msg empty">
          <Icon name="ph:user-circle-dashed-bold" />
          {{ hasFilters ? 'Nenhum usuário com esse filtro.' : 'Nenhum usuário ainda. Os registros começam quando alguém loga pelo app.' }}
        </p>

        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Telefone</th>
                <th>Tag</th>
                <th>Contato</th>
                <th>Assinatura</th>
                <th>PIX</th>
                <th>Marca</th>
                <th>1º acesso</th>
                <th>Último acesso</th>
                <th>Status</th>
                <th class="col-action"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.email" :class="{ 'row-blocked': u.blocked }">
                <td data-label="Usuário">
                  <div class="user-cell">
                    <span class="avatar" :style="avatarStyle(u)">{{ initials(u) }}</span>
                    <div class="user-meta">
                      <span class="user-name">{{ u.name || 'Sem nome' }}</span>
                      <span class="user-email">{{ u.email }}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Telefone">
                  <a
                    v-if="u.phone"
                    :href="`https://wa.me/${u.phone.replace(/\D/g, '')}`"
                    target="_blank"
                    rel="noopener"
                    class="phone-link"
                    title="Abrir no WhatsApp"
                  >
                    <Icon name="ph:whatsapp-logo-bold" /> {{ u.phone }}
                  </a>
                  <span v-else class="muted-dash">—</span>
                </td>
                <td data-label="Tag">
                  <select
                    class="status-select tag-select"
                    :class="tagSelClass(u.risk_tag)"
                    :value="u.tag_override"
                    :title="u.tag_override === 'auto'
                      ? ('Automática' + (u.risk_tag ? ' → ' + riskLabel(u.risk_tag) : ' → sem risco'))
                      : 'Tag definida manualmente'"
                    @change="updateTag(u, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="o in TAG_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </td>
                <td data-label="Contato">
                  <select
                    class="status-select"
                    :class="`st-${u.contact_status}`"
                    :value="u.contact_status"
                    @change="updateStatus(u, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </td>
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
                <td data-label="Marca"><span class="brand-chip">{{ u.brand_slug || '—' }}</span></td>
                <td data-label="1º acesso" :title="String(u.first_seen_at || '')">
                  {{ u.first_seen_at ? relativeTime(u.first_seen_at) : '—' }}
                </td>
                <td data-label="Último acesso" :title="String(u.last_seen_at || '')">
                  {{ u.last_seen_at ? relativeTime(u.last_seen_at) : '—' }}
                </td>
                <td data-label="Status">
                  <span class="badge" :class="u.blocked ? 'badge-blocked' : 'badge-active'">
                    <span class="dot" /> {{ u.blocked ? 'Bloqueado' : 'Ativo' }}
                  </span>
                </td>
                <td data-label="Ação" class="col-action">
                  <button
                    class="block-btn"
                    :class="{ unblock: u.blocked }"
                    :disabled="blockingEmail === u.email"
                    @click="requestBlock(u)"
                  >
                    <Icon v-if="blockingEmail === u.email" name="ph:spinner-bold" class="spin" />
                    <Icon v-else :name="u.blocked ? 'ph:lock-open-bold' : 'ph:lock-bold'" />
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
          <Icon v-if="usersLoading" name="ph:spinner-bold" class="spin" />
          {{ usersLoading ? 'Carregando...' : `Carregar mais (${users.length}/${usersTotal})` }}
        </button>
      </section>

      <!-- Depósitos -->
      <section class="admin-card">
        <div class="card-header">
          <div class="card-title">
            <h2>Depósitos</h2>
            <span class="subtitle-tag">PIX gerados</span>
            <span v-if="depositsTotal" class="count-pill">{{ depositsTotal }}</span>
          </div>
        </div>

        <p v-if="depositsError" class="state-msg error">
          <Icon name="ph:warning-circle-bold" /> {{ depositsError }}
        </p>

        <div v-else-if="depositsLoading && !depositsList.length" class="table-wrap">
          <div v-for="n in 3" :key="n" class="skeleton-row">
            <span class="skeleton skeleton-line" style="width: 50%" />
            <span class="skeleton skeleton-line" style="width: 30%" />
          </div>
        </div>

        <p v-else-if="!depositsList.length" class="state-msg empty">
          <Icon name="ph:receipt-x-bold" />
          Nenhum depósito registrado ainda.
        </p>

        <div v-else class="table-wrap">
          <table class="data-table">
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
                <td data-label="Data" :title="String(d.created_at)">{{ relativeTime(d.created_at) }}</td>
                <td data-label="E-mail">{{ d.email }}</td>
                <td data-label="Marca"><span class="brand-chip">{{ d.brand_slug || '—' }}</span></td>
                <td data-label="Valor" class="amount">{{ formatBRL(d.amount) }}</td>
                <td data-label="Transação" class="mono tx-id">{{ d.transaction_id || '—' }}</td>
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
          <Icon v-if="depositsLoading" name="ph:spinner-bold" class="spin" />
          {{ depositsLoading ? 'Carregando...' : `Carregar mais (${depositsList.length}/${depositsTotal})` }}
        </button>
      </section>

      <!-- Registrar FTD -->
      <section class="admin-card">
        <div class="card-header">
          <div class="card-title">
            <h2>Registrar FTD</h2>
            <span class="subtitle-tag">primeiro depósito — entra como PIX</span>
          </div>
        </div>

        <form class="ftd-form" @submit.prevent="registerFtd">
          <div class="ftd-fields">
            <div class="ftd-field ftd-grow">
              <label>E-mail do cliente</label>
              <input
                v-model="ftdEmail"
                type="email"
                placeholder="cliente@email.com"
                :disabled="ftdLoading"
                list="ftd-emails"
              />
              <datalist id="ftd-emails">
                <option v-for="u in users" :key="u.email" :value="u.email" />
              </datalist>
            </div>
            <div class="ftd-field">
              <label>Valor (R$)</label>
              <input
                v-model="ftdAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                :disabled="ftdLoading"
              />
            </div>
            <div class="ftd-field">
              <label>Marca (opcional)</label>
              <select v-model="ftdBrand" class="ftd-select" :disabled="ftdLoading">
                <option value="">—</option>
                <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <button
              type="submit"
              class="ftd-submit"
              :disabled="ftdLoading || !ftdEmail || !(Number(String(ftdAmount).replace(',', '.')) > 0)"
            >
              <Icon :name="ftdLoading ? 'ph:spinner-bold' : 'ph:plus-circle-bold'" :class="{ spin: ftdLoading }" />
              Registrar FTD
            </button>
          </div>
          <p class="ftd-hint">
            <Icon name="ph:info-bold" />
            O FTD é gravado como um PIX na conta do cliente — conta no total, na conversão e remove a tag de risco.
          </p>
        </form>
      </section>
    </div>

    <!-- Modal de confirmação de bloqueio -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmTarget" class="modal-overlay" @click.self="closeConfirm">
          <div class="confirm-modal" :class="confirmTarget.blocked ? 'variant-unblock' : 'variant-block'">
            <button class="modal-close" :disabled="confirmLoading" @click="closeConfirm">
              <Icon name="ph:x-bold" />
            </button>

            <div class="confirm-icon">
              <Icon :name="confirmTarget.blocked ? 'ph:lock-open-bold' : 'ph:lock-bold'" />
            </div>

            <h3>{{ confirmTarget.blocked ? 'Desbloquear usuário?' : 'Bloquear usuário?' }}</h3>
            <p class="confirm-desc">
              {{ confirmTarget.blocked
                ? 'O usuário voltará a ter acesso normal ao app.'
                : 'O usuário será impedido de acessar o app e verá o aviso de bloqueio com o contato do suporte.' }}
            </p>

            <div class="confirm-user">
              <span class="avatar" :style="avatarStyle(confirmTarget)">{{ initials(confirmTarget) }}</span>
              <div class="confirm-user-meta">
                <span class="user-name">{{ confirmTarget.name || 'Sem nome' }}</span>
                <span class="user-email">{{ confirmTarget.email }}</span>
              </div>
            </div>

            <div class="confirm-actions">
              <button class="btn-cancel" :disabled="confirmLoading" @click="closeConfirm">Cancelar</button>
              <button class="btn-confirm" :disabled="confirmLoading" @click="confirmBlock">
                <Icon v-if="confirmLoading" name="ph:spinner-bold" class="spin" />
                <Icon v-else :name="confirmTarget.blocked ? 'ph:lock-open-bold' : 'ph:lock-bold'" />
                {{ confirmLoading
                  ? 'Processando...'
                  : (confirmTarget.blocked ? 'Desbloquear' : 'Bloquear') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="toast" :class="toast.type">
          <Icon :name="toast.type === 'success' ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'" />
          <span>{{ toast.message }}</span>
          <span class="toast-timer" />
        </div>
      </Transition>
    </Teleport>
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
  last_seen_at: string | null
  first_seen_at: string | null
  subscription: 'paid' | 'free'
  deposits_count: number
  deposits_sum: number
  risk_tag: 'risk_24h' | 'risk_48h' | 'risk_no_access' | null
  auto_risk_tag: 'risk_24h' | 'risk_48h' | 'risk_no_access' | null
  tag_override: 'auto' | 'none' | 'risk_24h' | 'risk_48h' | 'risk_no_access'
  contact_status: 'pendente' | 'contatado' | 'respondeu' | 'convertido' | 'ignorado'
  source?: string
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
  newToday: number
  new7d: number
  avgTicket: number
  atRisk: number
  conversionRate: number
}

interface DayPoint { date: string; newUsers: number; pixCount: number; pixSum: number }

const PAGE = 50

const stats = ref<Stats | null>(null)
const users = ref<AppUser[]>([])
const usersTotal = ref(0)
const usersLoading = ref(false)
const usersError = ref('')
const search = ref('')

// filtros server-side da tabela de usuários
const riskFilter = ref<'' | '24h' | '48h' | 'no_access' | 'any'>('')
const subFilter = ref<'' | 'paid' | 'free'>('')
const statusFilter = ref<'' | 'active' | 'blocked'>('')
const brandFilter = ref('')
const brands = ref<string[]>([])

const activityDays = ref<DayPoint[]>([])
const activityLoading = ref(true)
const activityError = ref('')

const blockingEmail = ref('')
const refreshing = ref(false)

const depositsList = ref<DepositRow[]>([])
const depositsTotal = ref(0)
const depositsLoading = ref(false)
const depositsError = ref('')

const confirmTarget = ref<AppUser | null>(null)
const confirmLoading = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { message, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

// números animados dos cards (count-up ao carregar/atualizar)
const cuUsers = useCountUp(computed(() => stats.value?.totalUsers))
const cuActive = useCountUp(computed(() => stats.value?.active48h))
const cuPix = useCountUp(computed(() => stats.value?.depositsCount))
const cuSum = useCountUp(computed(() => stats.value?.depositsSum))
const cuConv = useCountUp(computed(() => stats.value?.conversionRate))
const cuNew7d = useCountUp(computed(() => stats.value?.new7d))
const cuTicket = useCountUp(computed(() => stats.value?.avgTicket))
const cuRisk = useCountUp(computed(() => stats.value?.atRisk))

// matiz determinística por usuário para o avatar
const avatarHue = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

const avatarStyle = (u: AppUser) => {
  const h = avatarHue(u.email || u.name || '?')
  return {
    background: `linear-gradient(135deg, hsla(${h}, 75%, 55%, 0.22), hsla(${h}, 75%, 45%, 0.08))`,
    borderColor: `hsla(${h}, 75%, 60%, 0.35)`,
    color: `hsl(${h}, 85%, 68%)`
  }
}

const initials = (u: AppUser) => {
  const base = (u.name || u.email || '?').trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

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
  } catch { /* card mantém skeleton */ }
}

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

const fetchDeposits = async (append = false) => {
  depositsLoading.value = true
  depositsError.value = ''
  try {
    const res = await $fetch<{ deposits: DepositRow[]; total: number }>('/api/admin/deposits', {
      params: { skip: append ? depositsList.value.length : 0, limit: PAGE }
    })
    depositsList.value = append ? [...depositsList.value, ...res.deposits] : res.deposits
    depositsTotal.value = res.total
  } catch (err: any) {
    depositsError.value = err?.data?.message || 'Erro ao carregar depósitos'
  } finally {
    depositsLoading.value = false
  }
}

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

const loadMoreUsers = () => fetchUsers(true)
const loadMoreDeposits = () => fetchDeposits(true)

// --- Registrar FTD ---
const ftdEmail = ref('')
const ftdAmount = ref('')
const ftdBrand = ref('')
const ftdLoading = ref(false)
const registerFtd = async () => {
  const email = ftdEmail.value.trim().toLowerCase()
  const amount = Number(String(ftdAmount.value).replace(',', '.'))
  if (!email || !(amount > 0)) return
  ftdLoading.value = true
  try {
    await $fetch('/api/admin/ftd', {
      method: 'POST',
      body: { email, amount, brand: ftdBrand.value || null }
    })
    showToast(`FTD de ${formatBRL(amount)} registrado.`, 'success')
    ftdEmail.value = ''
    ftdAmount.value = ''
    ftdBrand.value = ''
    await Promise.all([fetchStats(), fetchDeposits(false), fetchUsers(false)])
  } catch (err: any) {
    showToast(err?.data?.message || 'Erro ao registrar FTD', 'error')
  } finally {
    ftdLoading.value = false
  }
}

const exporting = ref(false)
const exportCsv = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const blob = await $fetch<Blob>('/api/admin/users/export', {
      params: {
        search: search.value,
        risk: riskFilter.value,
        subscription: subFilter.value,
        status: statusFilter.value,
        brand: brandFilter.value
      },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-irmandade-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('CSV exportado.', 'success')
  } catch {
    showToast('Erro ao exportar CSV', 'error')
  } finally {
    exporting.value = false
  }
}

const refreshAll = async () => {
  refreshing.value = true
  await Promise.all([fetchStats(), fetchUsers(false), fetchDeposits(false), fetchActivity()])
  refreshing.value = false
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

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'ignorado', label: 'Ignorado' }
] as const

const updateStatus = async (u: AppUser, value: string) => {
  const prev = u.contact_status
  u.contact_status = value as AppUser['contact_status'] // otimista
  try {
    await $fetch('/api/admin/users/status', {
      method: 'POST',
      body: { email: u.email, status: value }
    })
  } catch (err: any) {
    u.contact_status = prev
    showToast(err?.data?.message || 'Erro ao salvar status', 'error')
  }
}

const TAG_OPTIONS = [
  { value: 'auto', label: 'Automática' },
  { value: 'risk_24h', label: '24h sem depósito' },
  { value: 'risk_48h', label: '48h+ sem depósito' },
  { value: 'risk_no_access', label: 'Pago, nunca acessou' },
  { value: 'none', label: 'Sem tag' }
] as const

// tag efetiva no cliente: override manda; 'auto' usa o cálculo, 'none' zera
const effectiveTag = (override: string, auto: AppUser['risk_tag']) =>
  override === 'none' ? null : override === 'auto' ? auto : (override as AppUser['risk_tag'])

const updateTag = async (u: AppUser, value: string) => {
  const prevOverride = u.tag_override
  const prevRisk = u.risk_tag
  u.tag_override = value as AppUser['tag_override']          // otimista
  u.risk_tag = effectiveTag(value, u.auto_risk_tag)
  try {
    await $fetch('/api/admin/users/tag', {
      method: 'POST',
      body: { email: u.email, tag: value }
    })
    fetchStats() // "a manual manda": atualiza o card "Em risco"
  } catch (err: any) {
    u.tag_override = prevOverride
    u.risk_tag = prevRisk
    showToast(err?.data?.message || 'Erro ao salvar tag', 'error')
  }
}

const tagSelClass = (tag: AppUser['risk_tag']) =>
  tag === 'risk_48h' ? 'tg-48'
    : tag === 'risk_24h' ? 'tg-24'
    : tag === 'risk_no_access' ? 'tg-noaccess'
    : ''

const riskLabel = (tag: AppUser['risk_tag']) =>
  tag === 'risk_48h' ? '48h+ sem depósito'
    : tag === 'risk_24h' ? '24h sem depósito'
    : tag === 'risk_no_access' ? 'pago, nunca acessou'
    : ''

const riskClass = (tag: AppUser['risk_tag']) =>
  tag === 'risk_48h' ? 'risk-48'
    : tag === 'risk_24h' ? 'risk-24'
    : tag === 'risk_no_access' ? 'risk-noaccess'
    : ''

const formatPct = (v: number) => `${(v || 0).toFixed(1).replace('.', ',')}%`

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchUsers(false), 300)
})

const requestBlock = (u: AppUser) => {
  confirmTarget.value = u
}

const closeConfirm = () => {
  if (confirmLoading.value) return
  confirmTarget.value = null
}

const confirmBlock = async () => {
  const u = confirmTarget.value
  if (!u) return

  confirmLoading.value = true
  blockingEmail.value = u.email
  try {
    const res = await $fetch<{ blocked: boolean }>('/api/admin/users/block', {
      method: 'POST',
      body: { email: u.email, blocked: !u.blocked }
    })
    u.blocked = res.blocked
    showToast(res.blocked ? 'Usuário bloqueado.' : 'Usuário desbloqueado.', 'success')
    confirmTarget.value = null
  } catch (err: any) {
    showToast(err?.data?.message || 'Erro ao alterar bloqueio', 'error')
  } finally {
    confirmLoading.value = false
    blockingEmail.value = ''
  }
}

// Esc fecha o modal de confirmação; "/" foca a busca
const searchInput = ref<HTMLInputElement | null>(null)
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && confirmTarget.value) closeConfirm()
  const tag = (e.target as HTMLElement)?.tagName || ''
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
    e.preventDefault()
    searchInput.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const handleLogout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
  navigateTo('/admin/login')
}

onMounted(() => {
  fetchStats()
  fetchUsers()
  fetchDeposits()
  fetchActivity()
})

useHead({ title: 'Dashboard – Admin Irmandade' })
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--adm-aurora);
  color: #fff;
}

/* ---------- Topbar ---------- */
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(9, 9, 12, 0.72);
  backdrop-filter: blur(18px) saturate(1.4);
  border-bottom: 1px solid var(--adm-border);
}

.topbar-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 30px;
  color: #00ccff;
  filter: drop-shadow(0 0 10px rgba(0, 204, 255, 0.45));
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-eyebrow {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.brand-text strong {
  font-size: 16px;
  color: #fff;
}

.topbar-actions {
  display: flex;
  gap: 8px;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 13px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid #2a2a2a;
  background: #131313;
  color: #cfcfcf;
  transition: all 0.18s ease;
}

.ghost-btn:hover:not(:disabled) {
  border-color: #00ccff;
  color: #00ccff;
  transform: translateY(-1px);
}

.ghost-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.ghost-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.ghost-btn :deep(svg) {
  font-size: 16px;
}

/* ---------- Shell ---------- */
.admin-shell {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-title h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.page-title p {
  color: #888;
  font-size: 14px;
  margin-top: 4px;
}

/* ---------- Stat cards ---------- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--adm-surface);
  backdrop-filter: blur(14px);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius);
  padding: 18px;
  box-shadow: var(--adm-shadow);
  animation: admin-fade-up 0.55s var(--adm-ease) both;
  transition: transform 0.22s var(--adm-ease), border-color 0.22s ease, box-shadow 0.22s ease;
}

/* entrada em cascata */
.stats-grid .stat-card:nth-child(1) { animation-delay: 0ms; }
.stats-grid .stat-card:nth-child(2) { animation-delay: 60ms; }
.stats-grid .stat-card:nth-child(3) { animation-delay: 120ms; }
.stats-grid .stat-card:nth-child(4) { animation-delay: 180ms; }

.stat-card:hover {
  transform: translateY(-3px);
  border-color: var(--adm-border-strong);
  box-shadow: var(--adm-shadow-lift);
}

/* glow da cor do accent no hover */
.stat-card.accent-blue:hover { border-color: rgba(0, 204, 255, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-cyan); }
.stat-card.accent-green:hover { border-color: rgba(34, 197, 94, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-green); }
.stat-card.accent-purple:hover { border-color: rgba(168, 85, 247, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-purple); }
.stat-card.accent-gold:hover { border-color: rgba(245, 197, 66, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-gold); }
.stat-card.accent-cyan:hover { border-color: rgba(34, 211, 238, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-cyan); }
.stat-card.accent-red:hover { border-color: rgba(239, 68, 68, 0.4); box-shadow: var(--adm-shadow-lift), var(--adm-glow-red); }

/* card "Em risco" pulsando quando há usuários em risco */
.card-alert {
  border-color: rgba(239, 68, 68, 0.35);
  animation: admin-fade-up 0.55s var(--adm-ease) both, admin-glow-pulse 2.4s ease-in-out 0.6s infinite;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon :deep(svg) {
  font-size: 24px;
}

.accent-blue .stat-icon { background: rgba(0, 204, 255, 0.12); color: #00ccff; }
.accent-green .stat-icon { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
.accent-purple .stat-icon { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
.accent-gold .stat-icon { background: rgba(245, 197, 66, 0.12); color: #f5c542; }

.stat-value {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  color: #888;
  font-size: 13px;
  margin-top: 2px;
}

/* ---------- Cards ---------- */
.admin-card {
  background: var(--adm-surface);
  backdrop-filter: blur(14px);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius);
  padding: 22px;
  box-shadow: var(--adm-shadow);
  animation: admin-fade-up 0.55s var(--adm-ease) 0.12s both;
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

.count-pill {
  font-size: 12px;
  font-weight: 700;
  color: #00ccff;
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid rgba(0, 204, 255, 0.25);
  border-radius: 999px;
  padding: 2px 9px;
}

/* ---------- Search ---------- */
.header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  background: rgba(0, 204, 255, 0.08);
  border: 1px solid rgba(0, 204, 255, 0.3);
  border-radius: 10px;
  color: #00ccff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, transform 0.15s;
}

.export-btn:hover:not(:disabled) {
  background: rgba(0, 204, 255, 0.14);
  border-color: rgba(0, 204, 255, 0.5);
}

.export-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.export-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 380px;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #555;
  font-size: 15px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 36px;
  background: #181818;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.18s;
}

.search-input:focus {
  border-color: #00ccff;
  box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.12);
}

.search-input::placeholder {
  color: #555;
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 6px;
}

.search-clear:hover {
  color: #fff;
  background: #222;
}

/* ---------- Table ---------- */
.table-wrap {
  overflow: auto;
  max-height: 62vh;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #121216;
  text-align: left;
  color: #777;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 14px;
  border-bottom: 1px solid #1f1f23;
  white-space: nowrap;
}

.data-table td {
  color: #ddd;
  padding: 13px 14px;
  border-bottom: 1px solid #161616;
  white-space: nowrap;
}

.data-table tbody tr {
  transition: background 0.15s;
}

.data-table tbody tr:hover {
  background: linear-gradient(90deg, rgba(0, 204, 255, 0.06), rgba(0, 204, 255, 0) 38%), #141419;
}

.data-table tbody tr:hover td:first-child {
  box-shadow: inset 3px 0 0 var(--adm-cyan);
}

.row-blocked {
  opacity: 0.62;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 11px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ccff33, #00ccff11);
  border: 1px solid rgba(0, 204, 255, 0.25);
  color: #00ccff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  color: #fff;
  font-weight: 600;
}

.user-email {
  color: #888;
  font-size: 12.5px;
}

.mono {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 13px;
}

.amount {
  font-weight: 700;
  color: #fff;
}

.brand-chip {
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid rgba(0, 204, 255, 0.25);
  color: #00ccff;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  text-transform: capitalize;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
}

.badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.badge-active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-blocked {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.col-action {
  text-align: right;
}

.block-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.04);
  color: #ef4444;
  transition: all 0.18s ease;
}

.block-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.14);
}

.block-btn.unblock {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.04);
  color: #22c55e;
}

.block-btn.unblock:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.14);
}

.block-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tx-id {
  color: #777;
  font-size: 12px;
}

/* ---------- Load more ---------- */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 18px auto 0;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  background: #161616;
  color: #ccc;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
}

.load-more:hover:not(:disabled) {
  border-color: #00ccff;
  color: #00ccff;
}

.load-more:disabled {
  opacity: 0.6;
  cursor: default;
}

/* ---------- States ---------- */
.state-msg {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  padding: 18px 4px;
}

.state-msg :deep(svg) {
  font-size: 20px;
  flex-shrink: 0;
}

.state-msg.empty {
  color: #666;
}

.state-msg.error {
  color: #ef4444;
}

/* ---------- Skeletons ---------- */
.skeleton {
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, #1a1a1a 25%, #242424 37%, #1a1a1a 63%);
  background-size: 400% 100%;
  animation: shimmer 1.3s ease infinite;
}

.skeleton-num {
  width: 60px;
  height: 26px;
  margin-bottom: 6px;
}

.skeleton-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 14px;
  border-bottom: 1px solid #161616;
}

.skeleton-line {
  height: 14px;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* ---------- Confirm modal ---------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.confirm-modal {
  position: relative;
  width: 100%;
  max-width: 410px;
  background: linear-gradient(180deg, #151515, #101010);
  border: 1px solid #2a2a2a;
  border-radius: 20px;
  padding: 30px 28px 26px;
  text-align: center;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

/* faixa de cor no topo conforme a ação */
.confirm-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.confirm-modal.variant-block::before { background: linear-gradient(90deg, #ef4444, #b91c1c); }
.confirm-modal.variant-unblock::before { background: linear-gradient(90deg, #22c55e, #15803d); }

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.18s;
}
.modal-close:hover:not(:disabled) { background: #222; color: #fff; }
.modal-close:disabled { opacity: 0.4; cursor: default; }

.confirm-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px auto 18px;
}
.confirm-icon :deep(svg) { font-size: 28px; }

.variant-block .confirm-icon {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.05);
}
.variant-unblock .confirm-icon {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.05);
}

.confirm-modal h3 {
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #fff;
}

.confirm-desc {
  color: #999;
  font-size: 14px;
  line-height: 1.55;
  margin: 0 auto 20px;
  max-width: 330px;
}

.confirm-user {
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 12px;
  padding: 11px 14px;
  margin-bottom: 22px;
}

.confirm-user .avatar {
  width: 38px;
  height: 38px;
}

.confirm-user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
  flex: 1;
}

.confirm-user-meta .user-name {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.confirm-user-meta .user-email {
  color: #888;
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.18s;
}

.btn-cancel {
  background: transparent;
  border-color: #2e2e2e;
  color: #aaa;
}
.btn-cancel:hover:not(:disabled) {
  border-color: #444;
  color: #fff;
}
.btn-cancel:disabled,
.btn-confirm:disabled { opacity: 0.6; cursor: default; }

.variant-block .btn-confirm {
  background: #ef4444;
  color: #fff;
}
.variant-block .btn-confirm:hover:not(:disabled) { background: #dc2626; }
.variant-unblock .btn-confirm {
  background: #22c55e;
  color: #06270f;
}
.variant-unblock .btn-confirm:hover:not(:disabled) { background: #16a34a; }

/* transição de entrada/saída */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .confirm-modal { transition: transform 0.34s var(--adm-spring); }
.modal-leave-active .confirm-modal { transition: transform 0.18s ease; }
.modal-enter-from .confirm-modal,
.modal-leave-to .confirm-modal { transform: scale(0.92) translateY(14px); }

/* ---------- Toast ---------- */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  z-index: 1100;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* barra de tempo restante do toast */
.toast-timer {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: currentColor;
  opacity: 0.55;
  animation: admin-toast-timer 3.2s linear forwards;
}

.toast :deep(svg) {
  font-size: 18px;
}

.toast.success {
  background: #0f2417;
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.toast.error {
  background: #2a1212;
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ---------- Responsivo: tabela vira cards ---------- */
@media (max-width: 720px) {
  .data-table thead {
    display: none;
  }

  .data-table,
  .data-table tbody,
  .data-table tr,
  .data-table td {
    display: block;
    width: 100%;
  }

  .data-table tr {
    background: #141414;
    border: 1px solid #222;
    border-radius: 12px;
    padding: 8px 4px;
    margin-bottom: 12px;
  }

  .data-table tbody tr:hover {
    background: #141414;
  }

  .data-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #1c1c1c;
    white-space: normal;
    text-align: right;
  }

  .data-table td:last-child {
    border-bottom: none;
  }

  .data-table td::before {
    content: attr(data-label);
    color: #777;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    text-align: left;
  }

  .user-cell {
    justify-content: flex-end;
  }

  .col-action {
    justify-content: flex-end;
  }

  .col-action .block-btn {
    width: 100%;
    justify-content: center;
  }

  .col-action::before {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .hide-sm {
    display: none;
  }

  .ghost-btn {
    padding: 9px;
  }
}

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

.chip:active { transform: scale(0.96); }

.chip:focus-visible,
.ghost-btn:focus-visible,
.block-btn:focus-visible,
.load-more:focus-visible,
.stat-clickable:focus-visible {
  outline: 2px solid rgba(0, 204, 255, 0.55);
  outline-offset: 2px;
}

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

.chip-purple.on {
  border-color: rgba(168, 85, 247, 0.5);
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
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

.risk-noaccess {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #c084fc;
}

.sub-only-chip {
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid rgba(0, 204, 255, 0.32);
  color: #00ccff;
  font-weight: 600;
}

.phone-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #cfd3d8;
  text-decoration: none;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.phone-link :deep(svg) {
  font-size: 15px;
  color: #25d366;
}

.phone-link:hover {
  color: #fff;
  background: rgba(37, 211, 102, 0.1);
  border-color: rgba(37, 211, 102, 0.35);
}

.muted-dash {
  color: #555;
}

.status-select {
  appearance: none;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 999px;
  color: #aaa;
  font-size: 12.5px;
  font-weight: 700;
  padding: 6px 26px 6px 12px;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  background-size: 11px;
  transition: border-color 0.18s, color 0.18s, background-color 0.18s;
}

.status-select:focus { border-color: #00ccff; }
.status-select option { background: #161616; color: #eee; }

/* cor por etapa */
.status-select.st-contatado {
  color: #00ccff;
  border-color: rgba(0, 204, 255, 0.4);
  background-color: rgba(0, 204, 255, 0.08);
}
.status-select.st-respondeu {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
  background-color: rgba(245, 158, 11, 0.08);
}
.status-select.st-convertido {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.45);
  background-color: rgba(34, 197, 94, 0.1);
}
.status-select.st-ignorado {
  color: #777;
  border-color: #333;
  text-decoration: line-through;
}

/* dropdown de tag — cor pela tag efetiva */
.tag-select.tg-24 {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
  background-color: rgba(245, 158, 11, 0.08);
}
.tag-select.tg-48 {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
  background-color: rgba(239, 68, 68, 0.08);
}
.tag-select.tg-noaccess {
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.4);
  background-color: rgba(168, 85, 247, 0.1);
}

/* ---------- Registrar FTD ---------- */
.ftd-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ftd-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}

.ftd-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}

.ftd-grow {
  flex: 1;
  min-width: 240px;
}

.ftd-field label {
  font-size: 12px;
  color: #888;
  font-weight: 600;
}

.ftd-field input,
.ftd-select {
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  padding: 11px 13px;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.ftd-field input:focus,
.ftd-select:focus {
  border-color: #00ccff;
  box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.12);
}

.ftd-field input:disabled,
.ftd-select:disabled {
  opacity: 0.5;
}

.ftd-submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #00ccff, #0088cc);
  color: #001018;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 6px 20px rgba(0, 204, 255, 0.22);
  transition: opacity 0.18s, transform 0.15s;
}

.ftd-submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.ftd-submit:active:not(:disabled) {
  transform: scale(0.98);
}

.ftd-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.ftd-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: #777;
  margin: 0;
}

.ftd-hint :deep(svg) {
  color: #00ccff;
  flex-shrink: 0;
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
</style>
