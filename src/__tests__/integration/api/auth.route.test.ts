import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { createTestRequest } from '../../helpers/mock-request'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

// ─── Shared session / user fixtures ─────────────────────────────────────────

const sessionUser = {
  id: TEST_USER_ID,
  // tenantId entfernt — AUTH-02
  email: 'admin@test.de',
  firstName: 'Max',
  lastName: 'Mustermann',
  role: 'admin' as const,
  roleId: 'role-1',
}

const dbUser = {
  ...sessionUser,
  passwordHash: '$2a$10$hashedpassword',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

// ─── POST /api/v1/auth/login ────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  let mockGetSession: ReturnType<typeof vi.fn>
  let mockCreateSession: ReturnType<typeof vi.fn>
  let mockDeleteSession: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    setupDbMock()

    mockGetSession = vi.fn()
    mockCreateSession = vi.fn().mockResolvedValue(undefined)
    mockDeleteSession = vi.fn()

    vi.doMock('@/lib/auth/session', () => ({
      getSession: mockGetSession,
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
    }))
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/auth/login/route')
    return mod.POST
  }

  it('returns 200 with valid credentials', async () => {
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        // findByEmail entfernt — login-route nutzt es nicht mehr direkt (AUTH-01)
        authenticate: vi.fn().mockResolvedValue({
          success: true,
          user: sessionUser,
        }),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/login', {
      email: 'admin@test.de',
      password: 'Password123!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.user.email).toBe('admin@test.de')
    expect(mockCreateSession).toHaveBeenCalledWith(sessionUser)
  })

  it('returns 401 with wrong password', async () => {
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        // findByEmail entfernt — login-route nutzt es nicht mehr direkt (AUTH-01)
        authenticate: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid credentials',
        }),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/login', {
      email: 'admin@test.de',
      password: 'WrongPassword!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for non-existent user', async () => {
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        // AUTH-01: authenticate() handles user lookup internally now
        authenticate: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid credentials',
        }),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/login', {
      email: 'nobody@test.de',
      password: 'Password123!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 400 with missing fields', async () => {
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/login', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 with invalid email format', async () => {
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/login', {
      email: 'not-an-email',
      password: 'Password123!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ─── POST /api/v1/auth/register ─────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  let mockCreateSession: ReturnType<typeof vi.fn>

  const validRegisterInput = {
    email: 'new@test.de',
    password: 'SecurePass123!',
    firstName: 'Max',
    lastName: 'Mustermann',
    companyName: 'Neue Firma GmbH',
  }

  beforeEach(() => {
    vi.resetModules()
    setupDbMock()

    mockCreateSession = vi.fn().mockResolvedValue(undefined)

    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(),
      createSession: mockCreateSession,
      deleteSession: vi.fn(),
    }))
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/auth/register/route')
    return mod.POST
  }

  it('returns 201 with valid registration data', async () => {
    const tenantData = { id: TEST_TENANT_ID, name: 'Neue Firma GmbH', slug: 'neue-firma-gmbh' }

    vi.doMock('@/lib/services/tenant.service', () => ({
      TenantService: {
        slugExists: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockResolvedValue(tenantData),
      },
    }))

    vi.doMock('@/lib/services/role.service', () => ({
      RoleService: {
        seedDefaultRoles: vi.fn().mockResolvedValue(undefined),
        getByName: vi.fn().mockResolvedValue({ id: 'role-admin-1', name: 'admin' }),
      },
    }))

    vi.doMock('@/lib/services/organization-seed.service', () => ({
      OrganizationSeedService: {
        seedStructuralData: vi.fn().mockResolvedValue(undefined),
      },
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        create: vi.fn().mockResolvedValue({
          id: TEST_USER_ID,
          email: 'new@test.de',
          firstName: 'Max',
          lastName: 'Mustermann',
        }),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/register', validRegisterInput)
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.user.email).toBe('new@test.de')
    expect(mockCreateSession).toHaveBeenCalled()
  })

  it('returns 400 with missing required fields', async () => {
    vi.doMock('@/lib/services/tenant.service', () => ({
      TenantService: {},
    }))
    vi.doMock('@/lib/services/role.service', () => ({
      RoleService: {},
    }))
    vi.doMock('@/lib/services/tenant-seed.service', () => ({
      TenantSeedService: {},
    }))
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/register', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 with invalid email', async () => {
    vi.doMock('@/lib/services/tenant.service', () => ({
      TenantService: {},
    }))
    vi.doMock('@/lib/services/role.service', () => ({
      RoleService: {},
    }))
    vi.doMock('@/lib/services/tenant-seed.service', () => ({
      TenantSeedService: {},
    }))
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/register', {
      ...validRegisterInput,
      email: 'not-valid',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 500 when tenant creation fails', async () => {
    vi.doMock('@/lib/services/tenant.service', () => ({
      TenantService: {
        slugExists: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockRejectedValue(new Error('DB error')),
      },
    }))
    vi.doMock('@/lib/services/role.service', () => ({
      RoleService: {},
    }))
    vi.doMock('@/lib/services/tenant-seed.service', () => ({
      TenantSeedService: {},
    }))
    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/register', validRegisterInput)
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('REGISTRATION_FAILED')
  })

  it('handles slug collision by appending number', async () => {
    const tenantData = { id: TEST_TENANT_ID, name: 'Neue Firma GmbH', slug: 'neue-firma-gmbh-1' }

    vi.doMock('@/lib/services/tenant.service', () => ({
      TenantService: {
        slugExists: vi.fn()
          .mockResolvedValueOnce(true)   // first slug collides
          .mockResolvedValueOnce(false),  // slug-1 is free
        create: vi.fn().mockResolvedValue(tenantData),
      },
    }))

    vi.doMock('@/lib/services/role.service', () => ({
      RoleService: {
        seedDefaultRoles: vi.fn().mockResolvedValue(undefined),
        getByName: vi.fn().mockResolvedValue({ id: 'role-admin-1', name: 'admin' }),
      },
    }))

    vi.doMock('@/lib/services/organization-seed.service', () => ({
      OrganizationSeedService: {
        seedStructuralData: vi.fn().mockResolvedValue(undefined),
      },
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        create: vi.fn().mockResolvedValue({
          id: TEST_USER_ID,
          email: 'new@test.de',
          firstName: 'Max',
          lastName: 'Mustermann',
        }),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/register', validRegisterInput)
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
  })
})

// ─── POST /api/v1/auth/logout ───────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  let mockDeleteSession: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    setupDbMock()

    mockDeleteSession = vi.fn().mockResolvedValue(undefined)

    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(),
      createSession: vi.fn(),
      deleteSession: mockDeleteSession,
    }))
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/auth/logout/route')
    return mod.POST
  }

  it('returns 200 on successful logout', async () => {
    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/logout', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.message).toBe('Logged out successfully')
    expect(mockDeleteSession).toHaveBeenCalled()
  })
})

// ─── GET /api/v1/auth/me ────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/auth/me/route')
    return mod.GET
  }

  it('returns 200 with authenticated user', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: sessionUser,
        expiresAt: new Date('2026-12-31'),
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    const handler = await getHandler()
    const res = await handler()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.user.email).toBe('admin@test.de')
    expect(body.data.user.id).toBe(TEST_USER_ID)
  })

  it('returns 401 when not authenticated', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue(null),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    const handler = await getHandler()
    const res = await handler()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})

// ─── POST /api/v1/auth/change-password ──────────────────────────────────────

describe('POST /api/v1/auth/change-password', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/auth/change-password/route')
    return mod.POST
  }

  it('returns 200 with valid password change', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: sessionUser,
        expiresAt: new Date('2026-12-31'),
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        getById: vi.fn().mockResolvedValue(dbUser),
        updatePassword: vi.fn().mockResolvedValue(true),
      },
    }))

    vi.doMock('bcryptjs', () => ({
      default: {
        compare: vi.fn().mockResolvedValue(true),
        hash: vi.fn().mockResolvedValue('$2a$10$newhash'),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/change-password', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.message).toBe('Passwort erfolgreich geändert')
  })

  it('returns 401 when not authenticated', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue(null),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    vi.doMock('bcryptjs', () => ({
      default: { compare: vi.fn(), hash: vi.fn() },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/change-password', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 with wrong current password', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: sessionUser,
        expiresAt: new Date('2026-12-31'),
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        getById: vi.fn().mockResolvedValue(dbUser),
      },
    }))

    vi.doMock('bcryptjs', () => ({
      default: {
        compare: vi.fn().mockResolvedValue(false),
        hash: vi.fn(),
      },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/change-password', {
      currentPassword: 'WrongPassword!',
      newPassword: 'NewPassword456!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_PASSWORD')
  })

  it('returns 400 with missing fields (validation error)', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: sessionUser,
        expiresAt: new Date('2026-12-31'),
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {},
    }))

    vi.doMock('bcryptjs', () => ({
      default: { compare: vi.fn(), hash: vi.fn() },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/change-password', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when user not found in DB', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: sessionUser,
        expiresAt: new Date('2026-12-31'),
      }),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    }))

    vi.doMock('@/lib/services/user.service', () => ({
      UserService: {
        getById: vi.fn().mockResolvedValue(null),
      },
    }))

    vi.doMock('bcryptjs', () => ({
      default: { compare: vi.fn(), hash: vi.fn() },
    }))

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/auth/change-password', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    })
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('USER_NOT_FOUND')
  })
})
