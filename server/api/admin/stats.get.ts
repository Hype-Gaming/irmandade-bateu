import { getDb } from '../../utils/mongodb'
import { requireAdminSession } from '../../utils/adminAuth'
import { buildUserEnrichmentStages, buildSubsOnlyUnion, HOUR_MS } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const db = await getDb()
  const users = db.collection('app_users')
  const deposits = db.collection('deposits')
  const subscriptions = db.collection('subscriptions')

  const now = new Date()
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)
  const cutoff7d = new Date(now.getTime() - 7 * 24 * HOUR_MS)
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const [appUsersCount, subsOnlyAgg, active48h, depositsCount, sumAgg, newToday, new7d, atRiskAgg, convAgg] =
    await Promise.all([
      users.countDocuments({}),
      // assinantes ativos que ainda não têm registro em app_users (contam como usuários)
      subscriptions.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$email' } },
        { $lookup: { from: 'app_users', localField: '_id', foreignField: 'email', as: '_au' } },
        { $match: { _au: { $size: 0 } } },
        { $count: 'n' }
      ]).toArray(),
      users.countDocuments({ last_seen_at: { $gte: cutoff48 } }),
      deposits.countDocuments({}),
      deposits.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
      users.countDocuments({ first_seen_at: { $gte: startOfDay } }),
      users.countDocuments({ first_seen_at: { $gte: cutoff7d } }),
      users.aggregate([
        ...buildSubsOnlyUnion(),
        ...buildUserEnrichmentStages(now),
        { $match: { risk_tag: { $ne: null } } },
        { $count: 'n' }
      ]).toArray(),
      subscriptions.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $gt: [{ $size: '$deps' }, 0] }, 1, 0] } }
          }
        }
      ]).toArray()
    ])

  const depositsSum = sumAgg[0]?.total || 0
  const conv = convAgg[0]
  const totalUsers = appUsersCount + (subsOnlyAgg[0]?.n || 0)

  return {
    totalUsers,
    active48h,
    depositsCount,
    depositsSum,
    newToday,
    new7d,
    avgTicket: depositsCount ? depositsSum / depositsCount : 0,
    atRisk: atRiskAgg[0]?.n || 0,
    conversionRate: conv?.total ? (conv.converted / conv.total) * 100 : 0
  }
})
