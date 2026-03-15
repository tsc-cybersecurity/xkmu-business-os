import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { dinRequirements, dinGrants } from '../schema'
import { requirementsSeedData } from './din-requirements.seed'
import { grantsSeedData } from './din-grants.seed'
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

async function seedDin() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  logger.info('Seeding DIN SPEC 27076 data...', { module: 'DinSeed' })

  // Seed Requirements
  const [{ total: reqCount }] = await db.select({ total: count() }).from(dinRequirements)
  if (Number(reqCount) === 0) {
    logger.info('Seeding requirements...', { module: 'DinSeed' })
    await db.insert(dinRequirements).values(requirementsSeedData)
    logger.info(`Created ${requirementsSeedData.length} requirements`, { module: 'DinSeed' })
  } else {
    logger.info(`Requirements already seeded (${reqCount} found), skipping...`, { module: 'DinSeed' })
  }

  // Seed Grants
  const [{ total: grantCount }] = await db.select({ total: count() }).from(dinGrants)
  if (Number(grantCount) === 0) {
    logger.info('Seeding grants...', { module: 'DinSeed' })
    await db.insert(dinGrants).values(grantsSeedData)
    logger.info(`Created ${grantsSeedData.length} grants`, { module: 'DinSeed' })
  } else {
    logger.info(`Grants already seeded (${grantCount} found), skipping...`, { module: 'DinSeed' })
  }

  logger.info(`DIN SPEC 27076 seed completed! 54 Requirements, ${grantsSeedData.length} Foerderprogramme`, { module: 'DinSeed' })

  await client.end()
}

seedDin().catch((error) => {
  logger.error('DIN seed failed', error, { module: 'DinSeed' })
  process.exit(1)
})
