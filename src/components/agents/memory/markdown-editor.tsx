'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  scope: string
  initialBody: string
  initialTitle: string
}

export function MarkdownEditor({ scope, initialBody, initialTitle }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/agents/memory?scope=${encodeURIComponent(scope)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, title }),
      })
      if (!r.ok) throw new Error(await r.text())
      toast.success('Memory gespeichert')
      router.push(`/intern/agents/memory/${encodeURIComponent(scope)}`)
    } catch (e) {
      toast.error(`Fehler: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Memory bearbeiten: <code>{scope}</code></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Markdown</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={20} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Vorschau</Label>
              <div className="prose prose-sm border rounded p-3 max-h-[500px] overflow-y-auto dark:prose-invert">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Speichere...' : 'Speichern'}</Button>
            <Button variant="outline" onClick={() => router.push(`/intern/agents/memory/${encodeURIComponent(scope)}`)}>
              Abbrechen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
