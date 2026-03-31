import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the redis-client module so getRedisClient() returns a controllable mock
const mockIncr = vi.fn()
const mockExpire = vi.fn()
const mockRedis = { incr: mockIncr, expire: mockExpire }

vi.mock('@/lib/utils/redis-client', () => ({
  getRedisClient: vi.fn(() => mockRedis),
}))

// Mock NextRequest
function makeRequest(ip = '1.2.3.4') {
  return {
    headers: { get: (h: string) => h === 'x-forwarded-for' ? ip : null },
  } as unknown as import('next/server').NextRequest
}

// Import rateLimit AFTER vi.mock() declarations
const { rateLimit } = await import('@/lib/utils/rate-limit')
const { getRedisClient } = await import('@/lib/utils/redis-client')

describe('rateLimit (Redis-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: getRedisClient returns the mock redis instance
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any)
    // Default: incr returns 1 (first call), expire resolves
    mockIncr.mockResolvedValue(1)
    mockExpire.mockResolvedValue(1)
  })

  it('Test 1: returns null when count === 1 (request allowed)', async () => {
    mockIncr.mockResolvedValue(1)
    const result = await rateLimit(makeRequest(), 'test-key', 10)
    expect(result).toBeNull()
  })

  it('Test 2: returns 429 Response when count > maxRequests', async () => {
    mockIncr.mockResolvedValue(11)
    const result = await rateLimit(makeRequest(), 'test-key', 10)
    expect(result).not.toBeNull()
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(429)
  })

  it('Test 3: returns null (fail-open) when getRedisClient() returns null', async () => {
    vi.mocked(getRedisClient).mockReturnValue(null)
    const result = await rateLimit(makeRequest(), 'test-key', 10)
    expect(result).toBeNull()
  })

  it('Test 4: returns null (fail-open) when redis.incr() throws', async () => {
    mockIncr.mockRejectedValue(new Error('Redis ECONNREFUSED'))
    const result = await rateLimit(makeRequest(), 'test-key', 10)
    expect(result).toBeNull()
  })

  it('Test 5: calls redis.expire() with windowSeconds + 1 when count === 1', async () => {
    mockIncr.mockResolvedValue(1)
    await rateLimit(makeRequest(), 'test-key', 10, 60_000)
    // windowSeconds = ceil(60000/1000) = 60, TTL = 60 + 1 = 61
    expect(mockExpire).toHaveBeenCalledOnce()
    const expireArgs = mockExpire.mock.calls[0]
    expect(expireArgs[1]).toBe(61) // windowSeconds + 1
  })

  it('Test 6: two calls in different time windows use different Redis keys', async () => {
    mockIncr.mockResolvedValue(1)
    const windowMs = 60_000
    const req = makeRequest()

    // First call
    await rateLimit(req, 'window-key', 10, windowMs)
    const firstKey = mockIncr.mock.calls[0][0] as string

    // Advance time by more than one window
    const originalDateNow = Date.now
    const futureTime = Date.now() + windowMs + 1000
    vi.spyOn(Date, 'now').mockReturnValue(futureTime)

    // Second call in new window
    await rateLimit(req, 'window-key', 10, windowMs)
    const secondKey = mockIncr.mock.calls[1][0] as string

    vi.spyOn(Date, 'now').mockRestore()

    expect(firstKey).not.toBe(secondKey)
  })
})
