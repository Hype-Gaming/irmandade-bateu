// Verificação (leitura): reproduz integralmente o /api/admin/stats com a URI corrigida.
import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI
const DB_NAME = 'irmandade-hyper'
const HOUR_MS = 60 * 60 * 1000

const buildSubsOnlyUnion = () => [
  { $unionWith: { coll: 'subscriptions', pipeline: [
    { $match: { status: 'active' } },
    { $group: { _id: '$email', phone: { $first: '$phone' }, name: { $first: '$name' } } },
    { $match: { _id: { $ne: null } } },
    { $lookup: { from: 'app_users', localField: '_id', foreignField: 'email', as: '_au' } },
    { $match: { _au: { $size: 0 } } },
    { $project: { _id: 0, email: '$_id', name: 1, phone: 1, brand_slug: { $literal: null }, blocked: { $literal: false }, first_seen_at: { $literal: null }, last_seen_at: { $literal: null }, source: { $literal: 'subscription' } } }
  ] } }
]

const main = async () => {
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 })
  await client.connect()
  const db = client.db(DB_NAME)
  const users = db.collection('app_users')
  const deposits = db.collection('deposits')
  const subscriptions = db.collection('subscriptions')
  const now = new Date()
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)

  const [appUsersCount, subsOnlyAgg, depositsCount, sumAgg, convAgg] = await Promise.all([
    users.countDocuments({}),
    subscriptions.aggregate([
      { $match: { status: 'active' } }, { $group: { _id: '$email' } },
      { $lookup: { from: 'app_users', localField: '_id', foreignField: 'email', as: '_au' } },
      { $match: { _au: { $size: 0 } } }, { $count: 'n' }
    ]).toArray(),
    deposits.countDocuments({}),
    deposits.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
    subscriptions.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
      { $group: { _id: null, total: { $sum: 1 }, converted: { $sum: { $cond: [{ $gt: [{ $size: '$deps' }, 0] }, 1, 0] } } } }
    ]).toArray()
  ])

  const totalUsers = appUsersCount + (subsOnlyAgg[0]?.n || 0)
  const depositsSum = sumAgg[0]?.total || 0
  const conv = convAgg[0]

  console.log('Stats que o painel vai mostrar:')
  console.log(JSON.stringify({
    totalUsers,
    depositsCount,
    depositsSum,
    avgTicket: depositsCount ? depositsSum / depositsCount : 0,
    conversionRate: conv?.total ? (conv.converted / conv.total) * 100 : 0,
    assinantesAtivos: conv?.total || 0
  }, null, 2))

  await client.close()
}
main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
