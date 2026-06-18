import { ObjectId } from 'mongodb'
import { getDb } from '../../../../utils/mongodb'
import { requireAdminSession } from '../../../../utils/adminAuth'

// Cancela (ou remove) um agendamento. Ativos viram 'canceled'; já finalizados
// são apagados da lista.
export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido.' })
  }

  const db = await getDb()
  const collection = db.collection('scheduled_notifications')
  const _id = new ObjectId(id)

  const canceled = await collection.updateOne(
    { _id, status: 'active' },
    { $set: { status: 'canceled' } }
  )

  if (canceled.matchedCount === 0) {
    // não estava ativo → remove o registro da lista
    await collection.deleteOne({ _id })
  }

  return { ok: true }
})
