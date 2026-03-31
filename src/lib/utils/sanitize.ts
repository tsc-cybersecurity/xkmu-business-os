import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML string for safe use in dangerouslySetInnerHTML.
 * Runs on both server (Node.js/jsdom) and browser (native DOM).
 * Strips all script tags, event handlers, javascript: URIs.
 * ALLOWED_TAGS matches what renderMarkdown() produces — do not reduce further.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'a', 'img', 'hr', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'loading'],
    ADD_ATTR: ['target'],
    FORCE_BODY: false,
  })
}

/**
 * Sanitize HTML for email body preview.
 * More permissive than markdown — allows table elements and style attributes.
 */
export function sanitizeEmailHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'h1', 'h2', 'h3', 'h4', 'a', 'ul', 'ol', 'li', 'hr', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'width', 'height',
                   'bgcolor', 'align', 'target', 'rel', 'loading'],
  })
}
