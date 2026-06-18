// Cruza os e-mails da irmandade-hyper.subscriptions com as coleções de usuário
// do servidor para recuperar telefone e CPF. READ-ONLY — só consulta pelos
// e-mails que já estão na lista de assinantes da Irmandade. Gera um CSV.
const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'
const SKIP_DBS = new Set(['admin', 'local', 'config'])

// Extrai telefone/CPF de um doc de usuário em qualquer formato conhecido.
const pickPhone = (doc) => {
  const p = doc.profile || {}
  return doc.phone || doc.telefone || doc.celular || p.phone || p.telefone || p.cellphone || p.mobile || null
}
const pickCpf = (doc) => {
  const p = doc.profile || {}
  const raw =
    doc.cpf || doc.documentNumber || doc.documento ||
    (doc.document && (doc.document.number || doc.document)) ||
    p.cpf || p.documentNumber ||
    (p.document && (p.document.number || p.document)) || null
  return raw ? String(raw) : null
}
const pickName = (doc) => doc.name || doc.profile?.name || doc.nome || null

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()

  // 1) e-mails-alvo da Irmandade
  const subs = await client.db('irmandade-hyper').collection('subscriptions')
    .find({}, { projection: { email: 1 } }).toArray()
  const emails = [...new Set(subs.map((s) => (s.email || '').toLowerCase().trim()).filter(Boolean))]
  console.log(`Alvo: ${emails.length} e-mails da subscriptions`)

  // resultado por e-mail
  const found = new Map(emails.map((e) => [e, { email: e, name: null, phone: null, cpf: null, fontes: [] }]))

  // 2) varre todos os bancos/coleções que tenham campo email, consultando só os 38
  const { databases } = await client.db().admin().listDatabases()
  for (const dbInfo of databases) {
    if (SKIP_DBS.has(dbInfo.name)) continue
    const db = client.db(dbInfo.name)
    const collections = await db.listCollections().toArray()

    for (const colInfo of collections) {
      const col = db.collection(colInfo.name)

      // procura por email no topo OU em profile.email
      let docs = []
      try {
        docs = await col.find(
          { $or: [{ email: { $in: emails } }, { 'profile.email': { $in: emails } }] },
          { limit: 2000 }
        ).toArray()
      } catch {
        continue // coleção sem índice/forma compatível — ignora
      }
      if (!docs.length) continue

      for (const doc of docs) {
        const email = (doc.email || doc.profile?.email || '').toLowerCase().trim()
        const rec = found.get(email)
        if (!rec) continue
        const phone = pickPhone(doc)
        const cpf = pickCpf(doc)
        const name = pickName(doc)
        if (phone && !rec.phone) rec.phone = String(phone)
        if (cpf && !rec.cpf) rec.cpf = cpf
        if (name && !rec.name) rec.name = name
        if (phone || cpf) rec.fontes.push(`${dbInfo.name}.${colInfo.name}`)
      }
    }
  }

  // 3) CSV
  const rows = [...found.values()]
  const withPhone = rows.filter((r) => r.phone).length
  const withCpf = rows.filter((r) => r.cpf).length

  const csvEscape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = 'email,nome,telefone,cpf,fontes'
  const lines = rows.map((r) =>
    [r.email, r.name, r.phone, r.cpf, [...new Set(r.fontes)].join(' | ')].map(csvEscape).join(','))
  const csv = [header, ...lines].join('\n')

  const outPath = path.join(__dirname, 'usuarios-irmandade.csv')
  fs.writeFileSync(outPath, '﻿' + csv, 'utf8') // BOM p/ Excel abrir acentos certo

  console.log(`\nResultado:`)
  console.log(`  com telefone: ${withPhone}/${rows.length}`)
  console.log(`  com CPF:      ${withCpf}/${rows.length}`)
  console.log(`  CSV salvo em: ${outPath}`)

  await client.close()
}

main().catch((err) => { console.error('ERRO:', err.message); process.exit(1) })
