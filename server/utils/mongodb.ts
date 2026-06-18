import { MongoClient, type Db } from 'mongodb'

const DB_NAME = process.env.MONGODB_DB || 'irmandade-hyper'

let client: MongoClient | null = null
let db: Db | null = null

export const getDb = async (): Promise<Db> => {
  if (db) return db

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI não definida no ambiente — configure o .env')

  client = new MongoClient(uri)
  await client.connect()
  db = client.db(DB_NAME)

  return db
}
