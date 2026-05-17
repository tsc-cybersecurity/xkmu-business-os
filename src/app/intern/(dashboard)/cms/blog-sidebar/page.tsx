'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface SidebarSettings {
  enabled: boolean
  markdown: string
}

export default function BlogSidebarSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [markdown, setMarkdown] = useState('')

  useEffect(() => {
    fetch('/api/v1/blog/sidebar')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          const s = d.data as SidebarSettings
          setEnabled(s.enabled)
          setMarkdown(s.markdown ?? '')
        }
      })
      .catch((e) => logger.error('Failed to load blog sidebar settings', e, { module: 'BlogSidebarPage' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/blog/sidebar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, markdown }),
      })
      const data = await res.json()
      if (data.success) toast.success('Gespeichert')
      else toast.error(data.error?.message || 'Speichern fehlgeschlagen')
    } catch (e) {
      logger.error('Failed to save blog sidebar settings', e, { module: 'BlogSidebarPage' })
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Blog-Sidebar</h1>
        <p className="text-muted-foreground">
          Globale Sidebar fuer die Detailansicht aller Blog-Beitraege.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sichtbarkeit</CardTitle>
          <CardDescription>
            Steuert, ob die Sidebar neben dem Beitragsinhalt angezeigt wird.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Sidebar bei Blog-Beitraegen anzeigen</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inhalt</CardTitle>
          <CardDescription>
            Markdown — gleiche Syntax wie im Beitragsinhalt. Promo-Bloecke koennen
            ueber{' '}
            <code className="px-1 py-0.5 bg-muted rounded">{'{promo:slug}'}</code>{' '}
            eingebunden werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="sidebar-markdown">Sidebar-Markdown</Label>
            <Textarea
              id="sidebar-markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={18}
              className="font-mono text-sm"
              placeholder={'### Über uns\n\nKurzer Text...\n\n{promo:newsletter-signup}'}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Speichern
        </Button>
      </div>
    </div>
  )
}
