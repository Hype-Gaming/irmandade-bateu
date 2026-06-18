// Composable de Autenticação - Irmandade Club
// Integração com API Cactus

import { BRANDS, DEFAULT_BRAND, getBrand, getDefaultBrand } from '../../shared/brands'

// Tipos
export interface Wallet {
  id: number
  balance: number
  credit: number
  available_value: number
  user_id: number
  bonus: number
  withdraw_enabled: number
}

export interface User {
  id: number
  name: string
  email: string
  phone: string
  created_at: string
  is_active: number
  country: string
  currency: string
  first_name?: string
  last_name?: string
  wallet?: Wallet
  kyc_validated_at?: string | null
  document_number?: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
  cookie_key: number
  cookies_path: string
  brand_slug: string
  base_domain: string
  need_change_password: boolean
}

export interface UserProfileResponse extends User {
  wallet: Wallet
}

export interface AuthState {
  user: User | null
  token: string | null
  cookieKey: number | null
  isAuthenticated: boolean
  balance: number
  needsKyc: boolean
  kycChecked: boolean
  // Marca do usuário logado (login duplo / multi-marca)
  brandSlug: string
  baseDomain: string
  apiBaseUrl: string
  userCollection: string
}

// Estado global reativo
const authState = reactive<AuthState>({
  user: null,
  token: null,
  cookieKey: null,
  isAuthenticated: false,
  balance: 0,
  needsKyc: false,
  kycChecked: false,
  brandSlug: DEFAULT_BRAND.slug,
  baseDomain: DEFAULT_BRAND.baseDomain,
  apiBaseUrl: DEFAULT_BRAND.apiBaseUrl,
  userCollection: DEFAULT_BRAND.userCollection
})

export const useAuth = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Marca padrão ativa deste deploy (NUXT_PUBLIC_APP_BRAND). É o estado inicial
  // antes de qualquer login e o destino do clearAuth.
  const activeDefaultBrand = () =>
    getDefaultBrand(useRuntimeConfig().public.appBrand as string)

  const applyBrand = (brand: typeof DEFAULT_BRAND) => {
    authState.brandSlug = brand.slug
    authState.baseDomain = brand.baseDomain
    authState.apiBaseUrl = brand.apiBaseUrl
    authState.userCollection = brand.userCollection
  }

  // Carregar estado do localStorage ao inicializar
  const loadAuthState = () => {
    if (import.meta.client) {
      const savedAuth = localStorage.getItem('irmandade_auth')
      if (savedAuth) {
        try {
          const parsed = JSON.parse(savedAuth)
          authState.user = parsed.user
          authState.token = parsed.token
          authState.cookieKey = parsed.cookieKey
          authState.isAuthenticated = !!parsed.token
          authState.balance = parsed.balance || 0
          // Restaura a marca do usuário logado
          applyBrand(getBrand(parsed.brandSlug))
        } catch (e) {
          console.error('Erro ao carregar estado de autenticação:', e)
          clearAuth()
        }
      } else {
        // Sem sessão salva: parte da marca ativa do deploy.
        applyBrand(activeDefaultBrand())
      }
    }
  }

  // Salvar estado no localStorage
  const saveAuthState = () => {
    if (import.meta.client) {
      localStorage.setItem('irmandade_auth', JSON.stringify({
        user: authState.user,
        token: authState.token,
        cookieKey: authState.cookieKey,
        balance: authState.balance,
        brandSlug: authState.brandSlug
      }))
    }
  }

  // Limpar autenticação
  const clearAuth = () => {
    authState.user = null
    authState.token = null
    authState.cookieKey = null
    authState.isAuthenticated = false
    authState.balance = 0
    authState.needsKyc = false
    authState.kycChecked = false
    // Volta para a marca ativa do deploy
    applyBrand(activeDefaultBrand())
    if (import.meta.client) {
      localStorage.removeItem('irmandade_auth')
    }
  }

  // Buscar perfil do usuário (inclui wallet/balance).
  // Retorna o saldo (number) em caso de sucesso, ou null se não deu pra ler a wallet.
  const fetchUserProfile = async (): Promise<number | null> => {
    if (!authState.token || !authState.cookieKey) return null

    try {
      const response = await $fetch<UserProfileResponse>(`${authState.apiBaseUrl}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'X-Brand-Slug': authState.brandSlug,
          'X-Base-Domain': authState.baseDomain,
          'X-Cactus-Cookie-Key': authState.cookieKey.toString()
        }
      })

      // Atualizar dados do usuário com informações completas
      authState.user = {
        ...authState.user,
        id: response.id,
        name: response.name,
        email: response.email,
        phone: response.phone,
        first_name: response.first_name,
        last_name: response.last_name,
        wallet: response.wallet,
        kyc_validated_at: (response as any).kyc_validated_at || null
      } as User

      // Atualizar balance usando credit e convertendo (credit / 100)
      if (response.wallet) {
        const credit = response.wallet.credit || 0
        authState.balance = credit / 100
      }

      // Verificar se precisa KYC - o campo está dentro de userInfo ou user_info
      const userInfo = (response as any).userInfo || (response as any).user_info
      const kycValidatedAt = userInfo?.kyc_validated_at
      authState.needsKyc = !kycValidatedAt || kycValidatedAt === '' || kycValidatedAt === null
      authState.kycChecked = true

      console.log('KYC Check:', { kycValidatedAt, needsKyc: authState.needsKyc })

      saveAuthState()
      return authState.balance
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        clearAuth()
        return null
      }
      console.error('Erro ao buscar perfil do usuário:', err)
      return null
    }
  }

  // Login com email ou CPF
  const login = async (credentials: { 
    email?: string
    cpf?: string
    password: string 
  }): Promise<{ success: boolean; message?: string; blocked?: boolean }> => {
    loading.value = true
    error.value = null

    let lastError: any = null

    try {
      // Login tenta autenticar nas casas habilitadas (Esportiva e Bateu Bet).
      // A primeira que aceitar as credenciais define a marca do usuário logado.
      // A marca ativa do deploy (NUXT_PUBLIC_APP_BRAND) é tentada primeiro.
      const activeSlug = activeDefaultBrand().slug
      const loginBrands = BRANDS
        .filter((b) => b.slug === 'esportiva' || b.slug === 'bateu')
        .sort((a, b) => (a.slug === activeSlug ? -1 : b.slug === activeSlug ? 1 : 0))

      for (const brand of loginBrands) {
        const body: Record<string, any> = {
          password: credentials.password,
          brand_slug: brand.slug,
          base_domain: brand.baseDomain,
          app_source: 'web',
          save_cookies: true
        }

        // A API Cactus usa o campo "email" como LOGIN ÚNICO: aceita e-mail OU
        // CPF (só dígitos). Enviar CPF em "cpf"/"username"/"document" → 400.
        if (credentials.email) {
          body.email = credentials.email
        } else if (credentials.cpf) {
          body.email = credentials.cpf.replace(/\D/g, '')
        }

        try {
          const response = await $fetch<LoginResponse>(`${brand.apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Brand-Slug': brand.slug,
              'X-Base-Domain': brand.baseDomain
            },
            body
          })

          // Sucesso: fixa a marca que autenticou
          authState.brandSlug = brand.slug
          authState.baseDomain = brand.baseDomain
          authState.apiBaseUrl = brand.apiBaseUrl
          authState.userCollection = brand.userCollection

          // Salvar dados de autenticação
          authState.user = response.user
          authState.token = response.access_token
          authState.cookieKey = response.cookie_key
          authState.isAuthenticated = true

          saveAuthState()

          // Buscar perfil completo do usuário (incluindo wallet/balance/KYC)
          await fetchUserProfile()

          // (Removido) Antes o acesso exigia banca/saldo > 0 na Esportiva.
          // Agora qualquer usuário autenticado entra, independente de ter saldo.

          // Heartbeat: registra o usuário no painel admin e checa bloqueio.
          // Fail-open: se o nosso servidor estiver fora, o login segue normal.
          let trackBlocked = false
          try {
            const track = await $fetch<{ blocked: boolean }>('/api/track/session', {
              method: 'POST',
              body: {
                email: response.user?.email,
                name: response.user?.name,
                phone: response.user?.phone,
                userId: response.user?.id,
                brandSlug: brand.slug
              }
            })
            trackBlocked = track.blocked
          } catch (trackErr) {
            console.warn('track/session falhou (ignorado):', trackErr)
          }

          if (trackBlocked) {
            clearAuth()
            useBlocked().setBlocked(true)
            return { success: false, blocked: true }
          }

          return { success: true }
        } catch (err: any) {
          // Credencial não existe nessa marca → tenta a próxima
          lastError = err
        }
      }

      // Nenhuma marca autenticou → monta a mensagem a partir do último erro
      console.error('Erro no login:', lastError)

      let message = 'Erro ao fazer login. Tente novamente.'

      if (lastError?.data?.message) {
        message = lastError.data.message
      } else if (lastError?.data?.detail?.reason === 'wrong_credentials') {
        message = 'E-mail/CPF ou senha incorretos.'
      } else if (lastError?.data?.detail?.reason === 'user_not_found') {
        message = 'Usuário não encontrado.'
      } else if (lastError?.statusCode === 401) {
        message = 'Credenciais inválidas.'
      }

      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  // Logout
  const logout = async () => {
    loading.value = true

    try {
      if (authState.token && authState.cookieKey) {
        await $fetch(`${authState.apiBaseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`
          },
          body: {
            cookie_key: authState.cookieKey.toString()
          }
        })
      }
    } catch (err) {
      console.error('Erro no logout:', err)
    } finally {
      clearAuth()
      loading.value = false
      navigateTo('/auth/login')
    }
  }

  // Verificar se usuário está autenticado
  const checkAuth = () => {
    loadAuthState()
    return authState.isAuthenticated
  }

  // Obter headers de autenticação para requisições
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${authState.token}`,
      'X-Brand-Slug': authState.brandSlug,
      'X-Base-Domain': authState.baseDomain,
      'X-Cactus-Cookie-Key': authState.cookieKey?.toString() || ''
    }
  }

  // Inicializar estado
  if (import.meta.client) {
    loadAuthState()
  }

  // Formatar balance para exibição
  const formattedBalance = computed(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(authState.balance)
  })

  return {
    // Estado
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    cookieKey: computed(() => authState.cookieKey),
    isAuthenticated: computed(() => authState.isAuthenticated),
    balance: computed(() => authState.balance),
    needsKyc: computed(() => authState.needsKyc),
    kycChecked: computed(() => authState.kycChecked),
    formattedBalance,
    loading: readonly(loading),
    error: readonly(error),

    // Marca do usuário logado (login duplo / multi-marca)
    brandSlug: computed(() => authState.brandSlug),
    baseDomain: computed(() => authState.baseDomain),
    apiBaseUrl: computed(() => authState.apiBaseUrl),
    brandName: computed(() => getBrand(authState.brandSlug).name),
    affiliateUrl: computed(() => getBrand(authState.brandSlug).affiliateUrl),
    
    // Métodos
    login,
    logout,
    checkAuth,
    getAuthHeaders,
    clearAuth,
    fetchUserProfile
  }
}
