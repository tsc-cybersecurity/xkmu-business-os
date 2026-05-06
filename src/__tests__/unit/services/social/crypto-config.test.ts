import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/services/calendar-config.service', () => ({
  CalendarConfigService: { getConfig: vi.fn().mockResolvedValue({ tokenEncryptionKeyHex: 'a'.repeat(64) }) }
}))

describe('getSocialTokenKey', () => {
  it('returns the calendar config key', async () => {
    const { getSocialTokenKey } = await import('@/lib/services/social/crypto-config')
    expect(await getSocialTokenKey()).toBe('a'.repeat(64))
  })
})
