/**
 * Importa a base do Lastlink para o banco do app (clone da estrutura antiga).
 *
 * Regra:
 *   - Pagantes do app (vendas Aprovadas de [APP] IRMANDADE CLUB) -> subscriptions (active/paid).
 *   - Todo o resto dos compradores do Lastlink (qualquer outro produto/status) -> app_users (free),
 *     marcados com tag de risco alto (risk_48h) em user_contact_status.
 *   - deposits é criada vazia (mantém a estrutura que o app espera).
 *
 * Antes de gravar, remove as collections users_<marca>/deposits que tinham sido copiadas pro destino.
 *
 * Uso:
 *   node scripts/seed-mixed.mjs --dry-run                 # só lê o xlsx e conta, não toca no Mongo
 *   DEST_URI=... DEST_DB=irmandade-hyper node scripts/seed-mixed.mjs   # grava
 *
 * Env: LASTLINK_XLSX (default sales_list_2026-06-17.xlsx), DEST_URI, DEST_DB (default irmandade-hyper)
 */
import xlsx from 'xlsx'
import { MongoClient } from 'mongodb'

const FILE = process.env.LASTLINK_XLSX || 'sales_list_2026-06-17.xlsx'
const DEST_URI = process.env.DEST_URI
const DEST_DB = process.env.DEST_DB || 'irmandade-hyper'
const FREE_COUNT = Number(process.env.FREE_COUNT || 33) // quantos do "resto" entram como free
const DRY = process.argv.includes('--dry-run')

const IRMANDADE = new Set(['[APP] IRMANDADE CLUB'])
const HIGH_RISK_TAG = 'risk_48h' // rótulo no painel: "48h+ sem deposito"

const norm = (s) => String(s ?? '').trim()
const lower = (s) => norm(s).toLowerCase()
const toDate = (v) => {
  if (!v) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const parse = () => {
  const wb = xlsx.readFile(FILE, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { defval: null })

  const need = ['Status da venda', 'Produto principal', 'E-mail do membro']
  const cols = Object.keys(rows[0] || {})
  for (const c of need) if (!cols.includes(c)) throw new Error(`Coluna ausente no xlsx: "${c}"`)

  // pagantes do app: Aprovada + produto IRMANDADE, dedup por email
  const paid = new Map()
  // todos os compradores (qualquer linha com email), pra montar o "resto"
  const all = new Map()

  for (const r of rows) {
    const email = lower(r['E-mail do membro'])
    if (!email) continue
    const saleAt = toDate(r['Data do pagamento']) || toDate(r['Data da Venda'])
    const phone = norm(r['Telefone do membro']) || null
    const product = norm(r['Produto principal'])
    const status = norm(r['Status da venda'])

    const prevAll = all.get(email)
    if (!prevAll || (saleAt && (!prevAll.saleAt || saleAt > prevAll.saleAt))) {
      all.set(email, { email, phone, product, saleAt })
    }

    if (status === 'Aprovada' && IRMANDADE.has(product)) {
      const prev = paid.get(email)
      if (!prev || (saleAt && (!prev.saleAt || saleAt > prev.saleAt))) {
        paid.set(email, { email, phone, product, orderId: norm(r['Identificador da venda']) || null, saleAt })
      }
    }
  }

  const paidList = [...paid.values()]
  const restList = [...all.values()].filter((u) => !paid.has(u.email))
  return { paidList, restList, totalRows: rows.length, totalEmails: all.size }
}

const main = async () => {
  const now = new Date()
  const { paidList, restList, totalRows, totalEmails } = parse()
  // free = os N compradores do "resto" mais recentes (por data da venda)
  const freeList = [...restList]
    .sort((a, b) => (b.saleAt?.getTime() || 0) - (a.saleAt?.getTime() || 0))
    .slice(0, FREE_COUNT)
  console.log(`Linhas no xlsx: ${totalRows} | emails únicos: ${totalEmails}`)
  console.log(`Pagantes do app (IRMANDADE aprovado): ${paidList.length}`)
  console.log(`Free (resto, limitado a ${FREE_COUNT}): ${freeList.length} de ${restList.length} disponíveis`)
  console.log(`Total final: ${paidList.length + freeList.length}`)

  const subscriptions = paidList.map((m) => ({
    email: m.email,
    status: 'active',
    role: 'paid',
    product: m.product,
    phone: m.phone,
    name: null,
    lastlink_status: 'seed',
    lastlink_order_id: m.orderId,
    created_at: m.saleAt || now,
    updated_at: now,
    source: 'lastlink'
  }))

  const appUsers = freeList.map((u) => ({
    email: u.email,
    name: null,
    phone: u.phone,
    brand_slug: null,
    blocked: false,
    first_seen_at: null,
    last_seen_at: null,
    created_at: u.saleAt || now,
    updated_at: now,
    source: 'lastlink'
  }))

  const contactStatus = freeList.map((u) => ({
    email: u.email,
    tag: HIGH_RISK_TAG,
    status: 'pendente',
    tag_updated_at: now,
    created_at: now
  }))

  if (DRY) {
    console.log('\n[DRY-RUN] resultado final no destino seria:')
    console.log(`  subscriptions:        ${subscriptions.length} (pagantes)`)
    console.log(`  app_users:            ${appUsers.length} (resto, free)`)
    console.log(`  user_contact_status:  ${contactStatus.length} (tag=${HIGH_RISK_TAG})`)
    console.log('  deposits:             0 (collection criada vazia)')
    console.log('  + apagar as collections users_* copiadas antes.')
    console.log('\nNada gravado (dry-run).')
    return
  }

  if (!DEST_URI) throw new Error('DEST_URI não definido — necessário para gravar.')
  const dest = new MongoClient(DEST_URI)
  await dest.connect()
  const db = dest.db(DEST_DB)

  const existing = (await db.listCollections().toArray()).map((c) => c.name)
  const toDrop = existing.filter(
    (n) => n.startsWith('users_') || ['deposits', 'subscriptions', 'app_users', 'user_contact_status'].includes(n)
  )
  for (const n of toDrop) await db.collection(n).drop().catch(() => {})
  console.log('\n[ok] removidas:', toDrop.join(', ') || '(nenhuma)')

  if (subscriptions.length) await db.collection('subscriptions').insertMany(subscriptions)
  if (appUsers.length) await db.collection('app_users').insertMany(appUsers)
  if (contactStatus.length) await db.collection('user_contact_status').insertMany(contactStatus)
  await db.createCollection('deposits').catch(() => {})

  console.log('\nGravado em', DEST_DB + ':')
  for (const n of ['subscriptions', 'app_users', 'user_contact_status', 'deposits']) {
    console.log(`  ${n.padEnd(20)} ${await db.collection(n).countDocuments()}`)
  }
  console.log('  collections finais:', (await db.listCollections().toArray()).map((c) => c.name).sort().join(', '))

  await dest.close()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
