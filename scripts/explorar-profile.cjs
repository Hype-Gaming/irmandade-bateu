// Read-only: amostra a estrutura do campo profile e marcas nas coleções candidatas
const { MongoClient } = require('mongodb')

const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()

  const at = client.db('aposta_tudo')

  console.log('=== aposta_tudo.users: brand_slug distintos ===')
  console.log(await at.collection('users').distinct('brand_slug'))

  console.log('\n=== aposta_tudo.users: exemplo de profile (chaves) ===')
  const sample = await at.collection('users').findOne({})
  console.log('chaves do profile:', Object.keys(sample?.profile || {}))
  const p = sample?.profile || {}
  console.log('phone presente?', 'phone' in p, '| document presente?', 'document' in p || 'documentNumber' in p || 'cpf' in p)
  if (p.document) console.log('document keys:', typeof p.document === 'object' ? Object.keys(p.document) : typeof p.document)

  console.log('\n=== maxima_bet_auth.default: exemplo (chaves) ===')
  const mx = await client.db('maxima_bet_auth').collection('default').findOne({})
  console.log(Object.keys(mx || {}))

  console.log('\n=== auth_gingabet_users.zkdados: exemplo (chaves) ===')
  const zk = await client.db('auth_gingabet_users').collection('zkdados').findOne({})
  console.log(Object.keys(zk || {}))

  await client.close()
}

main().catch((err) => { console.error('ERRO:', err.message); process.exit(1) })
