// Platzhalter-Syntax: {promo:slug-name}
//
// Strenges Regex — vermeidet Kollisionen mit normalem Markdown
// (geschweifte Klammern in JSX-Beispielen, Code-Snippets …) durch
// Pflicht-Praefix `promo:` und enges Slug-Alphabet.

const PROMO_PLACEHOLDER_PATTERN = '\\{promo:([a-z0-9][a-z0-9-]{0,118}[a-z0-9]|[a-z0-9])\\}'

export type ContentChunk =
  | { kind: 'markdown'; text: string }
  | { kind: 'promo'; slug: string }

// Splittet Markdown-Text in Chunks: alternierend Markdown- und
// Promo-Eintraege. Reihenfolge bleibt erhalten — der Renderer kann
// sie in einem Pass abarbeiten.
export function splitContentByPromos(content: string): ContentChunk[] {
  if (!content) return []
  const out: ContentChunk[] = []
  let lastIndex = 0
  const matches = content.matchAll(new RegExp(PROMO_PLACEHOLDER_PATTERN, 'g'))
  for (const match of matches) {
    const idx = match.index ?? 0
    if (idx > lastIndex) {
      out.push({ kind: 'markdown', text: content.slice(lastIndex, idx) })
    }
    out.push({ kind: 'promo', slug: match[1] })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < content.length) {
    out.push({ kind: 'markdown', text: content.slice(lastIndex) })
  }
  return out
}

// Hilfsfunktion fuer Vorab-Fetch im Server-Component: alle einzigartigen
// Slugs aus dem Content extrahieren.
export function extractPromoSlugs(content: string): string[] {
  if (!content) return []
  const slugs = new Set<string>()
  for (const match of content.matchAll(new RegExp(PROMO_PLACEHOLDER_PATTERN, 'g'))) {
    slugs.add(match[1])
  }
  return Array.from(slugs)
}
