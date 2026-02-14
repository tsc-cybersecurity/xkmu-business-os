/**
 * Simple Markdown to HTML converter without external dependencies.
 * Supports: bold, italic, headings, links, images, lists, code, paragraphs, line breaks.
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

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg" />')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Unordered lists
  html = html.replace(/^(\s*)[-*] (.+)$/gm, '$1<li>$2</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc list-inside ml-4">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Line breaks within paragraphs
  html = html.replace(/<br\s*\/?>/g, '<br />')

  // Paragraphs (text between blank lines that isn't already a block element)
  const lines = html.split('\n\n')
  html = lines
    .map((block) => {
      block = block.trim()
      if (!block) return ''
      if (
        block.startsWith('<h') ||
        block.startsWith('<ul') ||
        block.startsWith('<ol') ||
        block.startsWith('<pre') ||
        block.startsWith('<hr') ||
        block.startsWith('<img') ||
        block.startsWith('<li')
      ) {
        return block
      }
      return `<p>${block.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  return html
}
