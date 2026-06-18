import { MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export const getDb = async (): Promise<Db> => {
  if (db) return db

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI não definida no ambiente — configure o .env')

  // Sem fallback de propósito: se MONGODB_DB faltar, falha alto em vez de gravar
  // silenciosamente no banco errado (ex.: Bateu caindo no irmandade-hyper).
  const dbName = process.env.MONGODB_DB
  if (!dbName) throw new Error('MONGODB_DB não definida no ambiente — configure o .env')

  client = new MongoClient(uri)
  await client.connect()
  db = client.db(dbName)

  return db
}
