import { getDb } from '../../utils/mongodb'
import { requireAdminSession } from '../../utils/adminAuth'
import { HOUR_MS } from '../../utils/adminUserEnrichment'

const TZ = 'America/Sao_Paulo'
const DAYS = 14

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const db = await getDb()
  const since = new Date(Date.now() - DAYS * 24 * HOUR_MS)

  const [userAgg, depAgg] = await Promise.all([
    db.collection('app_users').aggregate([
      { $match: { first_seen_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$first_seen_at', timezone: TZ } },
          n: { $sum: 1 }
        }
      }
    ]).toArray(),
    db.collection('deposits').aggregate([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: TZ } },
          n: { $sum: 1 },
          sum: { $sum: '$amount' }
        }
      }
    ]).toArray()
  ])

  const usersByDay = new Map(userAgg.map(d => [d._id as string, d.n as number]))
  const depsByDay = new Map(depAgg.map(d => [d._id as string, d]))

  // série contínua dos últimos 14 dias (datas no fuso de SP; en-CA = YYYY-MM-DD)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const days: Array<{ date: string; newUsers: number; pixCount: number; pixSum: number }> = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = fmt.format(new Date(Date.now() - i * 24 * HOUR_MS))
    const dep = depsByDay.get(date)
    days.push({
      date,
      newUsers: usersByDay.get(date) || 0,
      pixCount: dep?.n || 0,
      pixSum: dep?.sum || 0
    })
  }

  return { days }
})
