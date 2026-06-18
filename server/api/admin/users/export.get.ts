import { getDb } from '../../../utils/mongodb'
import { requireAdminSession } from '../../../utils/adminAuth'
import { buildUserEnrichmentStages, buildSubsOnlyUnion } from '../../../utils/adminUserEnrichment'

const TZ = 'America/Sao_Paulo'
const MAX_ROWS = 10000

const riskLabel = (tag: string | null): string =>
  tag === 'risk_48h' ? '48h+ sem deposito'
    : tag === 'risk_24h' ? '24h sem deposito'
    : tag === 'risk_no_access' ? 'Pago, nunca acessou'
    : ''

const fmtDate = (v: any): string => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

const fmtMoney = (v: number): string => (v || 0).toFixed(2).replace('.', ',')

// escapa um campo CSV (delimitador ';') e protege contra CSV injection
const cell = (val: any): string => {
  let s = val === null || val === undefined ? '' : String(val)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const q = getQuery(event)
  const search = String(q.search || '').trim()
  const risk = String(q.risk || '')
  const subscription = String(q.subscription || '')
  const status = String(q.status || '')
  const brand = String(q.brand || '').trim()

  const rx = search
    ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    : null

  const match: Record<string, any> = {}
  if (rx) match.$or = [{ email: rx }, { name: rx }, { phone: rx }]
  if (status === 'active') match.blocked = { $ne: true }
  if (status === 'blocked') match.blocked = true
  if (brand) match.brand_slug = brand

  const includeSubsOnly = status !== 'blocked' && !brand
  const subUnion = includeSubsOnly ? buildSubsOnlyUnion(rx) : []

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
    { $sort: { last_seen_at: -1 } },
    { $limit: MAX_ROWS }
  ]

  const db = await getDb()
  const rows = await db.collection('app_users').aggregate(pipeline).toArray()

  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

  const header = [
    'Nome', 'E-mail', 'Telefone', 'Assinatura', 'PIX (qtd)', 'Valor PIX',
    'Marca', '1o acesso', 'Ultimo acesso', 'Status', 'Risco', 'Status contato'
  ]

  const lines = [header.join(';')]
  for (const u of rows) {
    lines.push([
      cell(u.name || ''),
      cell(u.email || ''),
      cell(u.phone || ''),
      cell(u.subscription === 'paid' ? 'Pago' : 'Free'),
      cell(u.deposits_count ?? 0),
      cell(fmtMoney(u.deposits_sum)),
      cell(u.brand_slug || ''),
      cell(fmtDate(u.first_seen_at)),
      cell(fmtDate(u.last_seen_at)),
      cell(u.blocked ? 'Bloqueado' : 'Ativo'),
      cell(riskLabel(u.risk_tag ?? null)),
      cell(cap(u.contact_status || 'pendente'))
    ].join(';'))
  }

  // BOM pra o Excel pt-BR ler acentos corretamente
  const csv = '﻿' + lines.join('\r\n')
  const stamp = fmtDate(new Date()).slice(0, 10).replace(/\//g, '-')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="usuarios-irmandade-${stamp}.csv"`)
  return csv
})
