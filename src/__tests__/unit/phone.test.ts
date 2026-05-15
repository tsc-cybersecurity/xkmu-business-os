import { describe, it, expect } from 'vitest'
import { normalizeToE164 } from '@/lib/utils/phone'

describe('normalizeToE164', () => {
  it('keeps already-valid E.164 untouched', () => {
    expect(normalizeToE164('+491723773515')).toBe('+491723773515')
  })

  it('converts national 0-prefix DE mobile', () => {
    expect(normalizeToE164('01723773515')).toBe('+491723773515')
  })

  it('strips spaces, hyphens, slashes, parens', () => {
    expect(normalizeToE164('0172 377-3515')).toBe('+491723773515')
    expect(normalizeToE164('(0172) 377/3515')).toBe('+491723773515')
  })

  it('handles 00 as international prefix', () => {
    expect(normalizeToE164('00491723773515')).toBe('+491723773515')
  })

  it('absorbs (0) after country code', () => {
    expect(normalizeToE164('+49 (0) 172 3773515')).toBe('+491723773515')
  })

  it('assumes default country when no prefix and no leading 0', () => {
    expect(normalizeToE164('1723773515')).toBe('+491723773515')
  })

  it('respects custom default country code', () => {
    expect(normalizeToE164('06441234567', '43')).toBe('+436441234567')
  })

  it('returns null for empty input', () => {
    expect(normalizeToE164('')).toBeNull()
  })

  it('returns null for too-short numbers', () => {
    expect(normalizeToE164('017')).toBeNull()
  })

  it('returns null for non-numeric junk', () => {
    expect(normalizeToE164('+4917abc')).toBeNull()
  })
})
