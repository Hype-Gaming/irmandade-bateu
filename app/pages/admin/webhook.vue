<template>
  <div class="admin-page">
    <div class="admin-shell">

      <div class="admin-header">
        <div>
          <p class="eyebrow">Painel de Admin</p>
          <h1>Recuperar assinaturas</h1>
          <p class="description">
            Cole um ou mais e-mails para liberar acesso pago na
            collection <strong>subscriptions</strong> quando o webhook falhar.
          </p>
        </div>

        <div class="header-actions">
          <NuxtLink to="/admin" class="back-link">
            <Icon name="ph:gauge-bold" />
            Dashboard
          </NuxtLink>
          <NuxtLink to="/admin/push" class="back-link">
            <Icon name="ph:bell-ringing-bold" />
            Notificar
          </NuxtLink>
          <NuxtLink to="/auth/login" class="back-link">
            <Icon name="ph:sign-in-bold" />
            Login
          </NuxtLink>
          <button class="logout-btn" @click="handleLogout">
            <Icon name="ph:sign-out-bold" />
            Sair
          </button>
        </div>
      </div>

      <div class="admin-card">
        <div class="current-user">
          <Icon name="ph:shield-check-bold" />
          <span>Admin: <strong>{{ adminEmail || '---' }}</strong></span>
        </div>

        <form class="admin-form" @submit.prevent="handleSubmit">
          <div class="label-row">
            <label for="emails">E-mails pagantes</label>
            <span v-if="emailCount > 0" class="email-counter">
              {{ emailCount }} e-mail{{ emailCount > 1 ? 's' : '' }} detectado{{ emailCount > 1 ? 's' : '' }}
            </span>
          </div>

          <textarea
            id="emails"
            v-model="emailsInput"
            placeholder="um@email.com&#10;outro@email.com"
            rows="10"
            @input="updateCount"
          />

          <p class="helper-text">
            Aceita e-mails por linha, separados por vírgula ou misturados em texto.
          </p>

          <div v-if="errorMessage" class="message error-message">
            <Icon name="ph:warning-circle-bold" />
            <span>{{ errorMessage }}</span>
          </div>

          <div v-if="successMessage" class="message success-message">
            <Icon name="ph:check-circle-bold" />
            <span>{{ successMessage }}</span>
          </div>

          <div class="form-actions">
            <button type="button" class="clear-btn" :disabled="!emailsInput && !processed.length" @click="clearForm">
              <Icon name="ph:eraser-bold" />
              Limpar
            </button>
            <button type="submit" class="submit-btn" :disabled="loading || !emailsInput.trim()">
              <Icon v-if="loading" name="ph:spinner-bold" class="spin" />
              <Icon v-else name="ph:database-bold" />
              {{ loading ? 'Processando...' : 'Liberar acesso pago' }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="processed.length" class="results-card">
        <div class="results-header">
          <h2>Resultado</h2>
          <span>{{ processed.length }} processado{{ processed.length > 1 ? 's' : '' }}</span>
        </div>

        <div class="results-list">
          <div v-for="entry in processed" :key="entry.email" class="result-row">
            <div>
              <strong>{{ entry.email }}</strong>
              <p>{{ entry.role }} / {{ entry.status }}</p>
            </div>
            <span class="result-badge" :class="entry.action">
              {{ actionLabel(entry.action) }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface ProcessedEntry {
  email: string
  action: 'created' | 'updated' | 'already_active'
  status: 'active'
  role: 'paid'
}

const adminEmail = ref('')
const emailsInput = ref('')
const emailCount = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const processed = ref<ProcessedEntry[]>([])

const extractEmailCount = (text: string): number => {
  const matches = text.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []
  return new Set(matches).size
}

const updateCount = () => {
  emailCount.value = extractEmailCount(emailsInput.value)
}

const actionLabel = (action: string) => {
  if (action === 'created') return 'criado'
  if (action === 'updated') return 'atualizado'
  return 'já ativo'
}

const clearForm = () => {
  emailsInput.value = ''
  emailCount.value = 0
  errorMessage.value = ''
  successMessage.value = ''
  processed.value = []
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  processed.value = []

  if (!emailsInput.value.trim()) {
    errorMessage.value = 'Cole ao menos um e-mail para processar.'
    return
  }

  loading.value = true

  try {
    const response = await $fetch<{
      processedCount: number
      processed: ProcessedEntry[]
    }>('/api/admin/subscriptions/approve', {
      method: 'POST',
      body: { emails: emailsInput.value }
    })

    processed.value = response.processed
    successMessage.value = `${response.processedCount} e-mail(s) processado(s) com sucesso.`
    emailsInput.value = ''
    emailCount.value = 0
  } catch (err: any) {
    if (err?.status === 401) {
      await navigateTo('/admin/login')
      return
    }
    errorMessage.value = err?.data?.message || 'Falha ao atualizar os acessos.'
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

onMounted(async () => {
  try {
    const me = await $fetch<{ adminEmail: string }>('/api/admin/me')
    adminEmail.value = me.adminEmail
  } catch {
    await navigateTo('/admin/login')
  }
})

useHead({ title: 'Admin – Irmandade Club' })
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
  max-width: 920px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

.admin-header,
.admin-card,
.results-card {
  background: var(--adm-surface);
  backdrop-filter: blur(14px);
  border: 1px solid var(--adm-border);
  border-radius: 20px;
  box-shadow: var(--adm-shadow);
  animation: admin-fade-up 0.55s var(--adm-ease) both;
}

.admin-card { animation-delay: 80ms; }
.results-card { animation-delay: 120ms; }

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

.admin-header h1 {
  margin: 0;
  color: #fff;
  font-size: 28px;
  line-height: 1.2;
}

.description {
  margin: 12px 0 0;
  color: #9b9b9b;
  max-width: 560px;
  line-height: 1.6;
  font-size: 14px;
}

.description strong {
  color: #ccc;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-shrink: 0;
}

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

.back-link:hover {
  border-color: #00ccff;
}

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

.logout-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.admin-card,
.results-card {
  padding: 28px 30px;
}

.current-user {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ccc;
  margin-bottom: 24px;
  padding: 14px 16px;
  background: #151515;
  border: 1px solid #272727;
  border-radius: 14px;
  font-size: 14px;
}

.current-user :deep(svg) {
  color: #10b981;
  font-size: 18px;
  flex-shrink: 0;
}

.current-user strong {
  color: #fff;
}

.admin-form {
  display: grid;
  gap: 14px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.label-row label {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.email-counter {
  font-size: 12px;
  font-weight: 700;
  color: #00ccff;
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid rgba(0, 204, 255, 0.2);
  padding: 4px 10px;
  border-radius: 999px;
}

.admin-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #333;
  border-radius: 16px;
  background: #0f0f0f;
  color: #fff;
  padding: 18px;
  font-size: 15px;
  resize: vertical;
  min-height: 220px;
  outline: none;
  font-family: inherit;
  line-height: 1.6;
}

.admin-form textarea:focus {
  border-color: #00ccff;
  box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.12);
}

.helper-text {
  margin: 0;
  color: #8f8f8f;
  font-size: 13px;
  line-height: 1.5;
}

.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 14px;
}

.error-message {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
}

.success-message {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.28);
  color: #86efac;
}

.form-actions {
  display: flex;
  gap: 12px;
}

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

.clear-btn:hover:not(:disabled) {
  border-color: #555;
  color: #ccc;
}

.clear-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

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
  transition: opacity 0.2s;
}

.submit-btn {
  box-shadow: 0 6px 22px rgba(0, 204, 255, 0.2);
  transition: opacity 0.2s, transform 0.2s var(--adm-ease), box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(0, 204, 255, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.spin {
  animation: spin 0.9s linear infinite;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.results-header h2 {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.results-header span {
  color: #9f9f9f;
  font-size: 14px;
}

.results-list {
  display: grid;
  gap: 12px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: var(--adm-surface-raised);
  border: 1px solid var(--adm-border);
  animation: admin-fade-up 0.4s var(--adm-ease) both;
  transition: border-color 0.18s;
}

.result-row:hover {
  border-color: var(--adm-border-strong);
}

.results-list .result-row:nth-child(1) { animation-delay: 0ms; }
.results-list .result-row:nth-child(2) { animation-delay: 40ms; }
.results-list .result-row:nth-child(3) { animation-delay: 80ms; }
.results-list .result-row:nth-child(4) { animation-delay: 120ms; }
.results-list .result-row:nth-child(n+5) { animation-delay: 160ms; }

.result-row strong {
  color: #fff;
  font-size: 14px;
  word-break: break-all;
}

.result-row p {
  margin: 6px 0 0;
  color: #8f8f8f;
  font-size: 12px;
  text-transform: lowercase;
}

.result-badge {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}

.result-badge.created {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.result-badge.updated {
  background: rgba(0, 204, 255, 0.14);
  color: #7dd3fc;
}

.result-badge.already_active {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .admin-header,
  .admin-card,
  .results-card {
    padding: 22px;
  }

  .admin-header {
    flex-direction: column;
  }

  .admin-header h1 {
    font-size: 22px;
  }

  .form-actions {
    flex-direction: column;
  }

  .result-row,
  .results-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
