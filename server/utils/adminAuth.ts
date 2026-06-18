import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'irmandade-admin-secret-2024'
export const COOKIE_NAME = 'irmandade_admin_session'
export const MAX_AGE = 8 * 60 * 60 // 8 horas em segundos

const isProduction = process.env.NODE_ENV === 'production'
const usingDefaultSecret = !process.env.ADMIN_SESSION_SECRET?.trim()
const usingDefaultPassword = !process.env.ADMIN_PASSWORD?.trim()

// aviso em produção quando os segredos não foram configurados via .env
if (isProduction && (usingDefaultSecret || usingDefaultPassword)) {
  console.warn(
    '[adminAuth] ATENÇÃO: ADMIN_SESSION_SECRET e/ou ADMIN_PASSWORD não definidos. ' +
    'O painel admin está usando valores padrão inseguros em produção.'
  )
}

export interface SessionPayload {
  email: string
  iat: number
}

// comparação em tempo constante — evita timing attacks na senha e na assinatura
export const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export const signSession = (payload: SessionPayload): string => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64')
  const sig = createHmac('sha256', SESSION_SECRET).update(data).digest('hex')
  return `${data}.${sig}`
}

export const verifySession = (token: string): SessionPayload | null => {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null

  const data = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  const expected = createHmac('sha256', SESSION_SECRET).update(data).digest('hex')

  if (!safeEqual(sig, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString()) as SessionPayload
    if (!payload || typeof payload.iat !== 'number' || !payload.email) return null

    // expiração validada no servidor (não confia só no maxAge do cookie)
    if (Date.now() - payload.iat > MAX_AGE * 1000) return null

    // e-mail precisa continuar na allowlist (revoga sessão se removido do .env)
    if (!getAllowedEmails().includes(payload.email)) return null

    return payload
  } catch {
    return null
  }
}

export const getAllowedEmails = (): string[] => {
  const env = process.env.ADMIN_ALLOWED_EMAILS || process.env.ADMIN_EMAIL
  if (env?.trim()) {
    return env.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  }
  return ['thiagoemanoel181@gmail.com', 'enzo@hypegaming.com.br']
}

export const getAdminPassword = (): string => {
  return process.env.ADMIN_PASSWORD || 'admin123'
}

export const getAdminSession = (event: any): SessionPayload | null => {
  const cookie = getCookie(event, COOKIE_NAME)
  if (!cookie) return null
  return verifySession(cookie)
}

// guarda única reutilizada por todas as rotas /api/admin/* (exceto login/logout).
// Lança 401 quando não há sessão válida; caso contrário devolve o payload.
export const requireAdminSession = (event: any): SessionPayload => {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sessão admin inválida ou expirada' })
  }
  return session
}
