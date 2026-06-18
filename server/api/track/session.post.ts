import { getDb } from '../../utils/mongodb'

const cleanString = (value: unknown, maxLength = 200): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: unknown
    name?: unknown
    phone?: unknown
    userId?: unknown
    brandSlug?: unknown
  }>(event)

  const email = cleanString(body?.email)?.toLowerCase()
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }

  const now = new Date()

  // Só sobrescreve campos de perfil que chegaram preenchidos — o endpoint é
  // público e um POST sem esses campos não pode apagar dados já gravados.
  const set: Record<string, any> = { email, last_seen_at: now }
  const name = cleanString(body?.name)
  const phone = cleanString(body?.phone, 30)
  const brandSlug = cleanString(body?.brandSlug, 50)
  if (name) set.name = name
  if (phone) set.phone = phone
  if (brandSlug) set.brand_slug = brandSlug
  if (typeof body?.userId === 'number' && Number.isFinite(body.userId)) {
    set.cactus_user_id = body.userId
  }

  const db = await getDb()
  const user = await db.collection('app_users').findOneAndUpdate(
    { email },
    {
      $set: set,
      $setOnInsert: {
        first_seen_at: now,
        blocked: false,
        blocked_at: null
      }
    },
    { upsert: true, returnDocument: 'after', projection: { blocked: 1 } }
  )

  return { blocked: !!user?.blocked }
})
