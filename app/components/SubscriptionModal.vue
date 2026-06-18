<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-logo">
              <Icon name="ph:crown-simple-bold" class="crown-icon" />
              <span>Irmandade Club</span>
            </div>
          </div>

          <div class="modal-body">
            <h2>Desbloqueie o acesso completo</h2>
            <p>Digite seu e-mail para verificar sua assinatura ativa.</p>

            <div class="input-group">
              <Icon name="ph:envelope-bold" class="input-icon" />
              <input
                v-model="emailInput"
                type="email"
                placeholder="seu@email.com"
                class="email-input"
                @keydown.enter="handleCheck"
              />
            </div>

            <p v-if="error" class="error-msg">{{ error }}</p>
            <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

            <button class="btn-verificar" :disabled="checking || !emailInput" @click="handleCheck">
              <Icon v-if="checking" name="ph:spinner-bold" class="spin" />
              <Icon v-else name="ph:check-circle-bold" />
              {{ checking ? 'Verificando...' : 'Verificar Acesso' }}
            </button>

            <div class="divider">
              <span>ou</span>
            </div>

            <a
              v-if="checkoutUrl"
              :href="checkoutUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-assinar"
              @click="dismissModal"
            >
              <Icon name="ph:shopping-cart-bold" />
              Assinar Agora
            </a>

            <div v-else class="checkout-indisponivel">
              <Icon name="ph:clock-bold" />
              <span>Link de checkout em breve</span>
            </div>
          </div>

          <button class="btn-fechar" @click="dismissModal">
            Continuar sem assinar
            <Icon name="ph:arrow-right-bold" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { showModal, checking, error, checkSubscription, dismissModal } = useSubscription()

const checkoutUrl = 'https://lastlink.com/p/C80B167D8/checkout-payment'

const emailInput = ref('')
const successMsg = ref('')

const handleCheck = async () => {
  if (!emailInput.value) return
  successMsg.value = ''

  const active = await checkSubscription(emailInput.value)
  if (active) {
    successMsg.value = 'Assinatura ativa! Acesso liberado.'
    setTimeout(() => dismissModal(), 1200)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal {
  background: #111;
  border: 1px solid #222;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  animation: modalIn 0.3s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  background: linear-gradient(135deg, #0a1a2a 0%, #001a30 100%);
  border-bottom: 1px solid #1a2a3a;
  padding: 20px 24px;
}

.modal-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.crown-icon {
  font-size: 24px;
  color: #00ccff;
}

.modal-body {
  padding: 28px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-body h2 {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.modal-body > p {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #555;
}

.email-input {
  width: 100%;
  padding: 14px 14px 14px 42px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.email-input:focus {
  border-color: #00ccff;
}

.email-input::placeholder {
  color: #555;
}

.error-msg {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
}

.success-msg {
  font-size: 13px;
  color: #10b981;
  margin: 0;
  padding: 10px 12px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
}

.btn-verificar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #00ccff;
  color: #000;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-verificar:hover:not(:disabled) {
  background: #00b8e6;
}

.btn-verificar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #444;
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #222;
}

.btn-assinar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 1px solid #00ccff;
  color: #00ccff;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.btn-assinar:hover {
  background: rgba(0, 204, 255, 0.08);
}

.checkout-indisponivel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #1a1a1a;
  border: 1px dashed #333;
  border-radius: 10px;
  color: #555;
  font-size: 13px;
}

.btn-fechar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  border-top: 1px solid #1a1a1a;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-fechar:hover {
  color: #888;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
