// ============================================
// AI Prompt Template - Placeholder Renderer
// ============================================
// Extracted from ai-prompt-template.service.ts
// Contains the template placeholder replacement logic

/**
 * Ersetzt {{variable}} und {{#if variable}}...{{/if}} Blöcke in Templates
 */
export function applyPlaceholders(template: string, data: Record<string, string | undefined>): string {
  let result = template

  // 1. Konditionale Blöcke: {{#if key}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, content: string) => {
      const value = data[key]
      if (value && value.trim() !== '') {
        // Rekursiv die Platzhalter im Block ersetzen
        return applyPlaceholders(content, data)
      }
      return ''
    }
  )

  // 2. Einfache Platzhalter: {{key}}
  result = result.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => {
      return data[key] || ''
    }
  )

  // 3. Mehrfache Leerzeilen entfernen (durch konditionale Blöcke entstanden)
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}
