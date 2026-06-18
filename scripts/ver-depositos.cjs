// Read-only: lista depósitos da Irmandade e marca quais são de usuários bloqueados
const { MongoClient } = require('mongodb')
const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const db = client.db('irmandade-hyper')

  const deposits = await db.collection('deposits').find({}).sort({ created_at: -1 }).toArray()
  const blockedEmails = new Set(
    (await db.collection('app_users').find({ blocked: true }, { projection: { email: 1 } }).toArray())
      .map((u) => u.email)
  )

  console.log(`Total de depósitos: ${deposits.length}`)
  console.log(`Usuários bloqueados: ${blockedEmails.size}`)
  console.log(`\nStatus distintos nos depósitos:`, [...new Set(deposits.map((d) => d.status))])
  console.log('')

  for (const d of deposits) {
    const flag = blockedEmails.has(d.email) ? '  <-- USUÁRIO BLOQUEADO' : ''
    console.log(`${new Date(d.created_at).toLocaleString('pt-BR')} | ${d.email} | R$ ${d.amount} | ${d.brand_slug} | ${d.status} | tx=${d.transaction_id}${flag}`)
  }

  await client.close()
}
main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
