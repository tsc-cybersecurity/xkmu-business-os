import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { tenants, roles, rolePermissions } from '../schema'
import { eq, and } from 'drizzle-orm'
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '../../types/permissions'

async function seedAuditorRole() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

  console.log('Creating IT-Auditor A role...')

  // Get all tenants
  const allTenants = await db.select().from(tenants)

  const auditorConfig = DEFAULT_ROLE_PERMISSIONS['auditor']
  if (!auditorConfig) {
    throw new Error('Auditor role config not found')
  }

  for (const tenant of allTenants) {
    // Check if role already exists
    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenant.id), eq(roles.name, 'auditor')))
      .limit(1)

    if (existing) {
      console.log(`Tenant "${tenant.name}": auditor role already exists, skipping.`)
      continue
    }

    // Create role
    const [role] = await db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        name: 'auditor',
        displayName: auditorConfig.displayName,
        description: auditorConfig.description,
        isSystem: true,
      })
      .returning()

    // Create permissions
    const permissionRows = MODULES.map((module) => ({
      roleId: role.id,
      module,
      canCreate: auditorConfig.permissions[module]?.create ?? false,
      canRead: auditorConfig.permissions[module]?.read ?? false,
      canUpdate: auditorConfig.permissions[module]?.update ?? false,
      canDelete: auditorConfig.permissions[module]?.delete ?? false,
    }))

    await db.insert(rolePermissions).values(permissionRows)

    console.log(`Tenant "${tenant.name}": auditor role created with ${permissionRows.length} permissions.`)
  }

  console.log('Done!')
  await client.end()
}

seedAuditorRole().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
