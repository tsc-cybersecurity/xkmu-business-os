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
 * Fold lines longer than the RFC 5545 §3.1 limit (continuation = CRLF + space).
 *
 * RFC 5545 SHOULD-folds at 75 octets, but per the §3.1 grammar readers MUST
 * accept arbitrary lengths. We use a slightly relaxed 100-octet threshold so
 * that typical structural lines (UID, ATTENDEE, ORGANIZER) stay on a single
 * line — this keeps the wire format easier to inspect and tests easier to
 * write — while still folding genuinely long DESCRIPTION/SUMMARY content.
 */
const FOLD_LIMIT = 100

function foldLine(line: string): string {
  if (line.length <= FOLD_LIMIT) return line
  const out: string[] = []
  let rest = line
  out.push(rest.slice(0, FOLD_LIMIT))
  rest = rest.slice(FOLD_LIMIT)
  const cont = FOLD_LIMIT - 1
  while (rest.length > cont) {
    out.push(' ' + rest.slice(0, cont))
    rest = rest.slice(cont)
  }
  if (rest.length > 0) out.push(' ' + rest)
  return out.join('\r\n')
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
    `ORGANIZER;CN=${escapeText(args.organizerName)}:mailto:${args.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(args.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${args.attendeeEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
