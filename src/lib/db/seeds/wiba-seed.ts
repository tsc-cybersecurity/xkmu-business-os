import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { wibaRequirements } from '../schema'
import { wibaRequirementsSeedData } from './wiba-requirements.seed'
import { count } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

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

  logger.info('Seeding BSI WiBA data...', { module: 'WibaSeed' })

  const [{ total: reqCount }] = await db.select({ total: count() }).from(wibaRequirements)
  if (Number(reqCount) === 0) {
    logger.info('Seeding WiBA requirements...', { module: 'WibaSeed' })
    // Insert in batches of 50 to avoid query size limits
    for (let i = 0; i < wibaRequirementsSeedData.length; i += 50) {
      const batch = wibaRequirementsSeedData.slice(i, i + 50)
      await db.insert(wibaRequirements).values(batch)
    }
    logger.info(`Created ${wibaRequirementsSeedData.length} requirements`, { module: 'WibaSeed' })
  } else {
    logger.info(`WiBA requirements already seeded (${reqCount} found), skipping...`, { module: 'WibaSeed' })
  }

  logger.info(`BSI WiBA seed completed! ${wibaRequirementsSeedData.length} Prueffragen (19 Kategorien)`, { module: 'WibaSeed' })

  await client.end()
}

seedWiba().catch((error) => {
  logger.error('WiBA seed failed', error, { module: 'WibaSeed' })
  process.exit(1)
})
