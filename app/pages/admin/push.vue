<template>
  <div class="admin-page">
    <div class="admin-shell">

      <div class="admin-header">
        <div>
          <p class="eyebrow">Painel de Admin</p>
          <h1>Notificações</h1>
          <p class="description">
            Envie uma notificação push agora ou agende para um horário.
            Aparece mesmo com o app fechado (no iOS, só em PWA instalado).
          </p>
        </div>

        <div class="header-actions">
          <NuxtLink to="/admin" class="back-link">
            <Icon name="ph:gauge-bold" />
            Dashboard
          </NuxtLink>
          <NuxtLink to="/admin/webhook" class="back-link">
            <Icon name="ph:webhooks-logo-bold" />
            Webhook
          </NuxtLink>
          <button class="logout-btn" @click="handleLogout">
            <Icon name="ph:sign-out-bold" />
            Sair
          </button>
        </div>
      </div>

      <div class="admin-card">
        <div class="current-user">
          <Icon name="ph:bell-ringing-bold" />
          <span>
            <strong>{{ stats?.total ?? '—' }}</strong> dispositivo(s) inscrito(s)
            <template v-if="stats && !stats.configured"> · ⚠️ VAPID não configurado</template>
          </span>
        </div>

        <!-- Modo: agora x agendar -->
        <div class="segmented">
          <button type="button" :class="{ active: mode === 'now' }" @click="mode = 'now'">
            <Icon name="ph:paper-plane-tilt-bold" /> Enviar agora
          </button>
          <button type="button" :class="{ active: mode === 'schedule' }" @click="mode = 'schedule'">
            <Icon name="ph:clock-bold" /> Agendar
          </button>
        </div>

        <form class="admin-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label for="title">Título</label>
            <input id="title" v-model="title" type="text" maxlength="60" placeholder="Ex: Sinal liberado! 🚀" />
          </div>

          <div class="field">
            <label for="message">Mensagem</label>
            <textarea id="message" v-model="message" rows="4" maxlength="160"
              placeholder="Ex: Nova entrada disponível no Bac Bo. Abra o app agora!" />
          </div>

          <div class="field">
            <label for="url">Link ao clicar (opcional)</label>
            <input id="url" v-model="url" type="text" placeholder="/  (padrão: abre o app na home)" />
          </div>

          <!-- Campos de agendamento -->
          <template v-if="mode === 'schedule'">
            <div class="field">
              <label>Repetição</label>
              <div class="segmented small">
                <button type="button" :class="{ active: scheduleType === 'once' }" @click="scheduleType = 'once'">
                  Uma vez
                </button>
                <button type="button" :class="{ active: scheduleType === 'daily' }" @click="scheduleType = 'daily'">
                  Todo dia
                </button>
              </div>
            </div>

            <div v-if="scheduleType === 'once'" class="field">
              <label for="datetime">Data e horário</label>
              <input id="datetime" v-model="datetime" type="datetime-local" :min="minDatetime" />
            </div>

            <div v-else class="field">
              <label for="time">Horário (todo dia)</label>
              <input id="time" v-model="timeOfDay" type="time" />
              <p class="helper-text">Será enviada todos os dias nesse horário até você cancelar.</p>
            </div>
          </template>

          <div v-if="errorMessage" class="message error-message">
            <Icon name="ph:warning-circle-bold" />
            <span>{{ errorMessage }}</span>
          </div>

          <div v-if="successMessage" class="message success-message">
            <Icon name="ph:check-circle-bold" />
            <span>{{ successMessage }}</span>
          </div>

          <div class="form-actions">
            <button type="button" class="clear-btn" :disabled="!title && !message" @click="clearForm">
              <Icon name="ph:eraser-bold" />
              Limpar
            </button>
            <button type="submit" class="submit-btn" :disabled="loading || !title.trim() || !message.trim()">
              <Icon v-if="loading" name="ph:spinner-bold" class="spin" />
              <Icon v-else :name="mode === 'now' ? 'ph:paper-plane-tilt-bold' : 'ph:clock-bold'" />
              {{ submitLabel }}
            </button>
          </div>
        </form>
      </div>

      <!-- Lista de inscritos -->
      <div class="admin-card list-card">
        <div class="list-header">
          <h2>Inscritos ({{ subscribers.length }})</h2>
          <button class="ghost-refresh" :disabled="loadingSubs" @click="loadSubscribers">
            <Icon name="ph:arrows-clockwise-bold" :class="{ spin: loadingSubs }" />
          </button>
        </div>

        <p v-if="!subscribers.length" class="empty-hint">
          Nenhum dispositivo inscrito ainda. Peça para o usuário tocar em
          "Ativar notificações" no app.
        </p>

        <div v-else class="subs-list">
          <div v-for="sub in subscribers" :key="sub.id" class="sub-row">
            <div class="sub-icon"><Icon name="ph:device-mobile-bold" /></div>
            <div class="sub-main">
              <strong class="sub-email">{{ sub.name || sub.email || 'Sem login' }}</strong>
              <span v-if="sub.name && sub.email" class="sub-meta">{{ sub.email }}</span>
              <span v-if="sub.phone" class="sub-meta">
                <Icon name="ph:phone-bold" /> {{ sub.phone }}
              </span>
              <span class="sub-meta">{{ sub.provider }} · inscrito {{ formatWhen(sub.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de agendamentos -->
      <div v-if="scheduled.length" class="admin-card list-card">
        <div class="list-header">
          <h2>Agendamentos</h2>
          <button class="ghost-refresh" :disabled="loadingList" @click="loadScheduled">
            <Icon name="ph:arrows-clockwise-bold" :class="{ spin: loadingList }" />
          </button>
        </div>

        <div class="sched-list">
          <div v-for="job in scheduled" :key="job.id" class="sched-row" :class="job.status">
            <div class="sched-main">
              <div class="sched-top">
                <span class="sched-type">
                  <Icon :name="job.type === 'daily' ? 'ph:repeat-bold' : 'ph:calendar-dot-bold'" />
                  {{ job.type === 'daily' ? 'Todo dia' : 'Uma vez' }}
                </span>
                <span class="sched-status" :class="job.status">{{ statusLabel(job.status) }}</span>
              </div>
              <strong class="sched-title">{{ job.title }}</strong>
              <p class="sched-body">{{ job.body }}</p>
              <span class="sched-when">
                <Icon name="ph:clock-bold" />
                {{ job.type === 'daily' ? `às ${job.time}` : '' }} {{ formatWhen(job.nextRunAt) }}
              </span>
            </div>
            <button v-if="job.status === 'active'" class="cancel-btn" :disabled="cancelingId === job.id"
              @click="cancelJob(job.id)">
              <Icon name="ph:x-bold" />
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface PushStats { configured: boolean; total: number; withEmail: number }
interface ScheduledJob {
  id: string
  title: string
  body: string
  url: string
  type: 'once' | 'daily'
  time: string | null
  nextRunAt: string
  status: 'active' | 'sending' | 'done' | 'canceled'
  lastSentAt: string | null
}

const mode = ref<'now' | 'schedule'>('now')
const scheduleType = ref<'once' | 'daily'>('once')

const title = ref('')
const message = ref('')
const url = ref('')
const datetime = ref('')
const timeOfDay = ref('')

interface Subscriber {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  provider: string
  createdAt: string | null
  updatedAt: string | null
  lastSeenAt: string | null
}

const loading = ref(false)
const loadingList = ref(false)
const loadingSubs = ref(false)
const cancelingId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const stats = ref<PushStats | null>(null)
const scheduled = ref<ScheduledJob[]>([])
const subscribers = ref<Subscriber[]>([])

// valor mínimo do datetime-local (agora, no fuso local)
const minDatetime = computed(() => {
  const d = new Date()
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const submitLabel = computed(() => {
  if (loading.value) return mode.value === 'now' ? 'Enviando...' : 'Agendando...'
  return mode.value === 'now' ? 'Enviar notificação' : 'Agendar notificação'
})

const statusLabel = (s: string) => {
  if (s === 'active') return 'agendada'
  if (s === 'sending') return 'enviando'
  if (s === 'done') return 'enviada'
  return 'cancelada'
}

const formatWhen = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const loadStats = async () => {
  try {
    stats.value = await $fetch<PushStats>('/api/admin/push/stats')
  } catch (err: any) {
    if (err?.status === 401) await navigateTo('/admin/login')
  }
}

const loadScheduled = async () => {
  loadingList.value = true
  try {
    scheduled.value = await $fetch<ScheduledJob[]>('/api/admin/push/scheduled')
  } catch (err: any) {
    if (err?.status === 401) await navigateTo('/admin/login')
  } finally {
    loadingList.value = false
  }
}

const loadSubscribers = async () => {
  loadingSubs.value = true
  try {
    subscribers.value = await $fetch<Subscriber[]>('/api/admin/push/subscriptions')
  } catch (err: any) {
    if (err?.status === 401) await navigateTo('/admin/login')
  } finally {
    loadingSubs.value = false
  }
}

const clearForm = () => {
  title.value = ''
  message.value = ''
  url.value = ''
  datetime.value = ''
  timeOfDay.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

// Calcula o ISO do primeiro disparo a partir dos campos locais.
const computeRunAt = (): { runAt: string; time: string | null } | null => {
  if (scheduleType.value === 'once') {
    if (!datetime.value) return null
    const d = new Date(datetime.value)
    if (isNaN(d.getTime())) return null
    return { runAt: d.toISOString(), time: null }
  }
  // daily: próxima ocorrência (hoje ou amanhã) do horário no fuso local
  if (!timeOfDay.value) return null
  const [h, m] = timeOfDay.value.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return { runAt: d.toISOString(), time: timeOfDay.value }
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!title.value.trim() || !message.value.trim()) {
    errorMessage.value = 'Preencha título e mensagem.'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'now') {
      const res = await $fetch<{ sent: number; failed: number; removed: number; total: number }>(
        '/api/admin/push/send',
        { method: 'POST', body: { title: title.value, body: message.value, url: url.value || undefined } }
      )
      successMessage.value = res.total === 0
        ? 'Nenhum dispositivo inscrito ainda.'
        : `Enviado para ${res.sent} de ${res.total} dispositivo(s).` +
          (res.removed ? ` ${res.removed} inativa(s) removida(s).` : '')
      await loadStats()
    } else {
      const sched = computeRunAt()
      if (!sched) {
        errorMessage.value = scheduleType.value === 'once'
          ? 'Escolha a data e o horário.'
          : 'Escolha o horário.'
        return
      }
      await $fetch('/api/admin/push/scheduled', {
        method: 'POST',
        body: {
          title: title.value,
          body: message.value,
          url: url.value || undefined,
          type: scheduleType.value,
          runAt: sched.runAt,
          time: sched.time
        }
      })
      successMessage.value = scheduleType.value === 'daily'
        ? `Agendado: todo dia às ${sched.time}.`
        : `Agendado para ${formatWhen(sched.runAt)}.`
      clearForm()
      await loadScheduled()
    }
  } catch (err: any) {
    if (err?.status === 401) { await navigateTo('/admin/login'); return }
    errorMessage.value = err?.data?.message || 'Falha ao processar a notificação.'
  } finally {
    loading.value = false
  }
}

const cancelJob = async (id: string) => {
  cancelingId.value = id
  try {
    await $fetch(`/api/admin/push/scheduled/${id}`, { method: 'DELETE' })
    await loadScheduled()
  } catch (err: any) {
    if (err?.status === 401) await navigateTo('/admin/login')
  } finally {
    cancelingId.value = null
  }
}

const handleLogout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

onMounted(() => {
  loadStats()
  loadScheduled()
  loadSubscribers()
})

useHead({ title: 'Admin – Notificações' })
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--adm-aurora);
  padding: 32px 20px 48px;
}

.admin-shell {
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

.admin-header,
.admin-card {
  background: var(--adm-surface);
  backdrop-filter: blur(14px);
  border: 1px solid var(--adm-border);
  border-radius: 20px;
  box-shadow: var(--adm-shadow);
  animation: admin-fade-up 0.55s var(--adm-ease) both;
}

.admin-card { animation-delay: 80ms; }
.list-card { animation-delay: 120ms; }

.admin-header {
  padding: 28px 30px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 8px;
  color: #00ccff;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 12px;
  font-weight: 700;
}

.admin-header h1 { margin: 0; color: #fff; font-size: 28px; line-height: 1.2; }

.description {
  margin: 12px 0 0;
  color: #9b9b9b;
  max-width: 520px;
  line-height: 1.6;
  font-size: 14px;
}

.header-actions { display: flex; gap: 10px; align-items: flex-start; flex-shrink: 0; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 12px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  font-size: 13px;
  white-space: nowrap;
  transition: border-color 0.2s;
}

.back-link:hover { border-color: #00ccff; }

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #888;
  padding: 10px 16px;
  border-radius: 12px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.logout-btn:hover { border-color: #ef4444; color: #ef4444; }

.admin-card { padding: 28px 30px; }

.current-user {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ccc;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #151515;
  border: 1px solid #272727;
  border-radius: 14px;
  font-size: 14px;
}

.current-user :deep(svg) { color: #00ccff; font-size: 18px; flex-shrink: 0; }
.current-user strong { color: #fff; }

/* Segmented control */
.segmented {
  display: flex;
  gap: 6px;
  padding: 5px;
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  border-radius: 14px;
  margin-bottom: 22px;
}

.segmented.small { margin-bottom: 0; }

.segmented button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #9a9a9a;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.segmented button.active {
  background: linear-gradient(135deg, #00ccff 0%, #0088cc 100%);
  color: #001018;
  box-shadow: 0 4px 14px rgba(0, 204, 255, 0.25);
}

.admin-form { display: grid; gap: 18px; }
.field { display: grid; gap: 8px; }
.field label { color: #fff; font-size: 14px; font-weight: 700; }

.admin-form input,
.admin-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #333;
  border-radius: 14px;
  background: #0f0f0f;
  color: #fff;
  padding: 14px 16px;
  font-size: 15px;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
}

.admin-form textarea { resize: vertical; min-height: 96px; }

.admin-form input:focus,
.admin-form textarea:focus {
  border-color: #00ccff;
  box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.12);
}

/* força o ícone do date/time picker a ficar visível no tema escuro */
.admin-form input[type="datetime-local"],
.admin-form input[type="time"] { color-scheme: dark; }

.helper-text { margin: 0; color: #8f8f8f; font-size: 13px; line-height: 1.4; }

.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 14px;
}

.error-message { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.28); color: #fca5a5; }
.success-message { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.28); color: #86efac; }

.form-actions { display: flex; gap: 12px; }

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 14px;
  color: #888;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.clear-btn:hover:not(:disabled) { border-color: #555; color: #ccc; }
.clear-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.submit-btn {
  flex: 1;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #00ccff 0%, #0088cc 100%);
  color: #000;
  font-size: 15px;
  font-weight: 800;
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(0, 204, 255, 0.2);
  transition: opacity 0.2s, transform 0.2s var(--adm-ease), box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 10px 30px rgba(0, 204, 255, 0.3); }
.submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

/* Lista de agendamentos */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.list-header h2 { color: #fff; font-size: 16px; margin: 0; }

.empty-hint { margin: 0; color: #8f8f8f; font-size: 13px; line-height: 1.5; }

.subs-list { display: grid; gap: 10px; }

.sub-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--adm-surface-raised);
  border: 1px solid var(--adm-border);
}

.sub-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 9px;
  background: rgba(0, 204, 255, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sub-icon :deep(svg) { color: #7dd3fc; font-size: 18px; }

.sub-main { display: grid; gap: 3px; min-width: 0; }
.sub-email { color: #fff; font-size: 14px; word-break: break-all; }
.sub-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #8f8f8f;
  font-size: 12px;
  word-break: break-all;
}
.sub-meta :deep(svg) { font-size: 12px; flex-shrink: 0; }

.ghost-refresh {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: #ccc;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.ghost-refresh:hover:not(:disabled) { border-color: #00ccff; }

.sched-list { display: grid; gap: 12px; }

.sched-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: var(--adm-surface-raised);
  border: 1px solid var(--adm-border);
  transition: border-color 0.18s;
}

.sched-row.done, .sched-row.canceled { opacity: 0.6; }
.sched-main { display: grid; gap: 6px; min-width: 0; }

.sched-top { display: flex; align-items: center; gap: 10px; }

.sched-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #7dd3fc;
}

.sched-status {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
}

.sched-status.active { background: rgba(0, 204, 255, 0.14); color: #7dd3fc; }
.sched-status.sending { background: rgba(245, 158, 11, 0.16); color: #fcd34d; }
.sched-status.done { background: rgba(16, 185, 129, 0.14); color: #6ee7b7; }
.sched-status.canceled { background: rgba(148, 163, 184, 0.14); color: #94a3b8; }

.sched-title { color: #fff; font-size: 14px; }
.sched-body { margin: 0; color: #9a9a9a; font-size: 13px; line-height: 1.4; }

.sched-when {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 600;
}

.cancel-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: #888;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.cancel-btn:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }
.cancel-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.spin { animation: spin 0.9s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .admin-header, .admin-card { padding: 22px; }
  .admin-header { flex-direction: column; }
  .admin-header h1 { font-size: 22px; }
  .form-actions { flex-direction: column; }
}
</style>
