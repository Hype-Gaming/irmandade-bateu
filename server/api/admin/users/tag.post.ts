import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'

// 'auto' = usa o risco calculado; 'none' = sem tag; demais = override fixo
export const TAG_VALUES = ['auto', 'none', 'risk_24h', 'risk_48h', 'risk_no_access'] as const

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)

  const body = await readBody<{ email?: string; tag?: string }>(event)
  const email = body?.email?.trim().toLowerCase()
  const tag = String(body?.tag || '').trim()

  if (!email) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }
  if (!TAG_VALUES.includes(tag as any)) {
    throw createError({ statusCode: 400, message: 'tag inválida' })
  }

  const db = await getDb()
  await db.collection('user_contact_status').updateOne(
    { email },
    {
      $set: { email, tag, tag_updated_at: new Date(), tag_updated_by: session.email },
      $setOnInsert: { created_at: new Date() }
    },
    { upsert: true }
  )

  return { success: true, email, tag }
})
