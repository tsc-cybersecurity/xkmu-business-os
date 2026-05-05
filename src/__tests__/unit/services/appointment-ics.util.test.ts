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
    expect(ics).toContain('ORGANIZER;CN=Tino Stenzel:mailto:staff@xkmu-digitalsolutions.de')
    expect(ics).toContain(
      'ATTENDEE;CN=Anna Schmidt;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:kunde@example.com',
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
})
