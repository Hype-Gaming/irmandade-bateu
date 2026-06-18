import { getDb } from '../../utils/mongodb'
import { requireAdminSession } from '../../utils/adminAuth'

const MAX_AMOUNT = 1_000_000

// Registra manualmente um FTD (primeiro depósito) como um documento em `deposits`,
// pra constar como PIX — entra no total, na conversão e zera a tag de risco.
export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)

  const body = await readBody<{ email?: string; amount?: unknown; brand?: string | null }>(event)
  const email = body?.email?.trim().toLowerCase()
  const amount = Number(body?.amount)

  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, message: 'E-mail inválido' })
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw createError({ statusCode: 400, message: 'Valor inválido' })
  }

  const brand = typeof body?.brand === 'string' && body.brand.trim()
    ? body.brand.trim().slice(0, 50)
    : null

  const db = await getDb()
  await db.collection('deposits').insertOne({
    email,
    brand_slug: brand,
    amount,
    transaction_id: null,
    status: 'generated',
    is_ftd: true,
    source: 'admin-ftd',
    registered_by: session.email,
    created_at: new Date()
  })

  return { success: true, email, amount }
})
