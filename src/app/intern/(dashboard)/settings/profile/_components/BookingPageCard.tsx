'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { toast } from 'sonner'
import { Copy, ExternalLink } from 'lucide-react'

const SlugRegex = /^[a-z0-9-]{3,60}$/

export function BookingPageCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slug, setSlug] = useState('')
  const [active, setActive] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    void load()
  }, [])

  async function load() {
    try {
      const res = await fetch('/api/v1/booking-page')
      if (!res.ok) throw new Error('Konnte Einstellungen nicht laden')
      const data = await res.json()
      setSlug(data.slug ?? '')
      setActive(!!data.active)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setLoading(false) }
  }

  const slugValid = slug === '' || SlugRegex.test(slug)

  async function save() {
    if (!slugValid) {
      toast.error('Slug ungültig (3–60 Zeichen, a-z, 0-9, Bindestrich)')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/v1/booking-page', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug || null, active }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409) throw new Error('Slug bereits vergeben')
        if (res.status === 400 && err.error === 'slug_required_for_active') throw new Error('Slug ist Pflicht zum Aktivieren')
        throw new Error(err.error ?? 'Speichern fehlgeschlagen')
      }
      toast.success('Buchungsseite gespeichert')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setSaving(false) }
  }

  function copyUrl() {
    if (!slug) return
    navigator.clipboard.writeText(`${origin}/buchen/${slug}`)
    toast.success('URL kopiert')
  }

  if (loading) return <Card className="md:col-span-2"><CardContent className="p-6"><LoadingSpinner /></CardContent></Card>

  const fullUrl = slug ? `${origin}/buchen/${slug}` : ''

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Buchungsseite</CardTitle>
        <CardDescription>
          Lege fest, unter welcher URL Kunden Termine bei dir buchen können.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="slug">Buchungs-URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{origin}/buchen/</span>
            <Input
              id="slug"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase())}
              placeholder="dein-name"
              className={slugValid ? '' : 'border-red-400'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            3–60 Zeichen. Erlaubt: a-z, 0-9, Bindestrich.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
          />
          <Label htmlFor="active">Buchungsseite öffentlich aktiv</Label>
        </div>

        {slug && active && (
          <div className="rounded-md bg-muted/30 border p-3 text-sm flex items-center justify-between gap-2">
            <code className="font-mono">{fullUrl}</code>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={copyUrl} aria-label="URL kopieren">
                <Copy className="h-4 w-4" />
              </Button>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" aria-label="Öffnen">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving || !slugValid}>
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
