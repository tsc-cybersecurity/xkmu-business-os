import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy initialization for Vercel compatibility
// Database connection is only established when actually needed (runtime)
// This prevents build-time errors when DATABASE_URL is not available

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _client: ReturnType<typeof postgres> | null = null

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please configure it in your Vercel project settings or .env file.'
    )
  }
  return connectionString
}

function createClient() {
  if (!_client) {
    const connectionString = getConnectionString()

    // Vercel/Serverless optimized settings
    _client = postgres(connectionString, {
      max: 5, // Reduced for serverless (connection pooling)
      idle_timeout: 20,
      connect_timeout: 10,
      // SSL required for most cloud providers (Vercel Postgres, Neon, Supabase)
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
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
