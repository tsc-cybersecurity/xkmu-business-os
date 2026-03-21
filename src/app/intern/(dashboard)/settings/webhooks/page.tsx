'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Webhook,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface WebhookData {
  id: string
  name: string
  url: string
  events: string[]
  secret: string | null
  isActive: boolean | null
  lastTriggeredAt: string | null
  lastStatus: number | null
  failCount: number | null
  createdAt: string
}

const eventLabels: Record<string, string> = {
  'lead.created': 'Lead erstellt',
  'lead.status_changed': 'Lead-Status geaendert',
  'lead.won': 'Lead gewonnen',
  'lead.lost': 'Lead verloren',
  'research.completed': 'Recherche abgeschlossen',
  'idea.converted': 'Idee konvertiert',
  'company.created': 'Firma erstellt',
}

const availableEvents = Object.keys(eventLabels)

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    isActive: true,
  })

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/webhooks')
      const data = await response.json()
      if (data.success) {
        setWebhooks(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch webhooks', error, { module: 'SettingsWebhooksPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const resetForm = () => {
    setFormData({ name: '', url: '', events: [], secret: '', isActive: true })
    setEditingId(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (webhook: WebhookData) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || '',
      isActive: webhook.isActive ?? true,
    })
    setEditingId(webhook.id)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        url: formData.url,
        events: formData.events,
        secret: formData.secret || undefined,
        isActive: formData.isActive,
      }

      const url = editingId ? `/api/v1/webhooks/${editingId}` : '/api/v1/webhooks'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingId ? 'Webhook aktualisiert' : 'Webhook erstellt')
        setShowDialog(false)
        resetForm()
        await fetchWebhooks()
      } else {
        const data = await response.json()
        toast.error(data.error?.message || 'Fehler beim Speichern')
      }
    } catch (error) {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Webhook gelöscht')
        await fetchWebhooks()
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    }
  }

  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      })
      if (response.ok) {
        await fetchWebhooks()
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren')
    }
  }

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (webhook: WebhookData) => {
    if (!webhook.lastTriggeredAt) return null
    if (webhook.lastStatus && webhook.lastStatus >= 200 && webhook.lastStatus < 300) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    if ((webhook.failCount || 0) > 0) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Automatisieren Sie Workflows mit HTTP-Callbacks
          </p>
        </div>
        <Button onClick={openCreateDialog} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Neuer Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Webhooks</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie einen Webhook, um Benachrichtigungen an externe Systeme zu senden.
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Neuer Webhook
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Letzter Trigger</TableHead>
                  <TableHead>Fehler</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {eventLabels[event] || event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className="cursor-pointer"
                      >
                        <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                          {webhook.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(webhook)}
                        {formatDate(webhook.lastTriggeredAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(webhook.failCount || 0) > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {webhook.failCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Bearbeiten"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Löschen"
                          onClick={() => handleDelete(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Webhook bearbeiten' : 'Neuer Webhook'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Slack-Benachrichtigung"
              />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Events *</Label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map((event) => (
                  <Badge
                    key={event}
                    variant={formData.events.includes(event) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleEvent(event)}
                  >
                    {eventLabels[event]}
                  </Badge>
                ))}
              </div>
              {formData.events.length === 0 && (
                <p className="text-sm text-destructive">Mindestens ein Event erforderlich</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Secret (optional)</Label>
              <Input
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="HMAC-Secret fuer Signatur"
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                Wird für die X-Webhook-Signature Signierung verwendet
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
