/**
 * Seed do app da Rainha (clone da estrutura: subscriptions / app_users / deposits).
 *
 * Regra (tudo com dado REAL):
 *   - Pagantes do app  = vendas "Aprovada" de [APP] INTELIGÊNCIA ARTIFICIAL PREMIUM
 *     na planilha do Lastlink (rainha.list.xlsx)  -> subscriptions (active/paid).
 *   - Free             = usuários REAIS puxados do Mongo da esportiva (users_apps_eb,
 *     collections users_*), deduplicados por email e sem repetir os pagos,
 *     limitados pra fechar TOTAL_ALVO usuários -> app_users (free) + tag risk_48h.
 *   - deposits         = criada vazia (mantém a estrutura que o app espera).
 *
 * Antes de gravar, remove no destino as collections users_(...)/deposits/subscriptions/
 * app_users/user_contact_status que possam existir.
 *
 * Uso:
 *   node scripts/seed-rainha.mjs --dry-run            # só lê (xlsx + esportiva) e conta
 *   node scripts/seed-rainha.mjs                      # grava no destino
 *
 * Env:
 *   LASTLINK_XLSX  (default rainha.list.xlsx)
 *   SRC_URI        (Mongo da esportiva)   SRC_DB (default users_apps_eb)
 *   DEST_URI       (Mongo destino rainha) DEST_DB (default rainha_da_bet)
 *   TOTAL_ALVO     (default 150)  -> free = TOTAL_ALVO - pagos
 */
import xlsx from 'xlsx'
import { MongoClient } from 'mongodb'

const FILE = process.env.LASTLINK_XLSX || 'rainha.list.xlsx'
const SRC_URI = process.env.SRC_URI || 'mongodb://automa-g-projetos:MX93PnesDek2@168.195.14.106:27018/admin?authSource=admin&directConnection=true'
const SRC_DB = process.env.SRC_DB || 'users_apps_eb'
const DEST_URI = process.env.DEST_URI || 'mongodb://rainha_user:7Dsgl%21y@104.131.7.171:27017/rainha_da_bet?authSource=rainha_da_bet'
const DEST_DB = process.env.DEST_DB || 'rainha_da_bet'
const TOTAL_ALVO = Number(process.env.TOTAL_ALVO || 150)
const DRY = process.argv.includes('--dry-run')

const PAID_PRODUCT = new Set(['[APP] INTELIGÊNCIA ARTIFICIAL PREMIUM'])
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

// --- pagantes (planilha Lastlink) ---
const parsePaid = () => {
  const wb = xlsx.readFile(FILE, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { defval: null })

  const need = ['Status da venda', 'Produto principal', 'E-mail do membro']
  const cols = Object.keys(rows[0] || {})
  for (const c of need) if (!cols.includes(c)) throw new Error(`Coluna ausente no xlsx: "${c}"`)

  const paid = new Map()
  for (const r of rows) {
    const email = lower(r['E-mail do membro'])
    if (!email) continue
    const status = norm(r['Status da venda'])
    const product = norm(r['Produto principal'])
    if (status !== 'Aprovada' || !PAID_PRODUCT.has(product)) continue
    const saleAt = toDate(r['Data do pagamento']) || toDate(r['Data da Venda'])
    const prev = paid.get(email)
    if (!prev || (saleAt && (!prev.saleAt || saleAt > prev.saleAt))) {
      paid.set(email, {
        email,
        name: norm(r['Nome/Razão social do membro']) || null,
        phone: norm(r['Telefone do membro']) || null,
        product,
        orderId: norm(r['Identificador da venda']) || null,
        saleAt
      })
    }
  }
  return [...paid.values()]
}

// --- free (usuários reais da esportiva) ---
const pullFree = async (excludeEmails, limit) => {
  const c = new MongoClient(SRC_URI, { serverSelectionTimeoutMS: 12000 })
  await c.connect()
  const db = c.db(SRC_DB)
  const cols = (await db.listCollections().toArray()).map((x) => x.name).filter((n) => n.startsWith('users_'))

  const seen = new Set(excludeEmails)
  const out = []
  for (const n of cols) {
    const docs = await db.collection(n).find({}).toArray()
    for (const d of docs) {
      const email = lower(d.email)
      if (!email || seen.has(email)) continue
      seen.add(email)
      out.push({
        email,
        name: norm(d.name) || null,
        phone: norm(d.phone) || null,
        createdAt: toDate(d.createdAt)
      })
    }
  }
  await c.close()

  // mais recentes primeiro, depois corta no limite
  out.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
  return { free: out.slice(0, limit), totalDisponivel: out.length, cols }
}

const main = async () => {
  const now = new Date()
  const paidList = parsePaid()
  const freeAlvo = Math.max(0, TOTAL_ALVO - paidList.length)
  const paidEmails = paidList.map((p) => p.email)
  const { free, totalDisponivel, cols } = await pullFree(paidEmails, freeAlvo)

  console.log(`Pagantes (xlsx, Aprovada): ${paidList.length}`)
  console.log(`Free real disponível na esportiva: ${totalDisponivel} (collections: ${cols.length})`)
  console.log(`Free a inserir (alvo ${TOTAL_ALVO} - ${paidList.length} pagos): ${free.length}`)
  console.log(`TOTAL final: ${paidList.length + free.length}`)

  const subscriptions = paidList.map((m) => ({
    email: m.email,
    status: 'active',
    role: 'paid',
    product: m.product,
    phone: m.phone,
    name: m.name,
    lastlink_status: 'seed',
    lastlink_order_id: m.orderId,
    created_at: m.saleAt || now,
    updated_at: now,
    source: 'lastlink'
  }))

  const appUsers = free.map((u) => ({
    email: u.email,
    name: u.name,
    phone: u.phone,
    brand_slug: null,
    blocked: false,
    first_seen_at: null,
    last_seen_at: null,
    created_at: u.createdAt || now,
    updated_at: now,
    source: 'esportiva'
  }))

  const contactStatus = free.map((u) => ({
    email: u.email,
    tag: HIGH_RISK_TAG,
    status: 'pendente',
    tag_updated_at: now,
    created_at: now
  }))

  if (DRY) {
    console.log('\n[DRY-RUN] resultado final no destino seria:')
    console.log(`  subscriptions:        ${subscriptions.length} (pagantes)`)
    console.log(`  app_users:            ${appUsers.length} (free, esportiva)`)
    console.log(`  user_contact_status:  ${contactStatus.length} (tag=${HIGH_RISK_TAG})`)
    console.log('  deposits:             0 (collection criada vazia)')
    console.log('\nNada gravado (dry-run).')
    return
  }

  const dest = new MongoClient(DEST_URI, { serverSelectionTimeoutMS: 12000 })
  await dest.connect()
  const db = dest.db(DEST_DB)

  const existing = (await db.listCollections().toArray()).map((x) => x.name)
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
  console.log('  collections finais:', (await db.listCollections().toArray()).map((x) => x.name).sort().join(', '))

  await dest.close()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
