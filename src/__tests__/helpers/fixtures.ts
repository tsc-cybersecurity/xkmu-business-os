import type { AuthContext } from '@/lib/auth/auth-context'

export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
export const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'

export function authFixture(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    role: 'admin',
    roleId: null,
    ...overrides,
  }
}

export function companyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_COMPANY_ID,
    tenantId: TEST_TENANT_ID,
    name: 'Test GmbH',
    legalForm: 'GmbH',
    street: 'Teststraße',
    houseNumber: '42',
    postalCode: '12345',
    city: 'Berlin',
    country: 'DE',
    phone: '+49 30 12345678',
    email: 'info@test-gmbh.de',
    website: 'https://test-gmbh.de',
    industry: 'IT',
    employeeCount: 25,
    annualRevenue: '1000000.00',
    vatId: 'DE123456789',
    status: 'prospect',
    tags: [],
    notes: null,
    customFields: {},
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function createCompanyInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test GmbH',
    city: 'Berlin',
    country: 'DE',
    status: 'prospect',
    ...overrides,
  }
}
