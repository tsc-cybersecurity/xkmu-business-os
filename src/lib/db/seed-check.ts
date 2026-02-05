import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { tenants, users } from './schema'
import { eq } from 'drizzle-orm'

const SEED_DATA = {
  tenant: {
    name: 'Default Organisation',
    slug: 'default',
    status: 'active',
  },
  user: {
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'owner',
  },
}

async function seedCheck() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

  // Check if default tenant already exists
  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'default'))
    .limit(1)

  if (existingTenant.length > 0) {
    console.log('Seed already exists, skipping...')
    await client.end()
    return
  }

  console.log('Seeding database...')

  // 1. Create Tenant
  const [tenant] = await db
    .insert(tenants)
    .values(SEED_DATA.tenant)
    .returning()

  console.log(`Created tenant: ${tenant.name} (${tenant.slug})`)

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

  console.log(`Created user: ${user.email} (${user.role})`)
  console.log('')
  console.log('='.repeat(50))
  console.log('Seed completed!')
  console.log('='.repeat(50))
  console.log('')
  console.log('Login credentials:')
  console.log(`  Email:    ${SEED_DATA.user.email}`)
  console.log(`  Password: ${SEED_DATA.user.password}`)
  console.log('')

  await client.end()
}

seedCheck().catch((error) => {
  console.error('Seed check failed:', error)
  process.exit(1)
})
