import { describe, it, expect } from 'vitest'
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from '@/lib/utils/validation'

describe('createUserSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('member')
    }
  })

  it('accepts valid full input', () => {
    const result = createUserSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('defaults role to member', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('member')
  })

  it('rejects missing email', () => {
    const result = createUserSchema.safeParse({ password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = createUserSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({ email: 'not-an-email', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({ email: 'user@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects password longer than 100 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts password of exactly 8 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('accepts password of exactly 100 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  it('rejects firstName exceeding 100 chars', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      firstName: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects lastName exceeding 100 chars', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      lastName: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid role values', () => {
    const roles = ['owner', 'admin', 'member', 'viewer'] as const
    for (const role of roles) {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'superuser',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional firstName and lastName omitted', () => {
    const result = createUserSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.firstName).toBeUndefined()
      expect(result.data.lastName).toBeUndefined()
    }
  })
})

describe('updateUserSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with email only', () => {
    const result = updateUserSchema.safeParse({ email: 'new@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with role and status', () => {
    const result = updateUserSchema.safeParse({ role: 'admin', status: 'active' })
    expect(result.success).toBe(true)
  })

  it('still validates email format', () => {
    const result = updateUserSchema.safeParse({ email: 'not-valid' })
    expect(result.success).toBe(false)
  })

  it('still validates firstName length', () => {
    const result = updateUserSchema.safeParse({ firstName: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates lastName length', () => {
    const result = updateUserSchema.safeParse({ lastName: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = updateUserSchema.safeParse({ role: 'god' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid status values', () => {
    const statuses = ['active', 'inactive', 'pending'] as const
    for (const status of statuses) {
      const result = updateUserSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = updateUserSchema.safeParse({ status: 'banned' })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'anypassword' })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'bad-email', password: 'anypassword' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password string', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('accepts short password (login does not enforce min length)', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'x' })
    expect(result.success).toBe(true)
  })
})

describe('registerSchema', () => {
  it('accepts valid full input', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing firstName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing lastName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing companyName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty firstName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: '',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty lastName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: '',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty companyName', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'short',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects firstName exceeding 100 chars', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'A'.repeat(101),
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })

  it('rejects companyName exceeding 255 chars', () => {
    const result = registerSchema.safeParse({
      email: 'max@example.de',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'SecurePass99',
      firstName: 'Max',
      lastName: 'Mustermann',
      companyName: 'Muster GmbH',
    })
    expect(result.success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  it('accepts valid input', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: 'NewSecurePass99',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing currentPassword', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'NewSecurePass99' })
    expect(result.success).toBe(false)
  })

  it('rejects missing newPassword', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: 'OldPass123' })
    expect(result.success).toBe(false)
  })

  it('rejects empty currentPassword', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'NewSecurePass99',
    })
    expect(result.success).toBe(false)
  })

  it('rejects newPassword shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects newPassword longer than 100 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts newPassword of exactly 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: '12345678',
    })
    expect(result.success).toBe(true)
  })
})
