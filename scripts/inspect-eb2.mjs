import { MongoClient } from 'mongodb'

const URI = process.env.EB_URI
const DB_NAME = process.env.EB_DB || 'users_apps_eb'

const main = async () => {
  const client = new MongoClient(URI)
  await client.connect()
  const db = client.db(DB_NAME)

  // distinct status no users_eb
  const eb = db.collection('users_eb')
  console.log('users_eb status distinct:', await eb.distinct('status'))
  console.log('users_eb platformId distinct:', (await eb.distinct('platformId')).slice(0, 10))
  console.log('users_eb appInstall distinct:', await eb.distinct('appInstall'))

  // 1 doc de exemplo (mascarando email/phone/doc)
  const doc = await eb.findOne({})
  const mask = (s) => (typeof s === 'string' && s.length > 4 ? s.slice(0, 3) + '***' + s.slice(-2) : s)
  console.log('\nexemplo users_eb:', JSON.stringify({
    ...doc,
    email: mask(doc.email), phone: mask(doc.phone), documentNumber: mask(doc.documentNumber), name: mask(doc.name)
  }, null, 2))

  // deposits sample + distinct slug
  const dep = db.collection('deposits')
  console.log('\ndeposits slug distinct:', await dep.distinct('slug'))
  console.log('deposits status distinct:', await dep.distinct('status'))
  const d = await dep.findOne({})
  console.log('exemplo deposit:', JSON.stringify({ ...d, userEmail: mask(d.userEmail), userName: mask(d.userName) }, null, 2))

  await client.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
