import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'
import { isPushConfigured } from '../../../utils/webpush'

interface ScheduleBody {
  title?: string
  body?: string
  url?: string
  type?: 'once' | 'daily'
  // Momento do primeiro disparo (ISO). O cliente calcula a partir do fuso local.
  runAt?: string
  // Rótulo HH:mm (usado por 'daily' e para exibição). Opcional.
  time?: string
}

// Cria uma notificação agendada (uma vez ou diária) na collection
// `scheduled_notifications`. O disparo é feito pelo scheduler do servidor.
export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<ScheduleBody>(event)
  const title = body?.title?.trim()
  const message = body?.body?.trim()
  const type = body?.type === 'daily' ? 'daily' : 'once'

  if (!title || !message) {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  const runAt = body?.runAt ? new Date(body.runAt) : null
  if (!runAt || isNaN(runAt.getTime())) {
    throw createError({ statusCode: 400, message: 'Data/horário do agendamento inválido.' })
  }

  // Para envio único, não deixa agendar no passado (tolerância de 1 min).
  if (type === 'once' && runAt.getTime() < Date.now() - 60_000) {
    throw createError({ statusCode: 400, message: 'O horário escolhido já passou.' })
  }

  const db = await getDb()
  const now = new Date()

  const doc = {
    title,
    body: message,
    url: body?.url?.trim() || '/',
    icon: '/images/logo.png',
    type,
    time: body?.time?.trim() || null,
    nextRunAt: runAt,
    status: 'active' as const,
    createdAt: now,
    lastSentAt: null as Date | null,
    lastResult: null as unknown
  }

  const result = await db.collection('scheduled_notifications').insertOne(doc)

  return { ok: true, id: result.insertedId.toString() }
})
