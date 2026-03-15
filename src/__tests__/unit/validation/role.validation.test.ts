import { describe, it, expect } from 'vitest'
import { createRoleSchema, updateRoleSchema } from '@/lib/utils/validation'

const validPermission = {
  module: 'companies',
  canCreate: true,
  canRead: true,
  canUpdate: false,
  canDelete: false,
}

describe('createRoleSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid full input', () => {
    const result = createRoleSchema.safeParse({
      name: 'team_lead',
      displayName: 'Team Lead',
      description: 'Manages a team of users',
      permissions: [validPermission],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createRoleSchema.safeParse({
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing displayName', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing permissions', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createRoleSchema.safeParse({
      name: '',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty displayName', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: '',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects name with uppercase letters', () => {
    const result = createRoleSchema.safeParse({
      name: 'SalesManager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects name with spaces', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales manager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects name with hyphens', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales-manager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects name with special characters', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales@manager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts name with lowercase letters, numbers, and underscores', () => {
    const result = createRoleSchema.safeParse({
      name: 'role_123_abc',
      displayName: 'Role 123',
      permissions: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects name exceeding 50 chars', () => {
    const result = createRoleSchema.safeParse({
      name: 'a'.repeat(51),
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts name of exactly 50 chars (lowercase)', () => {
    const result = createRoleSchema.safeParse({
      name: 'a'.repeat(50),
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects displayName exceeding 100 chars', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'A'.repeat(101),
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects description exceeding 500 chars', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      description: 'A'.repeat(501),
      permissions: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string description', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      description: '',
      permissions: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts description omitted', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      permissions: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple permissions', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      permissions: [
        { module: 'companies', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        { module: 'contacts', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects permission missing module', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      permissions: [{ canCreate: true, canRead: true, canUpdate: false, canDelete: false }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects permission missing canCreate', () => {
    const result = createRoleSchema.safeParse({
      name: 'sales_manager',
      displayName: 'Sales Manager',
      permissions: [{ module: 'companies', canRead: true, canUpdate: false, canDelete: false }],
    })
    expect(result.success).toBe(false)
  })
})

describe('updateRoleSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateRoleSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with displayName only', () => {
    const result = updateRoleSchema.safeParse({ displayName: 'New Display Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with permissions only', () => {
    const result = updateRoleSchema.safeParse({ permissions: [validPermission] })
    expect(result.success).toBe(true)
  })

  it('accepts description as empty string', () => {
    const result = updateRoleSchema.safeParse({ description: '' })
    expect(result.success).toBe(true)
  })

  it('still validates displayName min length', () => {
    const result = updateRoleSchema.safeParse({ displayName: '' })
    expect(result.success).toBe(false)
  })

  it('still validates displayName max length', () => {
    const result = updateRoleSchema.safeParse({ displayName: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates description max length', () => {
    const result = updateRoleSchema.safeParse({ description: 'A'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('still validates permission structure', () => {
    const result = updateRoleSchema.safeParse({
      permissions: [{ module: 'companies' }],
    })
    expect(result.success).toBe(false)
  })
})
