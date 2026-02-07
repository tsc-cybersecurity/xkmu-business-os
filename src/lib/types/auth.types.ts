export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'pending'

export interface SessionUser {
  id: string
  tenantId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  roleId: string | null
}

export interface Session {
  user: SessionUser
  expiresAt: Date
}

export interface AuthContext {
  tenantId: string
  userId: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: SessionUser
  error?: string
}

export interface ApiKeyPayload {
  tenantId: string
  keyId: string
  permissions: string[]
}
