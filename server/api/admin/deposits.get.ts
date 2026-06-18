import { getDb } from '../../utils/mongodb'
import { requireAdminSession } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const q = getQuery(event)
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))

  const db = await getDb()
  const col = db.collection('deposits')

  const [deposits, total] = await Promise.all([
    col.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments({})
  ])

  return { deposits, total }
})
