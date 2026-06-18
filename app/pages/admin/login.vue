<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <Icon name="ph:shield-check-bold" class="shield-icon" />
        <h1>Painel Admin</h1>
        <p>Irmandade Club</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label for="email">E-mail</label>
          <div class="input-wrap">
            <Icon name="ph:envelope-bold" class="input-icon" />
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="admin@email.com"
              autocomplete="email"
              :disabled="loading"
            />
          </div>
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <div class="input-wrap">
            <Icon name="ph:lock-bold" class="input-icon" />
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-msg">
          <Icon name="ph:warning-circle-bold" />
          <span>{{ errorMessage }}</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading || !email || !password">
          <Icon v-if="loading" name="ph:spinner-bold" class="spin" />
          <Icon v-else name="ph:sign-in-bold" />
          {{ loading ? 'Entrando...' : 'Entrar no painel' }}
        </button>
      </form>

      <NuxtLink to="/" class="back-link">
        <Icon name="ph:arrow-left-bold" />
        Voltar para o app
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await navigateTo('/admin/webhook')
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Credenciais inválidas.'
  } finally {
    loading.value = false
  }
}

useHead({ title: 'Admin Login – Irmandade Club' })
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--adm-aurora);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--adm-surface);
  backdrop-filter: blur(16px);
  border: 1px solid var(--adm-border);
  border-radius: 20px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  box-shadow: var(--adm-shadow-lift);
  animation: admin-fade-up 0.6s var(--adm-ease) both;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.shield-icon {
  font-size: 40px;
  color: #00ccff;
  filter: drop-shadow(0 0 14px rgba(0, 204, 255, 0.5));
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.login-header p {
  font-size: 13px;
  color: #555;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}

.input-wrap {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #555;
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  padding: 13px 14px 13px 40px;
  background: #0f0f0f;
  border: 1px solid #333;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input-wrap input:focus {
  border-color: #00ccff;
  box-shadow: 0 0 0 3px rgba(0, 204, 255, 0.12);
}

.input-wrap input::placeholder {
  color: #444;
}

.input-wrap input:disabled {
  opacity: 0.5;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #fca5a5;
  font-size: 13px;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #00ccff 0%, #0088cc 100%);
  color: #000;
  font-size: 15px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 4px;
}

.submit-btn {
  box-shadow: 0 6px 22px rgba(0, 204, 255, 0.22);
  transition: opacity 0.2s, transform 0.2s var(--adm-ease), box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(0, 204, 255, 0.32);
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

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #555;
  text-decoration: none;
  font-size: 13px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #888;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
