export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'pending'

export interface SessionUser {
  id: string
  // tenantId entfernt — AUTH-02
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
  tenantId: string   // bleibt — AUTH-04 (API-Keys bleiben kompatibel)
  keyId: string
  permissions: string[]
}
