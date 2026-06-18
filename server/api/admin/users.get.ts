import { getDb } from '../../utils/mongodb'
import { requireAdminSession } from '../../utils/adminAuth'
import { buildUserEnrichmentStages, buildSubsOnlyUnion } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const q = getQuery(event)
  const search = String(q.search || '').trim()
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))
  const risk = String(q.risk || '')                 // '24h' | '48h' | 'any'
  const subscription = String(q.subscription || '') // 'paid' | 'free'
  const status = String(q.status || '')             // 'active' | 'blocked'
  const brand = String(q.brand || '').trim()

  const rx = search
    ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    : null

  // filtros que rodam direto sobre app_users (antes dos $lookup)
  const match: Record<string, any> = {}
  if (rx) match.$or = [{ email: rx }, { name: rx }, { phone: rx }]
  if (status === 'active') match.blocked = { $ne: true }
  if (status === 'blocked') match.blocked = true
  if (brand) match.brand_slug = brand

  // Assinantes ativos sem registro em app_users (pagaram via webhook mas nunca
  // abriram o app) entram na lista como usuários. Não se aplica quando o filtro
  // é por marca (não têm marca) ou por bloqueados (não estão bloqueados).
  const includeSubsOnly = status !== 'blocked' && !brand
  const subUnion = includeSubsOnly ? buildSubsOnlyUnion(rx) : []

  // filtros que dependem dos campos derivados (depois do enriquecimento)
  const post: Record<string, any> = {}
  if (subscription === 'paid' || subscription === 'free') post.subscription = subscription
  if (risk === '24h') post.risk_tag = 'risk_24h'
  if (risk === '48h') post.risk_tag = 'risk_48h'
  if (risk === 'no_access') post.risk_tag = 'risk_no_access'
  if (risk === 'any') post.risk_tag = { $ne: null }

  const pipeline: any[] = [
    { $match: match },
    ...subUnion,
    ...buildUserEnrichmentStages(),
    ...(Object.keys(post).length ? [{ $match: post }] : []),
    // datas mais recentes primeiro; quem nunca acessou (last_seen_at null) fica no fim
    { $sort: { last_seen_at: -1 } },
    {
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }]
      }
    }
  ]

  const db = await getDb()
  const col = db.collection('app_users')

  const [aggRes, brands] = await Promise.all([
    col.aggregate(pipeline).toArray(),
    col.distinct('brand_slug', { brand_slug: { $nin: [null, ''] } })
  ])

  const res = aggRes[0]
  return {
    users: res?.rows || [],
    total: res?.meta?.[0]?.total || 0,
    brands: (brands as string[]).sort()
  }
})
