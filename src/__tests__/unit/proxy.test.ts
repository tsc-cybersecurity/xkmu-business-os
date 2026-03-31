import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jose jwtVerify so we can control session validation
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}))

/**
 * Create a minimal NextRequest-like object sufficient for proxy() to process.
 */
function makeNextRequest(options: {
  pathname?: string
  method?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
}): unknown {
  const pathname = options.pathname ?? '/api/v1/leads'
  const url = `https://bos.dev.xkmu.de${pathname}`

  const headersMap = new Map<string, string>([
    ['content-type', 'application/json'],
  ])
  for (const [k, v] of Object.entries(options.headers ?? {})) {
    headersMap.set(k.toLowerCase(), v)
  }

  const cookiesMap = new Map<string, string>(
    Object.entries(options.cookies ?? {})
  )

  const headers = {
    get: (name: string) => headersMap.get(name.toLowerCase()) ?? null,
    has: (name: string) => headersMap.has(name.toLowerCase()),
    delete: vi.fn(),
    set: vi.fn(),
    entries: () => headersMap.entries(),
    [Symbol.iterator]: () => headersMap.entries(),
  }

  const cookies = {
    get: (name: string) => {
      const value = cookiesMap.get(name)
      return value !== undefined ? { value } : undefined
    },
  }

  return {
    url,
    method: options.method ?? 'GET',
    nextUrl: { pathname },
    headers,
    cookies,
  }
}

describe('proxy() — CSRF Double-Submit Cookie', () => {
  let proxy: (req: unknown) => Promise<Response>
  let jwtVerifyMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    process.env.JWT_SECRET = 'test-secret-for-testing-only-minimum-32chars'

    const joseModule = await import('jose')
    jwtVerifyMock = vi.mocked(joseModule.jwtVerify)

    const proxyModule = await import('@/proxy')
    proxy = proxyModule.proxy as unknown as (req: unknown) => Promise<Response>
  })

  it('API-key request bypasses CSRF check entirely', async () => {
    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key-123' },
    })

    const response = await proxy(req)
    // API key requests exit early — no 403
    expect(response.status).not.toBe(403)
  })

  it('POST without CSRF token returns 403', async () => {
    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      cookies: { xkmu_session: 'valid-token' },
      // No csrf_token cookie, no X-CSRF-Token header
    })

    const response = await proxy(req)
    expect(response.status).toBe(403)
  })

  it('POST with matching CSRF cookie+header passes through', async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    })

    const csrfToken = 'abc123def456'
    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      cookies: {
        xkmu_session: 'valid-token',
        csrf_token: csrfToken,
      },
    })

    const response = await proxy(req)
    // Should NOT be 403 — CSRF is valid
    expect(response.status).not.toBe(403)
  })

  it('POST with mismatched CSRF cookie+header returns 403', async () => {
    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      headers: { 'x-csrf-token': 'wrong-token' },
      cookies: {
        xkmu_session: 'valid-token',
        csrf_token: 'correct-token',
      },
    })

    const response = await proxy(req)
    expect(response.status).toBe(403)
  })

  it('GET request is not blocked by CSRF', async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    })

    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'GET',
      cookies: { xkmu_session: 'valid-token' },
    })

    const response = await proxy(req)
    expect(response.status).not.toBe(403)
  })
})
