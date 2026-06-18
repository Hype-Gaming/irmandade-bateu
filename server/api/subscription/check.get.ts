import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const { email } = getQuery(event)

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  const db = await getDb()
  const col = db.collection('subscriptions')

  const subscription = await col.findOne({ email: email.toLowerCase() })

  const active = subscription?.status === 'active'

  return {
    active,
    role: active ? 'paid' : 'free',
    status: subscription?.status || null
  }
})
