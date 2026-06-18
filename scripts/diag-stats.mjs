// DIAGNÓSTICO (somente leitura) do endpoint /api/admin/stats em produção.
// Conecta exatamente como o app conecta e reproduz as agregações do stats,
// reportando o que retorna ou qual erro estoura. Não grava nada.
import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI
const DB_NAME = 'irmandade-hyper' // igual ao mongodb.ts do app

const main = async () => {
  console.log('URI usada:', URI?.replace(/:[^:@]+@/, ':***@'))
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    console.log('[ok] conexão e ping')
  } catch (e) {
    console.log('[FALHA na conexão]', e.message)
    process.exit(0)
  }

  const db = client.db(DB_NAME)
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort()
  console.log(`\ncollections em ${DB_NAME}:`, cols.join(', ') || '(vazio)')

  for (const n of ['app_users', 'subscriptions', 'deposits']) {
    const exists = cols.includes(n)
    const count = exists ? await db.collection(n).countDocuments({}) : '(não existe)'
    console.log(`  ${n.padEnd(16)} ${count}`)
  }

  // reproduz a agregação mais arriscada do stats (atRisk: $unionWith + enrichment)
  console.log('\nTeste da agregação atRisk ($unionWith/$lookup):')
  try {
    const r = await db.collection('app_users').aggregate([
      { $unionWith: { coll: 'subscriptions', pipeline: [{ $match: { status: 'active' } }, { $count: 'x' }] } },
      { $limit: 1 }
    ]).toArray()
    console.log('  [ok] $unionWith suportado. amostra:', JSON.stringify(r))
  } catch (e) {
    console.log('  [FALHA $unionWith]', e.codeName || '', e.message)
  }

  // versão do servidor (relevante p/ $unionWith — precisa >= 4.4)
  try {
    const info = await client.db('admin').command({ buildInfo: 1 })
    console.log('\nMongoDB version:', info.version)
  } catch (e) {
    console.log('\nbuildInfo indisponível:', e.message)
  }

  await client.close()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
