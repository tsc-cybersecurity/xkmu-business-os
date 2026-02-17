import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { dinRequirements, dinGrants } from '../schema'
import { requirementsSeedData } from './din-requirements.seed'
import { grantsSeedData } from './din-grants.seed'
import { count } from 'drizzle-orm'

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

  console.log('Seeding DIN SPEC 27076 data...')
  console.log('='.repeat(50))

  // Seed Requirements
  const [{ total: reqCount }] = await db.select({ total: count() }).from(dinRequirements)
  if (Number(reqCount) === 0) {
    console.log('Seeding requirements...')
    await db.insert(dinRequirements).values(requirementsSeedData)
    console.log(`Created ${requirementsSeedData.length} requirements`)
  } else {
    console.log(`Requirements already seeded (${reqCount} found), skipping...`)
  }

  // Seed Grants
  const [{ total: grantCount }] = await db.select({ total: count() }).from(dinGrants)
  if (Number(grantCount) === 0) {
    console.log('Seeding grants...')
    await db.insert(dinGrants).values(grantsSeedData)
    console.log(`Created ${grantsSeedData.length} grants`)
  } else {
    console.log(`Grants already seeded (${grantCount} found), skipping...`)
  }

  console.log('='.repeat(50))
  console.log('DIN SPEC 27076 seed completed!')
  console.log('')
  console.log('Summary:')
  console.log(`- 54 Requirements (27 groups, 6 topics)`)
  console.log(`- ${grantsSeedData.length} Foerderprogramme`)

  await client.end()
}

seedDin().catch((error) => {
  console.error('DIN seed failed:', error)
  process.exit(1)
})
