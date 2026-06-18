// Exporta os usuários da Irmandade (irmandade-hyper) para CSV.
// Junta subscriptions (assinantes Lastlink) com app_users (dados capturados
// pelo app: nome, telefone, cpf, marca, último acesso) por e-mail.
//
// Uso: node scripts/exportar-usuarios.cjs
// Saída: scripts/usuarios-irmandade.csv
const { MongoClient } = require('mongodb')
const { writeFileSync } = require('fs')
const { join } = require('path')

const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const csvField = (value) => {
  const s = value == null ? '' : String(value)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const db = client.db('irmandade-hyper')

  const subscriptions = await db.collection('subscriptions').find({}).toArray()
  const appUsers = await db.collection('app_users').find({}).toArray()

  const byEmail = new Map()
  for (const sub of subscriptions) {
    byEmail.set(sub.email, {
      email: sub.email,
      assinatura_status: sub.status || '',
      assinatura_role: sub.role || '',
      produto: sub.product || ''
    })
  }
  for (const u of appUsers) {
    const row = byEmail.get(u.email) || { email: u.email }
    row.nome = u.name || ''
    row.telefone = u.phone || ''
    row.cpf = u.cpf || ''
    row.marca = u.brand_slug || ''
    row.bloqueado = u.blocked ? 'sim' : 'nao'
    row.ultimo_acesso = u.last_seen_at ? new Date(u.last_seen_at).toISOString() : ''
    byEmail.set(u.email, row)
  }

  const headers = ['email', 'nome', 'telefone', 'cpf', 'marca', 'assinatura_status', 'assinatura_role', 'produto', 'bloqueado', 'ultimo_acesso']
  const lines = [headers.join(';')]
  for (const row of byEmail.values()) {
    lines.push(headers.map((h) => csvField(row[h])).join(';'))
  }

  const outPath = join(__dirname, 'usuarios-irmandade.csv')
  writeFileSync(outPath, '﻿' + lines.join('\n'), 'utf8') // BOM p/ Excel

  console.log(`Total: ${byEmail.size} usuários (${subscriptions.length} assinaturas, ${appUsers.length} com dados do app)`)
  const comTelefone = [...byEmail.values()].filter((r) => r.telefone).length
  const comCpf = [...byEmail.values()].filter((r) => r.cpf).length
  console.log(`Com telefone: ${comTelefone} | Com CPF: ${comCpf}`)
  console.log(`CSV: ${outPath}`)

  await client.close()
}

main().catch((err) => { console.error('ERRO:', err.message); process.exit(1) })
