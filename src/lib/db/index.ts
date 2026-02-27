import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy initialization - connection is only established when actually needed (runtime)

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _client: ReturnType<typeof postgres> | null = null

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please configure it in your .env file.'
    )
  }
  return connectionString
}

function getSslConfig(): 'require' | false {
  const sslEnv = process.env.DATABASE_SSL

  // Explicit override via DATABASE_SSL
  if (sslEnv === 'false' || sslEnv === '0') return false
  if (sslEnv === 'require') return 'require'

  // Docker/Coolify: default no SSL (local PostgreSQL)
  if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') return false

  // Default: no SSL for local PostgreSQL
  return false
}

function createClient() {
  if (!_client) {
    const connectionString = getConnectionString()

    _client = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: getSslConfig(),
    })
  }
  return _client
}

export function getDb() {
  if (!_db) {
    const client = createClient()
    _db = drizzle(client, { schema })
  }
  return _db
}

// For backward compatibility - uses lazy loading
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db]
  },
})

export type Database = ReturnType<typeof getDb>
