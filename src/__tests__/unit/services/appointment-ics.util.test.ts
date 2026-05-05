import { describe, it, expect } from 'vitest'
import { buildIcs } from '@/lib/services/appointment-ics.util'

const baseArgs = {
  uid: 'a0000000-0000-4000-8000-000000000001',
  sequence: 0,
  startUtc: new Date('2026-05-08T13:00:00Z'),
  endUtc: new Date('2026-05-08T13:30:00Z'),
  summary: 'Erstgespräch',
  description: 'Telefon: +49\nE-Mail: kunde@example.com',
  location: 'Telefon',
  organizerEmail: 'staff@xkmu-digitalsolutions.de',
  organizerName: 'Tino Stenzel',
  attendeeEmail: 'kunde@example.com',
  attendeeName: 'Anna Schmidt',
}

describe('buildIcs', () => {
  it('REQUEST produces VCALENDAR with method REQUEST + status CONFIRMED', () => {
    const ics = buildIcs({ ...baseArgs, method: 'REQUEST' })
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics).toContain('METHOD:REQUEST')
    expect(ics).toContain('STATUS:CONFIRMED')
    expect(ics).toContain('UID:a0000000-0000-4000-8000-000000000001@xkmu.de')
    expect(ics).toContain('DTSTART:20260508T130000Z')
    expect(ics).toContain('DTEND:20260508T133000Z')
    expect(ics).toContain('SEQUENCE:0')
    expect(ics).toContain('SUMMARY:Erstgespräch')
    expect(ics).toContain('ORGANIZER;CN="Tino Stenzel":mailto:staff@xkmu-digitalsolutions.de')
    expect(ics).toContain(
      'ATTENDEE;CN="Anna Schmidt";ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:kunde@example.com',
    )
    expect(ics).toMatch(/END:VCALENDAR\r\n$/)
  })

  it('escapes \\, ;, , and \\n in TEXT properties', () => {
    const ics = buildIcs({ ...baseArgs, method: 'REQUEST', description: 'a;b,c\\d\ne' })
    expect(ics).toContain('DESCRIPTION:a\\;b\\,c\\\\d\\ne')
  })

  it('CANCEL produces METHOD:CANCEL + STATUS:CANCELLED with same UID', () => {
    const ics = buildIcs({ ...baseArgs, method: 'CANCEL', sequence: 2 })
    expect(ics).toContain('METHOD:CANCEL')
    expect(ics).toContain('STATUS:CANCELLED')
    expect(ics).toContain('SEQUENCE:2')
    expect(ics).toContain('UID:a0000000-0000-4000-8000-000000000001@xkmu.de')
  })

  it('uses CRLF line endings exclusively', () => {
    const ics = buildIcs({ ...baseArgs, method: 'REQUEST' })
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/)
  })

  it('folds long lines with CRLF + space continuation; unfolding recovers content', () => {
    const longDesc = 'Line: ' + 'x'.repeat(300)
    const ics = buildIcs({ ...baseArgs, method: 'REQUEST', description: longDesc })
    // Find DESCRIPTION value: it should appear with at least one fold continuation
    const descPropMatch = ics.match(/DESCRIPTION:[\s\S]*?(?=\r\n[A-Z]+[:;])/)
    expect(descPropMatch).not.toBeNull()
    const folded = descPropMatch![0]
    // At least one fold continuation must be present
    expect(folded).toMatch(/\r\n /)
    // Unfolding (RFC 5545: remove every "\r\n " sequence) should recover the line
    const unfolded = folded.replace(/\r\n /g, '')
    expect(unfolded).toBe(`DESCRIPTION:${longDesc}`)
  })

  it('does not split a UTF-16 surrogate pair across a fold boundary', () => {
    // Place a 🙂 (surrogate pair, length 2) so that without the guard it would
    // straddle the fold. Pad with 99 single-code-unit chars before the emoji
    // so the emoji starts exactly at index 99, putting its low surrogate
    // exactly at the FOLD_LIMIT boundary (100).
    const summary = 'x'.repeat(99) + '🙂'
    const ics = buildIcs({ ...baseArgs, method: 'REQUEST', summary })
    // Pull out the SUMMARY property block (may span fold continuations)
    const sumMatch = ics.match(/SUMMARY:[\s\S]*?(?=\r\n[A-Z]+[:;])/)
    expect(sumMatch).not.toBeNull()
    const unfolded = sumMatch![0].replace(/\r\n /g, '')
    expect(unfolded).toBe(`SUMMARY:${summary}`)
  })

  it('quotes CN= parameter values containing commas; strips embedded DQUOTEs', () => {
    const ics = buildIcs({
      ...baseArgs,
      method: 'REQUEST',
      organizerName: 'Müller, Andreas',
      attendeeName: 'Smith "Bob" Jr',
    })
    expect(ics).toContain('ORGANIZER;CN="Müller, Andreas":mailto:staff@xkmu-digitalsolutions.de')
    expect(ics).toContain(
      'ATTENDEE;CN="Smith Bob Jr";ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:kunde@example.com',
    )
  })
})
