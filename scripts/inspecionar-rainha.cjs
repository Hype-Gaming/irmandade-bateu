// Read-only: estrutura das coleções da rainha-da-bet (chaves + valores mascarados)
const { MongoClient } = require('mongodb')
const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const mask = (v) => {
  if (v == null) return v
  if (typeof v === 'object') return '{' + Object.keys(v).join(',') + '}'
  const s = String(v)
  return s.length <= 4 ? s : s.slice(0, 3) + '***'
}

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const db = client.db('rainha-da-bet')
  for (const name of ['subscriptions', 'access_requests']) {
    const col = db.collection(name)
    const count = await col.estimatedDocumentCount()
    const sample = await col.findOne({})
    console.log(`\n=== rainha-da-bet.${name} (${count} docs) ===`)
    if (sample) {
      for (const [k, v] of Object.entries(sample)) console.log(`  ${k}: ${mask(v)}`)
    }
  }
  await client.close()
}
main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
