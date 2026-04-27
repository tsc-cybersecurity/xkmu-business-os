'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export interface CourseCodeBlockContent {
  language?: string
  code?: string
  filename?: string
  showLineNumbers?: boolean
}

interface Props {
  content: CourseCodeBlockContent
}

export function CourseCodeBlock({ content }: Props) {
  const [copied, setCopied] = useState(false)
  const code = content.code ?? ''
  const language = content.language ?? 'text'

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Card className="overflow-hidden">
      {(content.filename || true) && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs">
          <span className="font-mono text-muted-foreground">
            {content.filename ?? language}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="ml-1">{copied ? 'Kopiert' : 'Kopieren'}</span>
          </Button>
        </div>
      )}
      <CardContent className="p-0 text-sm">
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          showLineNumbers={!!content.showLineNumbers}
          customStyle={{ margin: 0, padding: '12px 16px', background: 'transparent' }}
        >
          {code}
        </SyntaxHighlighter>
      </CardContent>
    </Card>
  )
}
