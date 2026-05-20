'use client'

import ReactMarkdown from 'react-markdown'

export function KfwView({ markdown }: { markdown: string | null | undefined }) {
  if (!markdown) {
    return <p className="text-sm text-muted-foreground italic">Kein KfW-Plan verfügbar.</p>
  }
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-p:leading-relaxed">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
