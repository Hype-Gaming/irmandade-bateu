export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()

  // Área admin tem guarda própria (middleware 'admin' + 401 do server);
  // não exige login de usuário do app.
  if (to.path.startsWith('/admin')) {
    return
  }

  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/forgot-password']

  if (publicRoutes.includes(to.path)) {
    if (isAuthenticated.value && to.path === '/auth/login') {
      return navigateTo('/')
    }
    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }
})
