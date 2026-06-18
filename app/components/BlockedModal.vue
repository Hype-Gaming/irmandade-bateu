<template>
  <Teleport to="body">
    <div v-if="isBlocked" class="blocked-modal-overlay">
      <div class="blocked-art-card">
        <button class="close-x" aria-label="Sair" @click="handleExit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <!-- A arte aparece inteira; o botão de suporte fica na faixa abaixo -->
        <img :src="artUrl" alt="Acesso bloqueado" class="blocked-art" />

        <div class="blocked-actions">
          <a :href="supportUrl" target="_blank" class="support-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            Falar com suporte
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { SUPPORT_WHATSAPP_URL } from '../../shared/support'

const supportUrl = SUPPORT_WHATSAPP_URL
const artUrl = '/acesso-bloqueado.png' // coloque a arte em public/acesso-bloqueado.png
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
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 20px;
  backdrop-filter: blur(10px);
}

/* card: arte inteira em cima, faixa de botões embaixo */
.blocked-art-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 92vh;
  border-radius: 20px;
  overflow: hidden;
  background: #0a0a0a;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  animation: blocked-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.blocked-art {
  display: block;
  width: 100%;
  height: auto;
  max-height: calc(92vh - 150px); /* arte inteira e ainda sobra espaço pros botões */
  object-fit: contain;
  min-height: 0;
}

/* botões numa faixa preta abaixo da arte (não cobrem a imagem) */
.blocked-actions {
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #0a0a0a;
  flex-shrink: 0;
}

.support-button {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
  width: 100%;
  padding: 17px 24px;
  background: linear-gradient(135deg, #2bea73 0%, #20c75f 45%, #16a34a 100%);
  color: #fff;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.2px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  text-decoration: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  /* borda interna de luz no topo + glow externo pulsante */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 8px 24px rgba(37, 211, 102, 0.38);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease, filter 0.22s ease;
  animation: support-glow 2.6s ease-in-out infinite;
}

/* reflexo que varre o botão */
.support-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -60%;
  width: 45%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: skewX(-18deg);
  animation: support-shine 3.4s ease-in-out infinite;
  pointer-events: none;
}

.support-button:hover {
  transform: translateY(-2px) scale(1.015);
  filter: brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 12px 34px rgba(37, 211, 102, 0.55);
}

.support-button:active {
  transform: translateY(0) scale(0.99);
}

.support-button svg {
  width: 21px;
  height: 21px;
}

@keyframes support-glow {
  0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px rgba(37,211,102,0.32); }
  50%      { box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 30px rgba(37,211,102,0.6); }
}

@keyframes support-shine {
  0%   { left: -60%; }
  55%  { left: 130%; }
  100% { left: 130%; }
}

.close-x {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.close-x svg {
  width: 18px;
  height: 18px;
}

.close-x:hover {
  background: rgba(239, 68, 68, 0.9);
  border-color: rgba(239, 68, 68, 0.9);
  transform: scale(1.08) rotate(90deg);
}

@keyframes blocked-pop {
  from { opacity: 0; transform: scale(0.92) translateY(14px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .blocked-art-card,
  .support-button,
  .support-button::before { animation: none; }
}
</style>
