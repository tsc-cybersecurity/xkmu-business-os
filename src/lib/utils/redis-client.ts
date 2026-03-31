import Redis from 'ioredis'
import { logger } from '@/lib/utils/logger'

let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    })
    redisClient.on('error', () => {
      logger.warn('Redis connection error — rate limiting fails open', { module: 'Redis' })
    })
  }
  return redisClient
}
