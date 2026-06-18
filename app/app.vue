<template>
  <div id="app">
    <PageLoader />
    <NuxtPage />
    <UpdateNotification />
    <KycModal :show="showKycModal" @logout="handleKycLogout" />
    <BlockedModal />
  </div>
</template>

<script setup lang="ts">
const { needsKyc, kycChecked, isAuthenticated, logout, fetchUserProfile } = useAuth()
const route = useRoute()

// Mostrar modal de KYC quando necessário (apenas em rotas autenticadas e após verificação)
const showKycModal = computed(() => {
  const isAuthRoute = route.path.startsWith('/auth')
  // Só mostra se: está autenticado, KYC já foi verificado, precisa de KYC, e não está em rota de auth
  return isAuthenticated.value && kycChecked.value && needsKyc.value && !isAuthRoute
})

// Verificar KYC ao carregar a página
onMounted(async () => {
  if (isAuthenticated.value) {
    await fetchUserProfile()
  }
})

// Observar mudanças na rota para verificar KYC
watch(() => route.path, async () => {
  if (isAuthenticated.value && !route.path.startsWith('/auth')) {
    await fetchUserProfile()
  }
})

const handleKycLogout = async () => {
  await logout()
}

// Componente raiz da aplicação Nuxt
useHead({
  title: 'Irmandade Club',
  meta: [
    { name: 'description', content: 'Irmandade Club - Sua comunidade de estratégias' }
  ]
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>

