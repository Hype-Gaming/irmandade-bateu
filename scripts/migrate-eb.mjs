import { MongoClient } from 'mongodb'

// Migração de cópia IDÊNTICA: copia todas as collections de SRC_DB para DEST_DB
// (mesmos nomes, mesmo schema, preservando _id). Idempotente via replaceOne+upsert por _id.
//
// Uso:
//   SRC_URI=... DEST_URI=... node scripts/migrate-eb.mjs --dry-run
//   SRC_URI=... DEST_URI=... node scripts/migrate-eb.mjs           # grava de verdade
//
// Flags:
//   --dry-run            só conta, não grava
//   --wipe               apaga a collection no destino antes de copiar
//   --only=a,b,c         copia só essas collections

const SRC_URI = process.env.SRC_URI
const SRC_DB = process.env.SRC_DB || 'users_apps_eb'
const DEST_URI = process.env.DEST_URI
const DEST_DB = process.env.DEST_DB || 'irmandade-hyper'

const DRY = process.argv.includes('--dry-run')
const WIPE = process.argv.includes('--wipe')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const ONLY = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null

const BATCH = 500

if (!SRC_URI || !DEST_URI) {
  console.error('Faltam SRC_URI e/ou DEST_URI no ambiente.')
  process.exit(1)
}

const main = async () => {
  const src = new MongoClient(SRC_URI)
  const dest = new MongoClient(DEST_URI)
  await src.connect()
  await dest.connect()
  console.log(`[ok] conectado na origem (${SRC_DB}) e no destino (${DEST_DB})`)

  const srcDb = src.db(SRC_DB)
  const destDb = dest.db(DEST_DB)

  let collections = (await srcDb.listCollections().toArray()).map((c) => c.name)
  if (ONLY) collections = collections.filter((c) => ONLY.includes(c))
  collections.sort()

  console.log(`\n${DRY ? '[DRY-RUN] ' : ''}${collections.length} collections a copiar:\n`)

  let totalDocs = 0
  const summary = []

  for (const name of collections) {
    const srcCol = srcDb.collection(name)
    const docs = await srcCol.find({}).toArray()
    totalDocs += docs.length

    if (DRY) {
      const destCount = await destDb.collection(name).estimatedDocumentCount().catch(() => 0)
      summary.push({ collection: name, origem: docs.length, destinoAntes: destCount })
      console.log(`  ${name.padEnd(32)} origem=${String(docs.length).padStart(4)}  destino(antes)=${destCount}`)
      continue
    }

    const destCol = destDb.collection(name)
    if (WIPE) await destCol.deleteMany({})

    let written = 0
    for (let i = 0; i < docs.length; i += BATCH) {
      const chunk = docs.slice(i, i + BATCH)
      if (!chunk.length) continue
      const ops = chunk.map((d) => ({
        replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true }
      }))
      const res = await destCol.bulkWrite(ops, { ordered: false })
      written += (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0)
    }
    const destCount = await destCol.estimatedDocumentCount()
    summary.push({ collection: name, origem: docs.length, gravados: written, destinoAgora: destCount })
    console.log(`  ${name.padEnd(32)} origem=${String(docs.length).padStart(4)}  gravados=${written}  destino(agora)=${destCount}`)
  }

  console.log(`\n${DRY ? '[DRY-RUN] ' : ''}Total: ${collections.length} collections, ${totalDocs} docs na origem.`)
  if (DRY) console.log('Nada foi gravado (dry-run).')

  await src.close()
  await dest.close()
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
