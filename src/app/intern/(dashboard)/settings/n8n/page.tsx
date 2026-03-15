'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Workflow } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface N8nConnection {
  id: string
  name: string
  apiUrl: string
  apiKey: string | null
  isActive: boolean
}

export default function N8nSettingsPage() {
  const [connection, setConnection] = useState<N8nConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [name, setName] = useState('n8n Cloud')
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    loadConnection()
  }, [])

  async function loadConnection() {
    try {
      const res = await fetch('/api/v1/n8n/connection')
      const json = await res.json()
      if (json.success && json.data) {
        setConnection(json.data)
        setName(json.data.name)
        setApiUrl(json.data.apiUrl)
        // apiKey is masked, don't overwrite
      }
    } catch (error) {
      logger.error('Failed to load connection', error, { module: 'SettingsN8nPage' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!apiUrl) {
      toast.error('n8n URL ist erforderlich')
      return
    }
    if (!apiKey && !connection) {
      toast.error('API Key ist erforderlich')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = { name, apiUrl }
      if (apiKey) body.apiKey = apiKey

      const res = await fetch('/api/v1/n8n/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setConnection(json.data)
        setApiKey('')
        toast.success('n8n-Verbindung gespeichert')
      } else {
        toast.error(json.error?.message || 'Fehler beim Speichern')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/v1/n8n/connection/test', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setTestResult(json.data)
        if (json.data.success) {
          toast.success('Verbindung erfolgreich')
        } else {
          toast.error(json.data.message)
        }
      } else {
        setTestResult({ success: false, message: json.error?.message || 'Fehler' })
        toast.error(json.error?.message || 'Fehler beim Testen')
      }
    } catch {
      setTestResult({ success: false, message: 'Netzwerkfehler' })
      toast.error('Netzwerkfehler')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">n8n-Verbindung</h1>
        <p className="text-muted-foreground">
          Verbinden Sie Ihre n8n-Instanz für Workflow-Automatisierung
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Verbindungseinstellungen</CardTitle>
              <CardDescription>
                Geben Sie die URL und den API-Key Ihrer n8n-Instanz ein
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Verbindungsname</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. n8n Cloud"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl">n8n URL</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-instance.app.n8n.cloud"
            />
            <p className="text-xs text-muted-foreground">
              Die Basis-URL Ihrer n8n-Instanz (ohne /api/v1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={connection ? '****' : 'n8n API Key eingeben'}
            />
            <p className="text-xs text-muted-foreground">
              Erstellen Sie einen API Key in n8n unter Settings &gt; API
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
            {connection && (
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verbindung testen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
