import {
  signSession,
  safeEqual,
  getAllowedEmails,
  getAdminPassword,
  COOKIE_NAME,
  MAX_AGE
} from '../../utils/adminAuth'

// rate limit simples em memória contra brute-force (por IP)
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_ATTEMPTS = 8
const attempts = new Map<string, { count: number; first: number }>()

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.first > WINDOW_MS) return true
  return entry.count < MAX_ATTEMPTS
}

const registerFailure = (ip: string) => {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now })
  } else {
    entry.count++
  }
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'

  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      message: 'Muitas tentativas. Tente novamente em alguns minutos.'
    })
  }

  const body = await readBody<{ email?: string; password?: string }>(event)

  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'E-mail e senha são obrigatórios' })
  }

  const allowedEmails = getAllowedEmails()
  const adminPassword = getAdminPassword()

  // compara senha sempre (timing-safe) para não vazar se o e-mail é válido
  const emailOk = allowedEmails.includes(email)
  const passwordOk = safeEqual(password, adminPassword)

  if (!emailOk || !passwordOk) {
    registerFailure(ip)
    throw createError({ statusCode: 401, message: 'Credenciais inválidas' })
  }

  // login OK: zera o contador desse IP
  attempts.delete(ip)

  const token = signSession({ email, iat: Date.now() })
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE,
    secure: isProduction
  })

  return { success: true, adminEmail: email }
})
