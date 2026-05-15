import { describe, it, expect } from 'vitest'
import { splitContentByPromos, extractPromoSlugs } from '@/lib/utils/promo-placeholder'

describe('splitContentByPromos', () => {
  it('returns empty for empty input', () => {
    expect(splitContentByPromos('')).toEqual([])
  })

  it('returns single markdown chunk when no placeholder', () => {
    const out = splitContentByPromos('Hello **world**.')
    expect(out).toEqual([{ kind: 'markdown', text: 'Hello **world**.' }])
  })

  it('splits around a single placeholder', () => {
    const out = splitContentByPromos('Lead in.\n\n{promo:cta}\n\nMore content.')
    expect(out).toEqual([
      { kind: 'markdown', text: 'Lead in.\n\n' },
      { kind: 'promo', slug: 'cta' },
      { kind: 'markdown', text: '\n\nMore content.' },
    ])
  })

  it('handles placeholder at the very start', () => {
    const out = splitContentByPromos('{promo:hero}\n\nText.')
    expect(out[0]).toEqual({ kind: 'promo', slug: 'hero' })
  })

  it('handles placeholder at the very end', () => {
    const out = splitContentByPromos('Text.\n\n{promo:end-cta}')
    expect(out[out.length - 1]).toEqual({ kind: 'promo', slug: 'end-cta' })
  })

  it('handles multiple placeholders', () => {
    const out = splitContentByPromos('A {promo:one} B {promo:two} C')
    expect(out).toEqual([
      { kind: 'markdown', text: 'A ' },
      { kind: 'promo', slug: 'one' },
      { kind: 'markdown', text: ' B ' },
      { kind: 'promo', slug: 'two' },
      { kind: 'markdown', text: ' C' },
    ])
  })

  it('ignores invalid placeholders', () => {
    // Whitespace, uppercase, missing slug — all should be left as plain text.
    const out = splitContentByPromos('{ promo:bad } {promo:} {promo:UPPER} {promo:ok}')
    const promos = out.filter((c) => c.kind === 'promo')
    expect(promos).toEqual([{ kind: 'promo', slug: 'ok' }])
  })

  it('rejects single-character invalid leading dash', () => {
    const out = splitContentByPromos('{promo:-bad}')
    expect(out.find((c) => c.kind === 'promo')).toBeUndefined()
  })
})

describe('extractPromoSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = extractPromoSlugs('A {promo:x} B {promo:y} C {promo:x} D')
    expect(slugs.sort()).toEqual(['x', 'y'])
  })

  it('returns empty for content without placeholders', () => {
    expect(extractPromoSlugs('Just text.')).toEqual([])
  })
})
