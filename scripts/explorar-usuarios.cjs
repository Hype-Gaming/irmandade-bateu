// Exploração read-only do Mongo: lista bancos, coleções e campos de usuário
// (telefone/CPF) disponíveis. Não altera nada.
const { MongoClient } = require('mongodb')

const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()

  const admin = client.db().admin()
  const { databases } = await admin.listDatabases()

  for (const dbInfo of databases) {
    if (['admin', 'local', 'config'].includes(dbInfo.name)) continue
    const db = client.db(dbInfo.name)
    const collections = await db.listCollections().toArray()

    console.log(`\n=== DB: ${dbInfo.name} (${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(1)} MB) ===`)

    for (const colInfo of collections) {
      const col = db.collection(colInfo.name)
      const count = await col.estimatedDocumentCount()
      console.log(`  - ${colInfo.name}: ${count} docs`)

      // Amostra de campos só em coleções que parecem ter usuários
      if (/user|subscri|client|member/i.test(colInfo.name) && count > 0) {
        const sample = await col.findOne({})
        const keys = Object.keys(sample || {})
        console.log(`      campos: ${keys.join(', ')}`)
        const phone = sample?.phone || sample?.telefone || sample?.celular
        const cpf = sample?.cpf || sample?.document?.number || sample?.documento
        if (phone) console.log(`      exemplo phone: ${String(phone).slice(0, 4)}****`)
        if (cpf) console.log(`      exemplo cpf: ${String(cpf).slice(0, 3)}****`)
      }
    }
  }

  await client.close()
}

main().catch((err) => { console.error('ERRO:', err.message); process.exit(1) })
