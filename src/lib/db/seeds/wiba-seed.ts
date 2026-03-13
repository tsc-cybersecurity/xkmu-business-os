import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { wibaRequirements } from '../schema'
import { wibaRequirementsSeedData } from './wiba-requirements.seed'
import { count } from 'drizzle-orm'

function getSslConfig(): 'require' | false {
  const sslEnv = process.env.DATABASE_SSL
  if (sslEnv === 'false' || sslEnv === '0') return false
  if (sslEnv === 'require') return 'require'
  if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') return false
  if (process.env.NODE_ENV === 'production') return 'require'
  return false
}

async function seedWiba() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  console.log('Seeding BSI WiBA data...')
  console.log('='.repeat(50))

  const [{ total: reqCount }] = await db.select({ total: count() }).from(wibaRequirements)
  if (Number(reqCount) === 0) {
    console.log('Seeding WiBA requirements...')
    // Insert in batches of 50 to avoid query size limits
    for (let i = 0; i < wibaRequirementsSeedData.length; i += 50) {
      const batch = wibaRequirementsSeedData.slice(i, i + 50)
      await db.insert(wibaRequirements).values(batch)
    }
    console.log(`Created ${wibaRequirementsSeedData.length} requirements`)
  } else {
    console.log(`WiBA requirements already seeded (${reqCount} found), skipping...`)
  }

  console.log('='.repeat(50))
  console.log('BSI WiBA seed completed!')
  console.log('')
  console.log('Summary:')
  console.log(`- ${wibaRequirementsSeedData.length} Prueffragen (19 Kategorien)`)

  await client.end()
}

seedWiba().catch((error) => {
  console.error('WiBA seed failed:', error)
  process.exit(1)
})
