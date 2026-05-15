// E.164-Normalisierung mit Default-Land Deutschland.
//
// Akzeptiert UI-typische Schreibweisen:
//   "0172 3773515"     → "+491723773515"
//   "0049 172 3773515" → "+491723773515"
//   "+49 (0) 172/377-3515" → "+491723773515"
//   "+491723773515"    → "+491723773515"
//
// Whitespace, Bindestriche, Klammern, Slashes werden vorab entfernt.
// "(0)" hinter Laendervorwahl wird absorbiert (typische deutsche
// Schreibweise +49 (0) 172 …).
//
// Rueckgabe: E.164-String wenn das Ergebnis matcht (/^\+[1-9]\d{7,14}$/),
// sonst null — Aufrufer soll dann eine Validation-Error werfen.

const E164_REGEX = /^\+[1-9]\d{7,14}$/

export function normalizeToE164(input: string, defaultCountryCode = '49'): string | null {
  if (!input) return null

  // Alles entfernen, was kein Plus oder keine Ziffer ist.
  let cleaned = input.replace(/[\s\-./()]/g, '')

  // "+49(0)172..." → "+49172..."
  cleaned = cleaned.replace(/^\+(\d{1,3})0(?=\d)/, '+$1')

  if (cleaned.startsWith('+')) {
    // Bereits internationale Notation — direkt validieren.
    return E164_REGEX.test(cleaned) ? cleaned : null
  }

  // "00" als Auslandspraefix → "+"
  if (cleaned.startsWith('00')) {
    const candidate = '+' + cleaned.slice(2)
    return E164_REGEX.test(candidate) ? candidate : null
  }

  // Fuehrende 0 → nationale Notation, Laendervorwahl einsetzen.
  if (cleaned.startsWith('0')) {
    const candidate = '+' + defaultCountryCode + cleaned.slice(1)
    return E164_REGEX.test(candidate) ? candidate : null
  }

  // Ohne Praefix und ohne 0 — wir nehmen an, dass das Default-Land gemeint
  // ist (z.B. "1721234567" fuer DE Mobil ohne fuehrende 0).
  const candidate = '+' + defaultCountryCode + cleaned
  return E164_REGEX.test(candidate) ? candidate : null
}
