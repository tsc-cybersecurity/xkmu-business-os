import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeEmailHtml } from '@/lib/utils/sanitize'

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('')
  })

  it('strips event handlers from img tags but keeps safe attributes', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('onerror')
    expect(result).toContain('src')
  })

  it('preserves safe markdown HTML unchanged', () => {
    const input = '<p><strong>bold</strong></p>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('strips javascript: href', () => {
    const result = sanitizeHtml('<a href="javascript:void(0)">x</a>')
    expect(result).not.toContain('javascript:')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('sanitizeEmailHtml', () => {
  it('preserves table tags in email HTML', () => {
    const result = sanitizeEmailHtml('<table><tr><td>cell</td></tr></table>')
    // DOMPurify normalizes HTML (adds tbody) — verify table structure is preserved
    expect(result).toContain('<table>')
    expect(result).toContain('<td>cell</td>')
    expect(result).toContain('</table>')
  })
})
