import { MongoClient } from 'mongodb'
const c = new MongoClient(process.env.DEST_URI)
await c.connect()
const db = c.db('irmandade-hyper')
const s = await db.collection('subscriptions').findOne({})
const u = await db.collection('app_users').findOne({})
const mask = (o) => o ? { ...o, email: String(o.email).slice(0,3)+'***', phone: o.phone ? '***'+String(o.phone).slice(-4) : o.phone } : o
console.log('subscriptions sample:', JSON.stringify(mask(s), null, 2))
console.log('app_users sample:', JSON.stringify(mask(u), null, 2))
console.log('active/paid count:', await db.collection('subscriptions').countDocuments({ status:'active', role:'paid' }))
await c.close()
