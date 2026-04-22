export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'portal_user'
export type UserStatus = 'active' | 'inactive' | 'pending'

export interface SessionUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  roleId: string | null
}

export interface Session {
  user: SessionUser
  expiresAt: Date
  v: 2    // Version — Force-Logout bei fehlendem v oder v !== 2
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
  keyId: string
  permissions: string[]
}
