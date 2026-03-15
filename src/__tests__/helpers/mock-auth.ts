import { vi } from 'vitest'
import type { AuthContext } from '@/lib/auth/auth-context'
import { authFixture } from './fixtures'

export function mockAuthContext(auth: AuthContext | null) {
  vi.doMock('@/lib/auth/require-permission', () => ({
    withPermission: vi.fn().mockImplementation(
      async (
        _request: unknown,
        _module: string,
        _action: string,
        handler: (auth: AuthContext) => Promise<Response>,
      ) => {
        if (!auth) {
          return Response.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
            { status: 401 },
          )
        }
        return handler(auth)
      },
    ),
  }))
}

export function mockAuthForbidden() {
  vi.doMock('@/lib/auth/require-permission', () => ({
    withPermission: vi.fn().mockImplementation(async () => {
      return Response.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 },
      )
    }),
  }))
}

export function mockAuthAdmin() {
  mockAuthContext(authFixture())
}
