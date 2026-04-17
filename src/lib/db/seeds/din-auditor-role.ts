import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { roles, rolePermissions } from '../schema'
import { eq, and } from 'drizzle-orm'
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '../../types/permissions'
import { logger } from '@/lib/utils/logger'

function getSslConfig(): 'require' | false {
  const sslEnv = process.env.DATABASE_SSL
  if (sslEnv === 'false' || sslEnv === '0') return false
  if (sslEnv === 'require') return 'require'
  if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') return false
  if (process.env.NODE_ENV === 'production') return 'require'
  return false
}

async function seedAuditorRole() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  logger.info('Creating IT-Auditor A role...', { module: 'DinAuditorRoleSeed' })

  const auditorConfig = DEFAULT_ROLE_PERMISSIONS['auditor']
  if (!auditorConfig) {
    throw new Error('Auditor role config not found')
  }

  const [existing] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.name, 'auditor')))
    .limit(1)

  if (existing) {
    logger.info('Auditor role already exists, skipping.', { module: 'DinAuditorRoleSeed' })
    await client.end()
    return
  }

  const [role] = await db
    .insert(roles)
    .values({
      name: 'auditor',
      displayName: auditorConfig.displayName,
      description: auditorConfig.description,
      isSystem: true,
    })
    .returning()

  const permissionRows = MODULES.map((module) => ({
    roleId: role.id,
    module,
    canCreate: auditorConfig.permissions[module]?.create ?? false,
    canRead: auditorConfig.permissions[module]?.read ?? false,
    canUpdate: auditorConfig.permissions[module]?.update ?? false,
    canDelete: auditorConfig.permissions[module]?.delete ?? false,
  }))

  await db.insert(rolePermissions).values(permissionRows)

  logger.info(`Auditor role created with ${permissionRows.length} permissions.`, { module: 'DinAuditorRoleSeed' })
  logger.info('Done!', { module: 'DinAuditorRoleSeed' })
  await client.end()
}

seedAuditorRole().catch((error) => {
  logger.error('Failed', error, { module: 'DinAuditorRoleSeed' })
  process.exit(1)
})
