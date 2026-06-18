import { MongoClient } from 'mongodb'
const c = new MongoClient(process.env.DEST_URI)
await c.connect()
const subs = c.db('irmandade-hyper').collection('subscriptions')
const agg = await subs.aggregate([
  { $group: { _id: '$product', n: { $sum: 1 } } },
  { $sort: { n: -1 } }
]).toArray()
console.log('Produtos distintos em subscriptions:')
for (const r of agg) console.log(`  ${r.n.toString().padStart(3)}  ${r._id}`)
const total = agg.reduce((s, r) => s + r.n, 0)
const naoIrm = agg.filter(r => !/IRMANDADE CLUB/.test(String(r._id)))
console.log(`\nTotal: ${total}`)
console.log(`Fora de IRMANDADE CLUB: ${naoIrm.length === 0 ? 'NENHUM ✅' : JSON.stringify(naoIrm)}`)
await c.close()
