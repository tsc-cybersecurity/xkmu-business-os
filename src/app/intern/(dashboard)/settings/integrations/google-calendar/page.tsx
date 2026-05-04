'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, FileJson } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { toast } from 'sonner'

interface ConfigPayload {
  clientId: string | null
  clientSecretMasked: string | null
  redirectUri: string | null
  appPublicUrl: string | null
  isConfigured: boolean
}

export default function GoogleCalendarConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    appPublicUrl: '',
  })
  const [secretIsMasked, setSecretIsMasked] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  useEffect(() => { void load() }, [])

  async function load() {
    try {
      const res = await fetch('/api/v1/integrations/google-calendar')
      if (!res.ok) throw new Error('Konnte Konfiguration nicht laden')
      const data: ConfigPayload = await res.json()
      setForm({
        clientId: data.clientId ?? '',
        clientSecret: data.clientSecretMasked ?? '',
        redirectUri: data.redirectUri ?? '',
        appPublicUrl: data.appPublicUrl ?? '',
      })
      setSecretIsMasked(!!data.clientSecretMasked)
      setIsConfigured(data.isConfigured)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Laden')
    } finally { setLoading(false) }
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonInput)
      const node = parsed.web ?? parsed.installed ?? parsed
      const clientId = node.client_id ?? ''
      const clientSecret = node.client_secret ?? ''
      const redirectUri = Array.isArray(node.redirect_uris) ? node.redirect_uris[0] : ''
      const appPublicUrl = redirectUri ? new URL(redirectUri).origin : ''
      if (!clientId || !clientSecret) throw new Error('client_id / client_secret nicht gefunden')
      setForm({ clientId, clientSecret, redirectUri, appPublicUrl })
      setSecretIsMasked(false)
      setJsonInput('')
      toast.success('Werte aus JSON übernommen — bitte speichern')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'JSON ungültig')
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/integrations/google-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId || null,
          clientSecret: form.clientSecret || null,
          redirectUri: form.redirectUri || null,
          appPublicUrl: form.appPublicUrl || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Speichern fehlgeschlagen')
      }
      const data: ConfigPayload = await res.json()
      setForm(f => ({ ...f, clientSecret: data.clientSecretMasked ?? f.clientSecret }))
      setSecretIsMasked(!!data.clientSecretMasked)
      setIsConfigured(data.isConfigured)
      toast.success('Konfiguration gespeichert')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="Zurück">
          <Link href="/intern/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Google Calendar Integration</h1>
          <p className="text-sm text-muted-foreground">
            OAuth-Credentials für die Terminbuchung. {isConfigured ? 'Aktiv konfiguriert.' : 'Noch nicht eingerichtet.'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            client_secret JSON importieren
          </CardTitle>
          <CardDescription>
            Inhalt der von Google heruntergeladenen <code>client_secret_…json</code> einfügen — Felder werden automatisch befüllt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='{"web":{"client_id":"…","client_secret":"…","redirect_uris":["…"]}}'
            rows={5}
          />
          <Button variant="outline" onClick={importJson} disabled={!jsonInput.trim()}>
            Werte übernehmen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth-Credentials</CardTitle>
          <CardDescription>
            Aus Google Cloud Console → APIs &amp; Services → Credentials. Der Redirect-URI muss exakt mit dem dort hinterlegten übereinstimmen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input id="clientId" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type={secretIsMasked ? 'text' : 'password'}
              value={form.clientSecret}
              onChange={e => { setForm({ ...form, clientSecret: e.target.value }); setSecretIsMasked(false) }}
              placeholder={secretIsMasked ? '' : 'GOCSPX-…'}
            />
            {secretIsMasked && (
              <p className="text-xs text-muted-foreground">
                Aktuelles Secret ist gespeichert (maskiert). Beim Speichern unverändert übernommen, solange du das Feld nicht überschreibst.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <Input
              id="redirectUri"
              value={form.redirectUri}
              onChange={e => setForm({ ...form, redirectUri: e.target.value })}
              placeholder="https://app.example.com/api/google-calendar/oauth/callback"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appPublicUrl">App Public URL</Label>
            <Input
              id="appPublicUrl"
              value={form.appPublicUrl}
              onChange={e => setForm({ ...form, appPublicUrl: e.target.value })}
              placeholder="https://app.example.com"
            />
          </div>
          <Button onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Wird gespeichert…' : 'Konfiguration speichern'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
