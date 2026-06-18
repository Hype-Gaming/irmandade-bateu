import { getDb } from '../../utils/mongodb'

interface SubscribeBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  email?: string | null
}

// Salva (ou atualiza) a inscrição de push do navegador na collection
// `push_subscriptions`, chaveada pelo endpoint (único por navegador/dispositivo).
export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)
  const sub = body?.subscription

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw createError({ statusCode: 400, message: 'Inscrição de push inválida.' })
  }

  const db = await getDb()
  const now = new Date()
  const email = body.email?.trim().toLowerCase() || null

  await db.collection('push_subscriptions').updateOne(
    { endpoint: sub.endpoint },
    {
      $set: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        email,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  )

  return { ok: true }
})
