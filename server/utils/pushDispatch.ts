import { getDb } from './mongodb'
import { sendToSubscription, type PushPayload, type PushSubscriptionRecord } from './webpush'

export interface DispatchResult {
  sent: number
  failed: number
  removed: number
  total: number
}

// Envia uma notificação para TODAS as inscrições de push e remove em lote as
// que estiverem mortas (404/410). Reutilizado pelo envio manual (admin) e pelo
// scheduler de notificações agendadas.
export const dispatchToAllSubscriptions = async (payload: PushPayload): Promise<DispatchResult> => {
  const db = await getDb()
  const collection = db.collection('push_subscriptions')
  const subs = await collection.find({}).toArray()

  if (subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0, total: 0 }
  }

  const results = await Promise.all(
    subs.map((s) =>
      sendToSubscription(s as unknown as PushSubscriptionRecord, payload)
        .then((r) => ({ endpoint: s.endpoint as string, ...r }))
    )
  )

  const goneEndpoints = results.filter((r) => r.gone).map((r) => r.endpoint)
  if (goneEndpoints.length > 0) {
    await collection.deleteMany({ endpoint: { $in: goneEndpoints } })
  }

  const sent = results.filter((r) => r.ok).length

  return {
    sent,
    failed: results.length - sent,
    removed: goneEndpoints.length,
    total: results.length
  }
}
