import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{ email?: string; blocked?: boolean }>(event)
  const email = body?.email?.trim().toLowerCase()
  const blocked = !!body?.blocked

  if (!email) {
    throw createError({ statusCode: 400, message: 'email obrigatório' })
  }

  // upsert: assinantes que ainda não têm registro em app_users (pagaram mas
  // nunca abriram o app) também podem ser bloqueados — cria o registro mínimo.
  const db = await getDb()
  await db.collection('app_users').updateOne(
    { email },
    {
      $set: { blocked, blocked_at: blocked ? new Date() : null },
      $setOnInsert: { email, created_via: 'admin-block' }
    },
    { upsert: true }
  )

  return { success: true, email, blocked }
})
