import xlsx from 'xlsx'
import { MongoClient } from 'mongodb'

const FILE = 'sales_list_2026-06-17.xlsx'
const EB_URI = process.env.EB_URI
const IRM = new Set(['[APP] IRMANDADE CLUB', 'IRMANDADE CLUB [VIP]', '[VIP] IRMANDADE CLUB'])

const onlyDigits = (s) => String(s || '').replace(/\D/g, '')

const main = async () => {
  const wb = xlsx.readFile(FILE)
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
  const irm = rows.filter((r) => String(r['Status da venda']).trim() === 'Aprovada' && IRM.has(String(r['Produto principal']).trim()))

  const byEmail = new Map()
  for (const r of irm) {
    const email = String(r['E-mail do membro'] || '').trim().toLowerCase()
    if (!email) continue
    if (!byEmail.has(email)) byEmail.set(email, { email, phone: onlyDigits(r['Telefone do membro']) })
  }
  const llEmails = new Set(byEmail.keys())
  const llPhones = new Set([...byEmail.values()].map((v) => v.phone).filter((p) => p.length >= 8))
  console.log(`Lastlink IRMANDADE: ${llEmails.size} emails únicos, ${llPhones.size} telefones`)

  const client = new MongoClient(EB_URI)
  await client.connect()
  const eb = client.db('users_apps_eb').collection('users_eb')
  const ebDocs = await eb.find({}, { projection: { email: 1, phone: 1, name: 1 } }).toArray()
  console.log(`users_eb: ${ebDocs.length} docs`)

  const ebByEmail = new Map()
  const ebByPhone = new Map()
  for (const d of ebDocs) {
    const e = String(d.email || '').trim().toLowerCase()
    const p = onlyDigits(d.phone)
    if (e) ebByEmail.set(e, d)
    if (p.length >= 8) ebByPhone.set(p.slice(-8), d) // últimos 8 dígitos pra evitar diferença de DDI/DDD
  }

  let emailMatch = 0, phoneMatch = 0, nameRecovered = 0
  for (const [email, v] of byEmail) {
    if (ebByEmail.has(email)) { emailMatch++; if (ebByEmail.get(email).name) nameRecovered++ ; continue }
    if (v.phone.length >= 8 && ebByPhone.has(v.phone.slice(-8))) { phoneMatch++; if (ebByPhone.get(v.phone.slice(-8)).name) nameRecovered++ }
  }
  console.log(`Overlap por email: ${emailMatch} | por telefone (sem email): ${phoneMatch}`)
  console.log(`Nomes recuperáveis via esportiva: ${nameRecovered}/${llEmails.size}`)

  // esportiva disponível pra completar (que NÃO está no lastlink)
  const ebOnly = ebDocs.filter((d) => {
    const e = String(d.email || '').trim().toLowerCase()
    return e && !llEmails.has(e)
  })
  console.log(`users_eb que NÃO estão no Lastlink (pra completar): ${ebOnly.length}`)

  await client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
