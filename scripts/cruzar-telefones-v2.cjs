// v3: cruza os 38 e-mails da irmandade-hyper.subscriptions com TODAS as coleções
// de usuário do servidor. Combina detecção automática do campo de e-mail (para
// achar espelhos com formatos diferentes) com extratores fixos robustos de
// telefone/CPF (cobrindo profile.document.number etc.). READ-ONLY, restrito aos
// e-mails já presentes na lista de assinantes. Gera CSV.
const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'
const SKIP_DBS = new Set(['admin', 'local', 'config'])
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ---- extratores fixos (cobrem os formatos conhecidos) ----
const firstStr = (...vals) => {
  for (const v of vals) {
    if (v == null) continue
    if (typeof v === 'object') {
      const n = v.number || v.value || v.numero
      if (n) return String(n)
      continue
    }
    const s = String(v).trim()
    if (s) return s
  }
  return null
}
const pickPhone = (d, p = d.profile || {}) =>
  firstStr(d.phone, d.telefone, d.celular, d.whatsapp, d.cellphone, d.mobile,
    p.phone, p.telefone, p.celular, p.cellphone, p.mobile, p.whatsapp)
const pickCpf = (d, p = d.profile || {}) =>
  firstStr(d.cpf, d.documentNumber, d.documento, d.document, d.taxId, d.tax_id,
    p.cpf, p.documentNumber, p.documento, p.document, p.taxId)
const pickName = (d, p = d.profile || {}) =>
  firstStr(d.name, d.nome, d.fullName, d.full_name, p.name, p.nome, p.fullName)

// ---- detecção automática do campo de e-mail (até 2 níveis) ----
const flatten = (obj, prefix = '', depth = 0, out = {}) => {
  if (!obj || typeof obj !== 'object' || depth > 2) return out
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, keyPath, depth + 1, out)
    else out[keyPath] = v
  }
  return out
}
const PHONE_KEYS = /(^|[._])(phone|telefone|celular|cellphone|mobile|whatsapp|telephone|ddd)([._]|$)/i
const CPF_KEYS = /(^|[._])(cpf|documentnumber|document|documento|taxid|tax_id)([._]|$)/i
const lastSeg = (p) => p.split('.').pop()
const detectEmailField = (sample) => {
  const flat = flatten(sample)
  // 1) campo cujo valor parece e-mail
  for (const [keyPath, val] of Object.entries(flat)) {
    if (EMAIL_RE.test(val == null ? '' : String(val))) return keyPath
  }
  // 2) fallback: campo literalmente chamado "email" (mesmo que a amostra tenha
  //    outro conteúdo, ex.: access_requests que guarda CPF no campo email)
  for (const keyPath of Object.keys(flat)) {
    if (/(^|\.)email$/i.test(keyPath)) return keyPath
  }
  return null
}
// detecta campos de telefone/cpf pelo NOME (fallback quando os extratores fixos falham)
const detectByName = (sample, re) => {
  for (const keyPath of Object.keys(flatten(sample))) {
    if (re.test(keyPath) || re.test(lastSeg(keyPath))) return keyPath
  }
  return null
}
const getPath = (doc, p) => p ? p.split('.').reduce((a, k) => (a == null ? a : a[k]), doc) : null
const asStr = (v) => {
  if (v == null) return null
  if (typeof v === 'object') return v.number || v.value || v.numero ? String(v.number || v.value || v.numero) : null
  const s = String(v).trim()
  return s || null
}

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()

  const subs = await client.db('irmandade-hyper').collection('subscriptions')
    .find({}, { projection: { email: 1 } }).toArray()
  const emails = [...new Set(subs.map((s) => (s.email || '').toLowerCase().trim()).filter(Boolean))]
  console.log(`Alvo: ${emails.length} e-mails`)

  const found = new Map(emails.map((e) => [e, { email: e, name: null, phone: null, cpf: null, fontes: [] }]))

  const { databases } = await client.db().admin().listDatabases()
  for (const dbInfo of databases) {
    if (SKIP_DBS.has(dbInfo.name)) continue
    const db = client.db(dbInfo.name)
    const collections = await db.listCollections().toArray()

    for (const colInfo of collections) {
      if (colInfo.type === 'view') continue
      const col = db.collection(colInfo.name)

      let sample
      try { sample = await col.findOne({}) } catch { continue }
      if (!sample) continue
      const emailField = detectEmailField(sample)
      if (!emailField) continue
      const phoneField = detectByName(sample, PHONE_KEYS)
      const cpfField = detectByName(sample, CPF_KEYS)

      const emailFields = [...new Set([emailField, 'email', 'profile.email'])]
      const or = emailFields.map((f) => ({ [f]: { $in: emails } }))
      let docs = []
      try { docs = await col.find({ $or: or }, { limit: 3000 }).toArray() } catch { continue }
      if (!docs.length) continue

      for (const doc of docs) {
        const email = String(getPath(doc, emailField) || doc.email || getPath(doc, 'profile.email') || '')
          .toLowerCase().trim()
        const rec = found.get(email)
        if (!rec) continue
        // extrator fixo primeiro; se falhar, usa o campo detectado pelo nome
        const phone = pickPhone(doc) || asStr(getPath(doc, phoneField))
        const cpf = pickCpf(doc) || asStr(getPath(doc, cpfField))
        const name = pickName(doc)
        if (phone && !rec.phone) rec.phone = phone
        if (cpf && !rec.cpf) rec.cpf = cpf
        if (name && !rec.name) rec.name = name
        if (phone || cpf) rec.fontes.push(`${dbInfo.name}.${colInfo.name}`)
      }
    }
  }

  const rows = [...found.values()]
  const csvEscape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = 'email,nome,telefone,cpf'
  const lines = rows.map((r) =>
    [r.email, r.name, r.phone, r.cpf].map(csvEscape).join(','))
  const outPath = path.join(__dirname, 'usuarios-irmandade.csv')
  fs.writeFileSync(outPath, '﻿' + [header, ...lines].join('\n'), 'utf8')

  console.log(`\nResultado:`)
  console.log(`  com telefone: ${rows.filter((r) => r.phone).length}/${rows.length}`)
  console.log(`  com CPF:      ${rows.filter((r) => r.cpf).length}/${rows.length}`)
  console.log(`  só com e-mail: ${rows.filter((r) => !r.phone && !r.cpf).length}/${rows.length}`)
  console.log(`  CSV salvo em: ${outPath}`)

  await client.close()
}

main().catch((err) => { console.error('ERRO:', err.message); process.exit(1) })
