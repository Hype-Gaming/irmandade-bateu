import { MongoClient } from 'mongodb'

const URI = process.env.EB_URI
const DB_NAME = process.env.EB_DB || 'users_apps_eb'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const db = client.db(DB_NAME)

  const collections = await db.listCollections().toArray()
  console.log(`\n=== DB: ${DB_NAME} — ${collections.length} collections ===`)

  for (const c of collections) {
    const col = db.collection(c.name)
    const count = await col.estimatedDocumentCount()
    console.log(`\n--- ${c.name} (~${count} docs) ---`)
    const sample = await col.findOne({})
    if (sample) {
      // só mostra as chaves e tipos pra não vazar PII em massa
      const shape = {}
      for (const [k, v] of Object.entries(sample)) {
        shape[k] = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
      }
      console.log('keys:', JSON.stringify(shape, null, 2))
    }
  }

  await client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
