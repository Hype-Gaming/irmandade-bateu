// Backfill: grava nas subscriptions os telefones da lista de vendas Lastlink
// (clientes que pagaram mas cujo telefone só existia no relatório exportado).
// Uso: node scripts/import-lastlink-phones.mjs
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'

let uri = 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  const m = env.match(/^MONGODB_URI=(.*)$/m)
  if (m) uri = m[1].trim().replace(/^["']|["']$/g, '')
} catch {}

const DB_NAME = 'irmandade-hyper'

// e-mail -> telefone (lista Lastlink 2026-06-12). Só os que têm telefone.
const phones = {
  'ludimilacosta0309@gmail.com': '+5566981316733',
  'valmeida73@gmail.com': '+5515991779647',
  'nicolycastroo77@gmail.com': '+5511988559448',
  'leandro.ns@yahoo.com': '+5511945596813',
  'tarcisio.prepara246@gmail.com': '+5571981482650',
  'pamelamello1570@gmail.com': '+5511943072799',
  'edeebatista27@gmail.com': '+5569992399397',
  'f.rafaelrodrigues2000@gmail.com': '+5588992058224',
  'pedrocantanhede3206@gmail.com': '+5517991463003',
  'daniellucas987@gmail.com': '+5531993208166',
  'igoroliveiraleal2@gmail.com': '+5527992374628',
  'airtondallasta@gmail.com': '+5567999896035',
  'wenderglima@gmail.com': '+5531993161893',
  'celiodeoliveira47@gmail.com': '+5516996087266',
  'rogerio.luiz.83@gmail.com': '+5566984439529',
  'meuvipgame@gmail.com': '+5531983174742',
  'blackfree333@gmail.com': '+5598984107211',
  'alvesrondinel417@gmail.com': '+5583998457865',
  'yurisantos9999.ys@gmail.com': '+5569992027157',
  'dddddd.df919@gmail.com': '+5551996460641',
  'silasnelson43@gmail.com': '+5581979044420',
  'carlosvinicius1999az@gmail.com': '+5574999476465',
  'camifoliveira@hotmail.com': '+18453817722',
  'liviaraffaela@hotmail.com': '+5588999706144',
  'gnomochapado40@gmail.com': '+5571981803434',
  '75889802veni@gmail.com': '+5575999018148'
}

const client = new MongoClient(uri)
await client.connect()
const col = client.db(DB_NAME).collection('subscriptions')

let updated = 0, notFound = 0
for (const [email, phone] of Object.entries(phones)) {
  const r = await col.updateOne(
    { email: email.toLowerCase() },
    { $set: { phone, contact_source: 'lastlink-import', updated_at: new Date() } }
  )
  if (r.matchedCount) { updated++; console.log('ok   ', phone, email) }
  else { notFound++; console.log('miss ', phone, email) }
}

console.log(`\nAtualizados: ${updated} | não encontrados: ${notFound}`)
await client.close()
