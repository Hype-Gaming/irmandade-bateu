import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'

const extractEmails = (raw: string): string[] => {
  const matches = raw.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []
  return [...new Set(matches)]
}

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)

  const body = await readBody<{ emails?: string }>(event)
  const emails = extractEmails(body?.emails || '')

  if (!emails.length) {
    throw createError({ statusCode: 400, message: 'Nenhum e-mail válido informado' })
  }

  const db = await getDb()
  const collection = db.collection('subscriptions')

  const processed: Array<{
    email: string
    action: 'created' | 'updated' | 'already_active'
    status: 'active'
    role: 'paid'
  }> = []

  for (const email of emails) {
    const existing = await collection.findOne({ email })

    if (existing?.status === 'active' && existing?.role === 'paid') {
      processed.push({ email, action: 'already_active', status: 'active', role: 'paid' })
      continue
    }

    const result = await collection.updateOne(
      { email },
      {
        $set: {
          email,
          status: 'active',
          role: 'paid',
          updated_at: new Date(),
          source: 'admin-panel'
        },
        $setOnInsert: {
          created_at: new Date()
        }
      },
      { upsert: true }
    )

    processed.push({
      email,
      action: result.upsertedId ? 'created' : 'updated',
      status: 'active',
      role: 'paid'
    })
  }

  return {
    success: true,
    processedCount: processed.length,
    adminEmail: session.email,
    processed
  }
})
