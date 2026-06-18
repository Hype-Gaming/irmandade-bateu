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
