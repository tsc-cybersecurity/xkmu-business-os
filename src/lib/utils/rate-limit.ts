import { NextRequest } from 'next/server'
import { apiError } from './api-response'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Simple in-memory rate limiter.
 * Returns null if allowed, or an error Response if rate limited.
 *
 * @param request - The incoming request (IP extracted from headers)
 * @param key - A unique key prefix for this limiter (e.g. 'auth-login')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export function rateLimit(
  request: NextRequest,
  key: string,
  maxRequests: number,
  windowMs = 60_000
): Response | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  const storeKey = `${key}:${ip}`
  const now = Date.now()
  const entry = store.get(storeKey)

  if (!entry || entry.resetAt < now) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++

  if (entry.count > maxRequests) {
    return apiError(
      'RATE_LIMITED',
      'Zu viele Anfragen. Bitte warten Sie einen Moment.',
      429
    )
  }

  return null
}
