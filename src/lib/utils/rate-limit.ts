import { NextRequest } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { getRedisClient } from '@/lib/utils/redis-client'
import { logger } from '@/lib/utils/logger'

/**
 * Redis-backed rate limiter using fixed window INCR/EXPIRE.
 * Returns null if allowed, or a 429 Response if rate limited.
 * Fails open (returns null) when Redis is unavailable.
 *
 * @param request - Incoming request (IP extracted from x-forwarded-for or x-real-ip)
 * @param key     - Unique prefix for this limiter (e.g. 'auth-login')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs    - Time window in milliseconds (default: 60s)
 */
export async function rateLimit(
  request: NextRequest,
  key: string,
  maxRequests: number,
  windowMs = 60_000
): Promise<Response | null> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const windowSeconds = Math.ceil(windowMs / 1000)
  const windowBucket = Math.floor(Date.now() / windowMs)
  const storeKey = `rate:${key}:${ip}:${windowBucket}`

  const redis = getRedisClient()

  if (!redis) {
    logger.warn('Redis nicht verfuegbar — Rate Limiting deaktiviert (fail-open)', {
      module: 'RateLimit',
      key,
    })
    return null
  }

  try {
    const count = await redis.incr(storeKey)
    if (count === 1) {
      // First hit in this window — set TTL with 1-second buffer
      await redis.expire(storeKey, windowSeconds + 1)
    }
    if (count > maxRequests) {
      return apiError('RATE_LIMITED', 'Zu viele Anfragen. Bitte warten Sie einen Moment.', 429)
    }
    return null
  } catch (err) {
    logger.warn('Redis rate limit Fehler — fail-open', { module: 'RateLimit', key })
    return null
  }
}
