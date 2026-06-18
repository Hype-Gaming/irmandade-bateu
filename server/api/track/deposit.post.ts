import { getDb } from '../../utils/mongodb'

const MAX_DEPOSIT_AMOUNT = 1_000_000

const cleanString = (value: unknown, maxLength = 200): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: unknown
    userId?: unknown
    brandSlug?: unknown
    amount?: unknown
    transactionId?: unknown
  }>(event)

  const email = cleanString(body?.email)?.toLowerCase()
  const amount = Number(body?.amount)

  if (
    !email || !email.includes('@')
    || !Number.isFinite(amount) || amount <= 0 || amount > MAX_DEPOSIT_AMOUNT
  ) {
    throw createError({ statusCode: 400, message: 'email e amount obrigatórios' })
  }

  const db = await getDb()
  await db.collection('deposits').insertOne({
    email,
    cactus_user_id: typeof body?.userId === 'number' && Number.isFinite(body.userId) ? body.userId : null,
    brand_slug: cleanString(body?.brandSlug, 50),
    amount,
    transaction_id: cleanString(body?.transactionId),
    status: 'generated',
    created_at: new Date()
  })

  return { success: true }
})
