<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="header">
      <NuxtLink to="/" aria-label="Irmandade Club">
        <img src="/logo.png" alt="Irmandade Club" class="header-logo" />
      </NuxtLink>

      <div class="header-right">
        <div class="balance">
          <Icon name="ph:wallet-bold" class="balance-icon" />
          <span class="balance-value">{{ formattedBalance }}</span>
          <Icon name="ph:info-bold" class="balance-info" @click="handleDepositClick" />
        </div>

        <button class="btn-deposit" @click="handleDepositClick">
          Depositar
        </button>

        <div class="profile-wrapper">
          <div class="profile-icon" @click="toggleProfileDropdown">
            <Icon name="ph:user-bold" />
          </div>

          <div v-if="showProfileDropdown" class="profile-dropdown">
            <div class="dropdown-user">
              <span class="user-name">{{ user?.name || 'Usuário' }}</span>
              <span class="user-email">{{ user?.email || '' }}</span>
            </div>

            <NuxtLink to="/gestao" class="dropdown-item" @click="guardRoute">
              <Icon name="ph:calculator-bold" />
              Gestão
            </NuxtLink>

            <NuxtLink to="/aulas" class="dropdown-item" @click="guardRoute">
              <Icon name="ph:graduation-cap-bold" />
              Aulas
            </NuxtLink>

            <button v-if="isAuthenticated" class="dropdown-item logout" @click="handleLogout">
              <Icon name="ph:sign-out-bold" />
              Sair
            </button>
            <button v-else class="dropdown-item" @click="redirectToLogin">
              <Icon name="ph:sign-in-bold" />
              Entrar
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar">
        <button v-if="!isPaid" class="btn-confirmar-compra" @click="handleSubscriptionClick">
          <Icon name="ph:lock-open-bold" />
          Confirmar compra
        </button>

        <h3 class="sidebar-title">Avisos</h3>

        <div class="news-card featured">
          <div class="news-badge">IA</div>
          <div class="news-title-big">Club</div>
        </div>

        <!-- Ativar notificações push (default/granted e ainda não inscrito) -->
        <button
          v-if="showPushPrompt"
          class="push-prompt"
          :disabled="pushLoading"
          @click="handleEnablePush"
        >
          <div class="push-prompt-icon">
            <Icon :name="pushLoading ? 'ph:spinner-bold' : 'ph:bell-ringing-bold'" :class="{ spin: pushLoading }" />
          </div>
          <div class="push-prompt-text">
            <strong>Ativar notificações</strong>
            <span v-if="pushError" class="push-prompt-error">{{ pushError }}</span>
            <span v-else>Receba avisos e sinais em primeira mão</span>
          </div>
        </button>

        <!-- Permissão bloqueada: explica como desbloquear -->
        <div v-else-if="pushBlocked" class="push-prompt push-blocked">
          <div class="push-prompt-icon">
            <Icon name="ph:bell-slash-bold" />
          </div>
          <div class="push-prompt-text">
            <strong>Notificações bloqueadas</strong>
            <span>Toque no 🔒 ao lado do endereço → Notificações → Permitir, e recarregue a página.</span>
          </div>
        </div>

        <!-- Banner: Entre no grupo do Telegram (dispensável) -->
        <a
          v-if="showTelegramBanner"
          href="https://t.me/+cRvtg60llV4xMGUx"
          target="_blank"
          rel="noopener noreferrer"
          class="telegram-banner"
        >
          <button
            class="telegram-banner-close"
            aria-label="Fechar aviso"
            @click.prevent.stop="dismissTelegramBanner"
          >
            <Icon name="ph:x-bold" />
          </button>
          <img src="/banners/telegram.png" alt="Acesse meu grupo no Telegram" class="telegram-banner-img" />
        </a>

        <a
          v-for="(news, index) in newsItems"
          :key="index"
          :href="news.href || '#'"
          :target="news.external ? '_blank' : undefined"
          :rel="news.external ? 'noopener noreferrer' : undefined"
          class="news-item"
          @click="handleNewsClick($event, news)"
        >
          <div class="news-icon">
            <Icon :name="news.icon" class="news-icon-svg" />
          </div>
          <div class="news-content">
            <h4 class="news-title">{{ news.title }}</h4>
            <p class="news-description">{{ news.description }}</p>
          </div>
        </a>
      </aside>

      <!-- Center Content -->
      <div class="center-content">
        <!-- Banner Carousel -->
        <div class="banner-carousel">
          <button v-if="banners.length > 1" class="carousel-btn prev" @click="prevBanner">
            <Icon name="ph:caret-left-bold" />
          </button>
          <div class="banner-slides">
            <div 
              class="banner-slide" 
              v-for="(banner, index) in banners" 
              :key="index"
              :class="{ active: currentBanner === index }"
            >
              <a v-if="banner.href" :href="banner.href" target="_blank" rel="noopener noreferrer" class="banner-link">
                <img :src="banner.image" :alt="banner.alt" />
              </a>
              <img v-else :src="banner.image" :alt="banner.alt" />
            </div>
          </div>
          <button v-if="banners.length > 1" class="carousel-btn next" @click="nextBanner">
            <Icon name="ph:caret-right-bold" />
          </button>
          <div v-if="banners.length > 1" class="carousel-dots">
            <span 
              class="dot" 
              v-for="(banner, index) in banners" 
              :key="index"
              :class="{ active: currentBanner === index }"
              @click="currentBanner = index"
            ></span>
          </div>
        </div>

        <!-- Hero Title -->
        <div class="hero-title-wrapper">
          <h1 class="hero-title">
            <Icon name="ph:brain-bold" class="hero-title-icon" />
            Opere agora com Inteligência Artificial
          </h1>
          <div class="hero-title-underline"></div>
        </div>

        <!-- IA Prime -->
        <div class="games-section">
          <div class="games-header">
            <h2 class="games-title">
              <Icon name="ph:sparkle-bold" class="title-icon" />
              Inteligência Artificial Prime
            </h2>
          </div>
          <div class="games-grid">
            <NuxtLink 
              :to="game.href"
              class="game-card" 
              v-for="(game, index) in primeGames" 
              :key="index"
              @click="guardRoute"
            >
              <div class="game-image">
                <img :src="game.image" :alt="game.name" v-if="game.image" />
              </div>
              <div class="game-info">
                <h3 class="game-name">{{ game.name }}</h3>
                <span class="game-provider" v-if="game.provider">
                  <Icon name="ph:play-fill" class="provider-icon" /> {{ game.provider }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- IA Premium -->
        <div class="games-section premium-section">
          <div class="games-header">
            <h2 class="games-title">
              <Icon name="ph:crown-bold" class="title-icon title-icon-premium" />
              Inteligência Artificial Premium
            </h2>
          </div>
          <div class="games-grid">
            <a
              :href="isSubscribed ? `/jogo/${game.id}` : checkoutUrl"
              :target="isSubscribed ? '_self' : '_blank'"
              rel="noopener noreferrer"
              class="game-card card-premium-locked"
              :class="{ 'is-locked': !isPaid }"
              v-for="(game, index) in premiumGames"
              :key="index"
              @click="handleLockedGameClick($event, game.id)"
            >
              <div class="game-image">
                <img :src="game.image" :alt="game.name" v-if="game.image" />
                <div v-if="!isPaid" class="permanent-lock premium-lock">
                  <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                </div>
              </div>
              <div class="game-info">
                <h3 class="game-name">{{ game.name }}</h3>
                <span v-if="!isPaid" class="game-provider game-unlock">
                  <Icon name="ph:lock-bold" class="provider-icon" /> Desbloquear acesso
                </span>
                <span v-else class="game-provider game-unlocked">
                  <Icon name="ph:play-fill" class="provider-icon" /> Acessar agora
                </span>
              </div>
            </a>
          </div>
        </div>

        <!-- IA Claude -->
        <div class="games-section claude-section">
          <div class="games-header">
            <h2 class="games-title">
              <Icon name="ph:lightning-fill" class="title-icon title-icon-claude" />
              IA Claude – Operações Sem Gale
            </h2>
          </div>
          <div class="games-grid">
            <a
              :href="isSubscribed ? `/jogo/${game.id}` : claudeCheckoutUrl"
              :target="isSubscribed ? '_self' : '_blank'"
              rel="noopener noreferrer"
              class="game-card card-claude-locked"
              :class="{ 'is-locked': !isPaid }"
              v-for="(game, index) in claudeGames"
              :key="index"
              @click="handleLockedGameClick($event, game.id)"
            >
              <div class="game-image">
                <img :src="game.image" :alt="game.name" v-if="game.image" />
                <div v-if="!isPaid" class="permanent-lock claude-lock">
                  <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                </div>
              </div>
              <div class="game-info">
                <h3 class="game-name">{{ game.name }}</h3>
                <span v-if="!isPaid" class="game-provider game-unlock">
                  <Icon name="ph:lock-bold" class="provider-icon" /> Desbloquear acesso
                </span>
                <span v-else class="game-provider game-unlocked">
                  <Icon name="ph:play-fill" class="provider-icon" /> Acessar agora
                </span>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>

    <!-- Deposit Modal -->
    <DepositModal />

    <!-- Subscription Modal -->
    <SubscriptionModal />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user, logout, isAuthenticated, formattedBalance, fetchUserProfile } = useAuth()
const { openModal: openDepositModal } = useDeposit()
const { isSubscribed, isPaid, init: initSubscription, openModal } = useSubscription()

const checkoutUrl = 'https://lastlink.com/p/C80B167D8/checkout-payment'
const claudeCheckoutUrl = 'https://lastlink.com/p/CE43F037E/checkout-payment'

const refreshSubscriptionAccess = async (force = false) => {
  if (!isAuthenticated.value) return
  await initSubscription(user.value?.email || null, { force })
}

const handleWindowFocus = () => {
  refreshSubscriptionAccess(true)
}

// Atualizar balance e verificar assinatura ao montar a página
// Banner do grupo do Telegram (dispensável via localStorage)
const TELEGRAM_BANNER_KEY = 'telegram-banner-dismissed'
const showTelegramBanner = ref(false)

const dismissTelegramBanner = () => {
  showTelegramBanner.value = false
  if (import.meta.client) {
    localStorage.setItem(TELEGRAM_BANNER_KEY, '1')
  }
}

// Notificações push (web push)
const {
  permission: pushPermission,
  isSubscribed: pushSubscribed,
  loading: pushLoading,
  error: pushError,
  refresh: refreshPush,
  subscribe: subscribePush
} = usePush()

// Botão de ativar: aparece quando a permissão permite pedir (default/granted) e
// ainda não está inscrito.
const showPushPrompt = computed(() =>
  (pushPermission.value === 'default' || pushPermission.value === 'granted') &&
  !pushSubscribed.value
)

// Permissão bloqueada de vez pelo navegador: mostra instruções de desbloqueio.
const pushBlocked = computed(() => pushPermission.value === 'denied')

const handleEnablePush = async () => {
  await subscribePush(user.value?.email || null)
}

onMounted(() => {
  if (isAuthenticated.value) {
    fetchUserProfile()
  }
  refreshSubscriptionAccess()

  showTelegramBanner.value = localStorage.getItem(TELEGRAM_BANNER_KEY) !== '1'
  refreshPush(user.value?.email || null)

  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('pageshow', handleWindowFocus)
})

const banners = ref([
  { image: '/banners/ENTRE-NA-MINHA-COMUNIDADE-LC.png', alt: 'Sorteio diário no WhatsApp', href: 'https://chat.whatsapp.com/CG4CPX8zJqJ55G2qVoUMJq?s=sh&p=i&ilr=1' }
])

const currentBanner = ref(0)
const showProfileDropdown = ref(false)

const toggleProfileDropdown = () => {
  if (!isAuthenticated.value) {
    redirectToLogin()
    return
  }
  showProfileDropdown.value = !showProfileDropdown.value
}

const redirectToLogin = () => {
  showProfileDropdown.value = false
  return navigateTo('/auth/login')
}

const requireAuth = (event?: Event) => {
  if (isAuthenticated.value) return true
  event?.preventDefault()
  redirectToLogin()
  return false
}

const guardRoute = (event: Event) => {
  requireAuth(event)
}

const handleDepositClick = () => {
  if (!requireAuth()) return
  openDepositModal()
}

const handleSubscriptionClick = () => {
  if (!requireAuth()) return
  openModal()
}

const handleLockedGameClick = (event: Event, gameId: string) => {
  event.preventDefault()

  if (!requireAuth(event)) return

  if (isSubscribed.value) {
    navigateTo(`/jogo/${gameId}`)
    return
  }

  window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
}

const handleNewsClick = (event: Event, news: { href?: string; external?: boolean }) => {
  if (news.external) return

  const href = news.href || '#'
  if (href === '#') {
    event.preventDefault()
  }

  requireAuth(event)
}

// Fechar dropdown ao clicar fora
const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.profile-wrapper')) {
    showProfileDropdown.value = false
  }
}

const handleLogout = async () => {
  showProfileDropdown.value = false
  await logout()
}

const nextBanner = () => {
  currentBanner.value = (currentBanner.value + 1) % banners.value.length
}

const prevBanner = () => {
  currentBanner.value = currentBanner.value === 0 
    ? banners.value.length - 1 
    : currentBanner.value - 1
}

// Auto-slide every 5 seconds
onMounted(() => {
  setInterval(() => {
    nextBanner()
  }, 5000)
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('pageshow', handleWindowFocus)
})

const newsItems = ref([
  {
    title: 'Nova estratégia liberada',
    description: 'Entrou no ar uma nova estratégia para o jogo Evolution Gaming!',
    icon: 'ph:lightning-bold',
    href: '#'
  },
  {
    title: 'Novo Canal de Lives',
    description: 'Confira o novo canal de lives com análises em tempo real.',
    icon: 'ph:video-camera-bold',
    href: 'https://t.me/+cRvtg60llV4xMGUx',
    external: true
  },
  {
    title: 'Atualização nas odds',
    description: 'Veja o novo ajuste nas odds do Evolution Gaming. Aproveite!',
    icon: 'ph:chart-line-up-bold',
    href: '#'
  },
  {
    title: 'Comunidade WhatsApp',
    description: 'Participe da nossa comunidade exclusiva no WhatsApp.',
    icon: 'ph:whatsapp-logo-bold',
    href: '#'
  },
  {
    title: 'Aprenda a Operar',
    description: 'Confira as melhores estratégias para começar a operar.',
    icon: 'ph:graduation-cap-bold',
    href: '/aulas'
  }
])

const primeGames = ref([
  {
    id: 'bac-bo-en',
    name: 'BAC BO EN',
    provider: 'Evolution',
    image: '/games/bac-bo-en.png',
    href: '/jogo/bac-bo-en'
  }
])

const premiumGames = ref([
  {
    id: 'bac-bo-brasileiro',
    name: 'BAC BO BRASILEIRO',
    image: '/games/bac-bo-ao-vivo.png'
  },
  {
    id: 'football-studio',
    name: 'FOOTBALL STUDIO',
    image: '/games/football-studio.png'
  },
  {
    id: 'baccarat',
    name: 'BACCARAT',
    image: '/games/baccarat.png'
  },
  {
    id: 'dragon-tiger',
    name: 'DRAGON TIGER',
    image: '/games/dragon-tiger.png'
  },
  {
    id: 'aviator',
    name: 'AVIATOR',
    image: '/games/aviator.png'
  }
])

const claudeGames = ref([
  {
    id: 'bac-bo-sem-gale',
    name: 'BAC BO — SINAL SEM GALE',
    image: '/games/bac-bo-ao-vivo.png'
  }
])

</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #0a0a0a;
  color: #ffffff;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: #111111;
  border-bottom: 1px solid #222222;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-logo {
  height: 40px;
  width: auto;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.balance {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #333333;
}

.balance-icon {
  font-size: 18px;
  color: #00ccff;
}

.balance-value {
  color: #00ccff;
  font-weight: 600;
}

.balance-info {
  font-size: 16px;
  color: #666666;
  cursor: pointer;
  transition: color 0.2s;
}

.balance-info:hover {
  color: #00ccff;
}

.btn-deposit {
  padding: 12px 24px;
  background: linear-gradient(135deg, #00ccff 0%, #0099cc 100%);
  border: none;
  border-radius: 8px;
  color: #000000;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-deposit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 204, 255, 0.4);
}

.profile-wrapper {
  position: relative;
}

.profile-icon {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #00ccff 0%, #0099cc 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s ease;
}

.profile-icon:hover {
  transform: scale(1.05);
}

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 160px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.user-email {
  font-size: 12px;
  color: #888;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s ease;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #222;
}

.dropdown-item.logout {
  color: #ef4444;
}

.dropdown-item.logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Main Content */
.main-content {
  display: flex;
  padding: 24px;
  gap: 24px;
}

/* Sidebar */
.sidebar {
  width: 280px;
  flex-shrink: 0;
}

.btn-confirmar-compra {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 204, 255, 0.08);
  border: 1px solid rgba(0, 204, 255, 0.3);
  border-radius: 10px;
  color: #00ccff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.2s ease;
}

.btn-confirmar-compra:hover {
  background: rgba(0, 204, 255, 0.15);
  border-color: #00ccff;
}

.sidebar-title {
  color: #00ccff;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.news-card.featured {
  background: linear-gradient(135deg, #001a2a 0%, #002a3a 100%);
  border: 1px solid #00ccff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  text-align: center;
}

.news-badge {
  color: #00ccff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.news-title-big {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
}

.telegram-banner {
  position: relative;
  display: block;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid #222222;
  transition: all 0.2s ease;
  text-decoration: none;
  line-height: 0;
}

.telegram-banner:hover {
  border-color: #00ccff;
  box-shadow: 0 0 16px rgba(0, 204, 255, 0.25);
}

.telegram-banner-img {
  width: 100%;
  height: auto;
  display: block;
}

.telegram-banner-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  z-index: 2;
}

.telegram-banner-close:hover {
  background: rgba(0, 0, 0, 0.8);
}

.telegram-banner-close :deep(svg) {
  font-size: 14px;
}

.push-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #001a2a 0%, #00263a 100%);
  border: 1px solid rgba(0, 204, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.push-prompt:hover:not(:disabled) {
  border-color: #00ccff;
  box-shadow: 0 0 16px rgba(0, 204, 255, 0.2);
}

.push-prompt:disabled {
  opacity: 0.7;
  cursor: default;
}

.push-prompt-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(0, 204, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.push-prompt-icon :deep(svg) {
  font-size: 22px;
  color: #00ccff;
}

.push-prompt-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.push-prompt-text strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
}

.push-prompt-text span {
  color: #9bbccc;
  font-size: 12px;
  line-height: 1.3;
}

.push-prompt-text .push-prompt-error {
  color: #fca5a5;
}

.push-blocked {
  cursor: default;
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(135deg, #2a0d0d 0%, #1a0a0a 100%);
}

.push-blocked .push-prompt-icon {
  background: rgba(239, 68, 68, 0.15);
}

.push-blocked .push-prompt-icon :deep(svg) {
  color: #fca5a5;
}

.push-prompt .spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.news-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background-color: #141414;
  border-radius: 10px;
  margin-bottom: 10px;
  border: 1px solid #222222;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.news-item:hover {
  border-color: #00ccff;
  background-color: #1a1a1a;
}

.news-icon {
  width: 48px;
  height: 48px;
  background-color: #222222;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.news-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.news-icon-svg {
  font-size: 24px;
  color: #00ccff;
}

.news-content {
  flex: 1;
}

.news-title {
  color: #00ccff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.news-description {
  color: #888888;
  font-size: 12px;
  margin: 0;
  line-height: 1.4;
}

/* Center Content */
.center-content {
  flex: 1;
}

/* Banner Carousel */
.banner-carousel {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 32px;
}

.banner-slides {
  position: relative;
  width: 100%;
}

.banner-slide {
  display: none;
}

.banner-slide.active {
  display: block;
}

.banner-slide a {
  display: block;
  line-height: 0;
}

.banner-slide img {
  width: 100%;
  height: auto;
  display: block;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid #444444;
  border-radius: 50%;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  z-index: 3;
  transition: all 0.2s ease;
}

.carousel-btn:hover {
  background-color: rgba(0, 204, 255, 0.3);
  border-color: #00ccff;
}

.carousel-btn.prev {
  left: 16px;
}

.carousel-btn.next {
  right: 16px;
}

.carousel-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 3;
}

.dot {
  width: 10px;
  height: 10px;
  background-color: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  width: 24px;
  border-radius: 5px;
  background-color: #ffffff;
}

/* Hero Title */
.hero-title-wrapper {
  margin: 8px 0 32px;
  text-align: center;
  position: relative;
}

.hero-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #ffffff 0%, #00ccff 50%, #ffffff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(0, 204, 255, 0.15);
}

.hero-title-icon {
  font-size: 30px;
  color: #00ccff;
  -webkit-text-fill-color: #00ccff;
  filter: drop-shadow(0 0 12px rgba(0, 204, 255, 0.6));
}

.hero-title-underline {
  margin: 14px auto 0;
  width: 140px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #00ccff 50%, transparent 100%);
  border-radius: 2px;
}

/* Games Section */
.games-section {
  margin-top: 24px;
}

.games-section + .games-section {
  margin-top: 40px;
}

.games-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.games-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 24px;
  color: #00ccff;
}

.games-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  background-color: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 8px;
  color: #888888;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  border-color: #00ccff;
  color: #00ccff;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.game-card {
  background-color: #141414;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #222222;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: block;
}

.game-card:hover {
  border-color: #00ccff;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 204, 255, 0.2);
}

.game-image {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background-color: #141414;
}

.game-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: 20px;
}

.card-locked:hover .locked-overlay {
  opacity: 1;
}

.lock-badge {
  width: 50px;
  height: 50px;
  background-color: rgba(0, 204, 255, 0.15);
  border: 2px solid #00ccff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.lock-icon {
  font-size: 28px;
  color: #00ccff;
}

.locked-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.locked-subtitle {
  color: #888888;
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.game-info {
  padding: 14px;
}

.game-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px 0;
}

.game-provider {
  font-size: 11px;
  color: #888888;
  display: flex;
  align-items: center;
  gap: 4px;
}

.provider-icon {
  font-size: 10px;
  color: #00ccff;
}

/* Permanent Lock (Premium / Claude) */
.permanent-lock {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  z-index: 2;
}

.permanent-lock-icon {
  font-size: 20px;
  color: #ffffff;
}

.premium-lock {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%);
  box-shadow: 0 4px 14px rgba(255, 140, 0, 0.45);
}

.claude-lock {
  background: linear-gradient(135deg, rgba(200, 120, 255, 0.95) 0%, rgba(140, 80, 230, 0.95) 100%);
  box-shadow: 0 4px 14px rgba(140, 80, 230, 0.45);
}

.game-unlocked {
  color: #10b981;
}

/* Premium cards */
.card-premium-locked .game-image {
  background: linear-gradient(135deg, #1a1405 0%, #2a1f08 100%);
  position: relative;
}

.card-premium-locked .game-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
  pointer-events: none;
}

.card-premium-locked.is-locked .game-image img {
  opacity: 0.34;
}

.card-premium-locked:hover {
  border-color: #ffb000;
  box-shadow: 0 8px 25px rgba(255, 176, 0, 0.25);
}

.title-icon-premium {
  color: #ffb000;
}

/* Claude cards */
.card-claude-locked .game-image {
  background: linear-gradient(135deg, #14091f 0%, #221035 100%);
  position: relative;
}

.card-claude-locked .game-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
  pointer-events: none;
}

.card-claude-locked.is-locked .game-image img {
  opacity: 0.34;
}

.card-claude-locked:hover {
  border-color: #c878ff;
  box-shadow: 0 8px 25px rgba(200, 120, 255, 0.25);
}

.title-icon-claude {
  color: #c878ff;
}

.game-unlock {
  color: #888888;
}

/* Section title icon */
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title-icon {
  font-size: 22px;
  color: #00ccff;
}

/* Links Úteis */
.links-section {
  margin-top: 40px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #00ccff;
  margin: 0 0 16px 0;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background-color: #141414;
  border: 1px solid #222222;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.link-card:hover {
  border-color: #00ccff;
  background-color: #1a1a1a;
}

.link-card.link-active {
  background: linear-gradient(135deg, #00ccff 0%, #00aa44 100%);
  border-color: transparent;
}

.link-card.link-active .link-icon,
.link-card.link-active .link-text {
  color: #000000;
}

.link-icon {
  font-size: 20px;
  color: #00ccff;
}

.link-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

/* Destaques */
.highlights-section {
  margin-top: 40px;
}

.highlights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.highlight-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #222222;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: block;
}

.highlight-card:hover {
  border-color: #00ccff;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 204, 255, 0.2);
}

.highlight-card img {
  width: 100%;
  height: auto;
  display: block;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    order: 2;
  }
  
  .center-content {
    order: 1;
  }
  
  .banner-content h1 {
    font-size: 36px;
  }
  
  .banner-content h2 {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .header {
    padding: 12px 16px;
  }
  
  .header-right {
    gap: 10px;
  }
  
  .balance {
    padding: 8px 12px;
  }
  
  .btn-deposit {
    padding: 10px 16px;
    font-size: 12px;
  }
  
  .main-content {
    padding: 16px;
  }

  .carousel-btn {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .carousel-btn.prev {
    left: 8px;
  }

  .carousel-btn.next {
    right: 8px;
  }
  
  .games-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .highlights-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-title {
    font-size: 20px;
    gap: 10px;
    padding: 0 12px;
  }

  .hero-title-icon {
    font-size: 24px;
  }

  .games-title {
    font-size: 17px;
  }
}

</style>
