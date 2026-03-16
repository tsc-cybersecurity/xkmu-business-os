import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { tenants, users } from './schema'
import { logger } from '@/lib/utils/logger'

const SEED_DATA = {
  tenant: {
    name: 'Default Organisation',
    slug: 'default',
    status: 'active',
  },
  user: {
    email: process.env.SEED_ADMIN_EMAIL || 'xkmu9c0up6ab04k35f66784bljf2rqb5f43@vdix.de',
    password: process.env.SEED_ADMIN_PASSWORD || 'fG58Ebj2@MDv6uvm',
    firstName: 'xKMU',
    lastName: 'Admin',
    role: 'owner',
  },
}

function getSslConfig(): 'require' | false {
  const sslEnv = process.env.DATABASE_SSL
  if (sslEnv === 'false' || sslEnv === '0') return false
  if (sslEnv === 'require') return 'require'
  if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') return false
  if (process.env.NODE_ENV === 'production') return 'require'
  return false
}

async function seed() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  logger.info('Seeding database...', { module: 'Seed' })

  // 1. Create Tenant
  const [tenant] = await db
    .insert(tenants)
    .values(SEED_DATA.tenant)
    .returning()

  logger.info(`Created tenant: ${tenant.name} (${tenant.slug})`, { module: 'Seed' })

  // 2. Create Admin User
  const passwordHash = await bcrypt.hash(SEED_DATA.user.password, 10)
  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: SEED_DATA.user.email,
      passwordHash,
      firstName: SEED_DATA.user.firstName,
      lastName: SEED_DATA.user.lastName,
      role: SEED_DATA.user.role,
    })
    .returning()

  logger.info(`Created user: ${user.email} (${user.role})`, { module: 'Seed' })
  logger.info('Seed completed successfully!', { module: 'Seed' })
  logger.info(`Login: ${SEED_DATA.user.email}`, { module: 'Seed' })

  await client.end()
}

seed().catch((error) => {
  logger.error('Seed failed', error, { module: 'Seed' })
  process.exit(1)
})
