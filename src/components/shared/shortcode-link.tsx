'use client'

import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'

interface ShortcodeLinkProps {
  shortcode: string | null | undefined
  // Default-Host fuer Anzeige & Clipboard. Wir konkatenieren mit /<code>.
  // Bei fehlendem siteUrl: nur den Code anzeigen, Copy kopiert nur den Code.
  siteUrl?: string
}

// Kompakte Badge mit Shortcode + Copy-Action. Zeigt den vollen Public-Link,
// kopiert ihn beim Klick und animiert das Icon kurz auf "geklickt".
export function ShortcodeLink({ shortcode, siteUrl }: ShortcodeLinkProps) {
  const [copied, setCopied] = useState(false)
  if (!shortcode) return null
  const base = (siteUrl ?? '').replace(/\/+$/, '')
  const fullUrl = base ? `${base}/${shortcode}` : `/${shortcode}`
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={`Kurzlink kopieren: ${fullUrl}`}
    >
      <Link2 className="h-3 w-3" />
      <span>/{shortcode}</span>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}
