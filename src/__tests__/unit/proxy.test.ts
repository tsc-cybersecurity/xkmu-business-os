import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @edge-csrf/nextjs to spy on CSRF protection calls
const mockCsrfProtect = vi.fn()
vi.mock('@edge-csrf/nextjs', () => ({
  createCsrfMiddleware: vi.fn(() => mockCsrfProtect),
}))

// Mock jose jwtVerify so we can control session validation
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}))

/**
 * Create a minimal NextRequest-like object sufficient for proxy() to process.
 * proxy() accesses: request.nextUrl.pathname, request.headers, request.method,
 * request.cookies.get(), request.url
 */
function makeNextRequest(options: {
  pathname?: string
  method?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
}): unknown {
  const pathname = options.pathname ?? '/api/v1/leads'
  const url = `https://boss.xkmu.de${pathname}`

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

describe('proxy() — CSRF middleware placement', () => {
  let proxy: (req: unknown) => Promise<Response>
  let jwtVerifyMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    mockCsrfProtect.mockReset()

    // Re-import mocks after reset
    const joseModule = await import('jose')
    jwtVerifyMock = vi.mocked(joseModule.jwtVerify)

    // Import proxy after mocks are set up
    const proxyModule = await import('@/proxy')
    proxy = proxyModule.proxy as unknown as (req: unknown) => Promise<Response>
  })

  it('API-key request (X-Api-Key header present): csrfProtect() is never called', async () => {
    // Given: a POST request with X-Api-Key header (no CSRF token, no session)
    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key-123' },
    })

    // When: proxy handles the request
    const response = await proxy(req)

    // Then: csrfProtect should NOT be called (API key exits early before CSRF)
    expect(mockCsrfProtect).not.toHaveBeenCalled()
    // And: the request should pass through (not 403)
    expect(response.status).not.toBe(403)
  })

  it('GET request with session cookie: csrfProtect() is called but does not block', async () => {
    // Setup: valid session token
    process.env.JWT_SECRET = 'test-secret-for-testing-only-minimum-32chars'
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    })

    // csrfProtect returns undefined for GET requests (no blocking)
    mockCsrfProtect.mockResolvedValueOnce(undefined)

    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'GET',
      cookies: { xkmu_session: 'valid-token' },
    })

    await proxy(req)

    // CSRF middleware should be called (GET is in the CSRF check path)
    expect(mockCsrfProtect).toHaveBeenCalled()
  })

  it('POST request without CSRF token but with session: csrfProtect() returns 403', async () => {
    // Setup: valid session token
    process.env.JWT_SECRET = 'test-secret-for-testing-only-minimum-32chars'
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    })

    // csrfProtect returns a 403 response for missing CSRF token
    const csrf403 = new Response(null, { status: 403 })
    mockCsrfProtect.mockResolvedValueOnce(csrf403)

    const req = makeNextRequest({
      pathname: '/api/v1/leads',
      method: 'POST',
      cookies: { xkmu_session: 'valid-token' },
    })

    const response = await proxy(req)

    expect(mockCsrfProtect).toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})
