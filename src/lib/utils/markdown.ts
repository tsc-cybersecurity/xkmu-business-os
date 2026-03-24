/**
 * Markdown to HTML converter without external dependencies.
 * Supports: bold, italic, headings, links, images, ordered/unordered lists,
 * code blocks, inline code, horizontal rules, paragraphs, line breaks.
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''

  let html = md
    // Escape HTML to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Images (only allow http/https URLs)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const safeSrc = /^https?:\/\//.test(src) ? src : ''
    return safeSrc ? `<img src="${safeSrc}" alt="${alt}" class="rounded-lg" loading="lazy" />` : ''
  })

  // Links (block dangerous protocols)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const safeHref = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : ''
    return safeHref ? `<a href="${safeHref}" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>` : text
  })

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Process lists block by block
  const blocks = html.split('\n\n')
  html = blocks
    .map((block) => {
      block = block.trim()
      if (!block) return ''

      // Skip already-processed block elements
      if (
        block.startsWith('<h') ||
        block.startsWith('<pre') ||
        block.startsWith('<hr') ||
        block.startsWith('<img')
      ) {
        return block
      }

      // Unordered list block
      if (/^[-*] /m.test(block)) {
        const items = block
          .split('\n')
          .filter((line) => /^[-*] /.test(line))
          .map((line) => `<li>${line.replace(/^[-*] /, '')}</li>`)
        if (items.length > 0) {
          return `<ul class="list-disc list-inside ml-4 space-y-1">${items.join('\n')}</ul>`
        }
      }

      // Ordered list block
      if (/^\d+\. /m.test(block)) {
        const items = block
          .split('\n')
          .filter((line) => /^\d+\. /.test(line))
          .map((line) => `<li>${line.replace(/^\d+\. /, '')}</li>`)
        if (items.length > 0) {
          return `<ol class="list-decimal list-inside ml-4 space-y-1">${items.join('\n')}</ol>`
        }
      }

      // Paragraph
      return `<p>${block.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  return html
}
