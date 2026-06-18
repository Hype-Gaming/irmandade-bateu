import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'

export const CONTACT_STATUSES = ['pendente', 'contatado', 'respondeu', 'convertido', 'ignorado'] as const

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)

  const body = await readBody<{ email?: string; status?: string }>(event)
  const email = body?.email?.trim().toLowerCase()
  const status = String(body?.status || '').trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }
  if (!CONTACT_STATUSES.includes(status as any)) {
    throw createError({ statusCode: 400, message: 'status inválido' })
  }

  const db = await getDb()
  await db.collection('user_contact_status').updateOne(
    { email },
    {
      $set: { email, status, updated_at: new Date(), updated_by: session.email },
      $setOnInsert: { created_at: new Date() }
    },
    { upsert: true }
  )

  return { success: true, email, status }
})
