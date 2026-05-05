export interface IcsArgs {
  uid: string
  sequence: number
  method: 'REQUEST' | 'CANCEL'
  startUtc: Date
  endUtc: Date
  summary: string
  description: string
  location: string
  organizerEmail: string
  organizerName: string
  attendeeEmail: string
  attendeeName: string
  status?: 'CONFIRMED' | 'CANCELLED'
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function fmtUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/**
 * Fold lines longer than ~100 UTF-16 code units to CRLF + space continuation per RFC 5545 §3.1.
 * Note: the RFC specifies 75 OCTETS; we use 100 code units as a pragmatic
 * approximation that keeps typical structural lines (UID/ATTENDEE/ORGANIZER)
 * unbroken for readability. Real-world calendar clients (Apple Calendar, Outlook,
 * Google) accept long lines without folding. The guard below prevents folds
 * landing inside a UTF-16 surrogate pair (which would produce invalid UTF-8).
 */
const FOLD_LIMIT = 100

function isHighSurrogate(charCode: number): boolean {
  return charCode >= 0xd800 && charCode <= 0xdbff
}

function foldLine(line: string): string {
  if (line.length <= FOLD_LIMIT) return line
  const out: string[] = []
  let pos = 0
  let firstChunk = true
  while (pos < line.length) {
    const remaining = line.length - pos
    const chunkLimit = firstChunk ? FOLD_LIMIT : FOLD_LIMIT - 1 // continuation lines need a leading space
    let take = Math.min(chunkLimit, remaining)
    // Don't split a UTF-16 surrogate pair across a fold boundary
    if (take < remaining && isHighSurrogate(line.charCodeAt(pos + take - 1))) {
      take -= 1
    }
    const slice = line.slice(pos, pos + take)
    out.push(firstChunk ? slice : ' ' + slice)
    pos += take
    firstChunk = false
  }
  return out.join('\r\n')
}

/**
 * Quote a parameter value per RFC 5545 §3.2: wrap in DQUOTES if it contains
 * `,`, `;`, `:` or whitespace; otherwise return as-is. DQUOTE in the value
 * itself is disallowed by spec — strip it (silent loss of a single character
 * is preferable to producing an invalid VCALENDAR).
 */
function quoteParamValue(s: string): string {
  const cleaned = s.replace(/"/g, '')
  if (/[,;:\s]/.test(cleaned)) return `"${cleaned}"`
  return cleaned
}

export function buildIcs(args: IcsArgs): string {
  const status = args.status ?? (args.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED')
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//xKMU//Business OS//DE',
    'CALSCALE:GREGORIAN',
    `METHOD:${args.method}`,
    'BEGIN:VEVENT',
    `UID:${args.uid}@xkmu.de`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(args.startUtc)}`,
    `DTEND:${fmtUtc(args.endUtc)}`,
    `SUMMARY:${escapeText(args.summary)}`,
    `DESCRIPTION:${escapeText(args.description)}`,
    `LOCATION:${escapeText(args.location)}`,
    `STATUS:${status}`,
    `SEQUENCE:${args.sequence}`,
    `ORGANIZER;CN=${quoteParamValue(args.organizerName)}:mailto:${args.organizerEmail}`,
    `ATTENDEE;CN=${quoteParamValue(args.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${args.attendeeEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/**
 * Build the standard DESCRIPTION text used inside both the mail-attachment
 * .ics and the download endpoint. Single source of truth so the two paths
 * stay byte-identical for the same appointment.
 */
export function buildIcsDescription(args: {
  customerPhone: string
  customerEmail: string
  customerMessage: string | null
}): string {
  const parts = [
    `Telefon: ${args.customerPhone}`,
    `E-Mail: ${args.customerEmail}`,
  ]
  if (args.customerMessage) parts.push('', 'Nachricht:', args.customerMessage)
  return parts.join('\n')
}
