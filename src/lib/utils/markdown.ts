/**
 * Markdown to HTML converter without external dependencies.
 * Handles both single and double newline separated content.
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''

  const lines = md.split('\n')
  const htmlParts: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line — skip
    if (!trimmed) {
      i++
      continue
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3)
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing ```
      htmlParts.push(`<pre><code class="language-${lang}">${codeLines.join('\n')}</code></pre>`)
      continue
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = processInline(headingMatch[2])
      htmlParts.push(`<h${level}>${text}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      htmlParts.push('<hr />')
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(`<li>${processInline(lines[i].trim().replace(/^[-*]\s/, ''))}</li>`)
        i++
      }
      htmlParts.push(`<ul>${items.join('\n')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li>${processInline(lines[i].trim().replace(/^\d+\.\s/, ''))}</li>`)
        i++
      }
      htmlParts.push(`<ol>${items.join('\n')}</ol>`)
      continue
    }

    // Image
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const safeSrc = /^https?:\/\//.test(imgMatch[2]) ? imgMatch[2] : ''
      if (safeSrc) {
        htmlParts.push(`<img src="${safeSrc}" alt="${escapeHtml(imgMatch[1])}" class="rounded-lg" loading="lazy" />`)
      }
      i++
      continue
    }

    // Paragraph — collect consecutive non-block lines
    const paraLines: string[] = []
    while (i < lines.length) {
      const pl = lines[i].trim()
      if (!pl || /^#{1,4}\s/.test(pl) || /^[-*]\s/.test(pl) || /^\d+\.\s/.test(pl) || /^---+$/.test(pl) || /^```/.test(pl) || /^!\[/.test(pl)) break
      paraLines.push(processInline(pl))
      i++
    }
    if (paraLines.length > 0) {
      htmlParts.push(`<p>${paraLines.join('<br />')}</p>`)
    }
  }

  return htmlParts.join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function processInline(text: string): string {
  let html = escapeHtml(text)

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Images inline
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const safeSrc = /^https?:\/\//.test(src) ? src : ''
    return safeSrc ? `<img src="${safeSrc}" alt="${alt}" class="rounded-lg inline" loading="lazy" />` : ''
  })

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => {
    const safeHref = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : ''
    return safeHref ? `<a href="${safeHref}" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${t}</a>` : t
  })

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  return html
}
