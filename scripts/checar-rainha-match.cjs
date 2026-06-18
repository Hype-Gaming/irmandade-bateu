// Read-only: quantos dos 38 e-mails da Irmandade aparecem na rainha-da-bet e se têm phone
const { MongoClient } = require('mongodb')
const URI = process.env.MONGODB_URI || 'mongodb://automalabs:WtYewnziLuZa4M@104.234.186.24:27017/'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const emails = [...new Set((await client.db('irmandade-hyper').collection('subscriptions')
    .find({}, { projection: { email: 1 } }).toArray())
    .map((s) => (s.email || '').toLowerCase().trim()).filter(Boolean))]

  const rdb = client.db('rainha-da-bet')
  for (const name of ['subscriptions', 'access_requests']) {
    const docs = await rdb.collection(name).find({ email: { $in: emails } }).toArray()
    const comPhone = docs.filter((d) => d.phone).length
    console.log(`rainha-da-bet.${name}: ${docs.length} dos 38 e-mails presentes, ${comPhone} com telefone`)
    docs.filter((d) => d.phone).forEach((d) => console.log(`   ${d.email} -> ${d.phone}`))
  }

  // a access_requests guardava CPF no campo email no sample — quantos e-mails de verdade ela tem?
  const totalAR = await rdb.collection('access_requests').countDocuments({ email: /@/ })
  console.log(`\naccess_requests: ${totalAR}/44 registros têm e-mail de verdade no campo email`)
  await client.close()
}
main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
