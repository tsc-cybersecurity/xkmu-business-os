'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Mail,
  Plus,
  Loader2,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Settings,
  Pencil,
  Zap,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface EmailAccount {
  id: string
  name: string
  email: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword?: string
  imapTls: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword?: string
  smtpTls: boolean
  syncEnabled: boolean
  syncIntervalMinutes: number
  syncFolders: string
  lastSyncAt: string | null
  syncStatus: string | null
  createdAt: string
}

interface FormData {
  name: string
  email: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword: string
  imapTls: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpTls: boolean
  syncEnabled: boolean
  syncIntervalMinutes: number
  syncFolders: string
}

const defaultForm: FormData = {
  name: '',
  email: '',
  imapHost: '',
  imapPort: 993,
  imapUser: '',
  imapPassword: '',
  imapTls: true,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpTls: true,
  syncEnabled: true,
  syncIntervalMinutes: 5,
  syncFolders: 'INBOX',
}

export default function EmailImapPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...defaultForm })

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/email-accounts')
      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch email accounts', error, { module: 'SettingsEmailImapPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const resetForm = () => {
    setFormData({ ...defaultForm })
    setEditingId(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (account: EmailAccount) => {
    setFormData({
      name: account.name,
      email: account.email,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapUser: account.imapUser,
      imapPassword: '',
      imapTls: account.imapTls,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      smtpUser: account.smtpUser,
      smtpPassword: '',
      smtpTls: account.smtpTls,
      syncEnabled: account.syncEnabled,
      syncIntervalMinutes: account.syncIntervalMinutes,
      syncFolders: account.syncFolders,
    })
    setEditingId(account.id)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.imapHost || !formData.smtpHost) {
      toast.error('Bitte fuellen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const url = editingId
        ? `/api/v1/email-accounts/${editingId}`
        : '/api/v1/email-accounts'
      const method = editingId ? 'PUT' : 'POST'

      const payload: Record<string, unknown> = { ...formData }
      if (editingId && !formData.imapPassword) delete payload.imapPassword
      if (editingId && !formData.smtpPassword) delete payload.smtpPassword

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingId ? 'Konto aktualisiert' : 'Konto erstellt')
        setShowDialog(false)
        resetForm()
        await fetchAccounts()
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

  const handleDelete = async (accountId: string) => {
    if (!confirm('Konto wirklich loeschen?')) return
    try {
      const response = await fetch(`/api/v1/email-accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Konto geloescht')
        await fetchAccounts()
      } else {
        toast.error('Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    }
  }

  const handleTestConnection = async (accountId: string) => {
    setTestingId(accountId)
    try {
      const response = await fetch(`/api/v1/email-accounts/${accountId}/test`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success('Verbindung erfolgreich')
      } else {
        toast.error(data.error?.message || 'Verbindung fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Verbindungstest fehlgeschlagen')
    } finally {
      setTestingId(null)
    }
  }

  const handleSync = async (accountId: string) => {
    setSyncingId(accountId)
    try {
      const response = await fetch(`/api/v1/email-accounts/${accountId}/sync`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success('Synchronisierung gestartet')
        await fetchAccounts()
      } else {
        toast.error(data.error?.message || 'Synchronisierung fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Synchronisierung fehlgeschlagen')
    } finally {
      setSyncingId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nie'
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSyncBadge = (account: EmailAccount) => {
    if (!account.syncEnabled) {
      return <Badge variant="secondary">Deaktiviert</Badge>
    }
    switch (account.syncStatus) {
      case 'syncing':
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Synchronisiert
          </Badge>
        )
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aktiv
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Fehler
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Settings className="mr-1 h-3 w-3" />
            Bereit
          </Badge>
        )
    }
  }

  const updateField = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Mail-Konten</h1>
          <p className="text-muted-foreground">
            IMAP/SMTP-Konten fuer den E-Mail-Empfang und -Versand verwalten
          </p>
        </div>
        <Button onClick={openCreateDialog} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Neues Konto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Keine E-Mail-Konten</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Erstellen Sie ein IMAP/SMTP-Konto, um E-Mails zu synchronisieren.
            </p>
            <Button onClick={openCreateDialog} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Neues Konto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                  </div>
                  {getSyncBadge(account)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">IMAP</div>
                  <div className="truncate">{account.imapHost}:{account.imapPort}</div>
                  <div className="text-muted-foreground">SMTP</div>
                  <div className="truncate">{account.smtpHost}:{account.smtpPort}</div>
                  <div className="text-muted-foreground">Letzte Sync</div>
                  <div className="truncate">{formatDate(account.lastSyncAt)}</div>
                  <div className="text-muted-foreground">Intervall</div>
                  <div>{account.syncIntervalMinutes} Min.</div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(account)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(account.id)}
                    disabled={testingId === account.id}
                  >
                    {testingId === account.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="mr-1 h-3 w-3" />
                    )}
                    Testen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(account.id)}
                    disabled={syncingId === account.id}
                  >
                    {syncingId === account.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-1 h-3 w-3" />
                    )}
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Loeschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm() } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'E-Mail-Konto bearbeiten' : 'Neues E-Mail-Konto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* General */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Allgemein</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="z.B. Firmen-E-Mail"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@firma.de"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* IMAP */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">IMAP (Empfang)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">Host</Label>
                  <Input
                    id="imapHost"
                    placeholder="imap.provider.de"
                    value={formData.imapHost}
                    onChange={(e) => updateField('imapHost', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">Port</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => updateField('imapPort', parseInt(e.target.value) || 993)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapUser">Benutzer</Label>
                  <Input
                    id="imapUser"
                    placeholder="benutzer@firma.de"
                    value={formData.imapUser}
                    onChange={(e) => updateField('imapUser', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPassword">Passwort</Label>
                  <Input
                    id="imapPassword"
                    type="password"
                    placeholder={editingId ? 'Leer = unveraendert' : 'Passwort'}
                    value={formData.imapPassword}
                    onChange={(e) => updateField('imapPassword', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="imapTls"
                  checked={formData.imapTls}
                  onCheckedChange={(checked) => updateField('imapTls', !!checked)}
                />
                <Label htmlFor="imapTls" className="text-sm font-normal">
                  TLS/SSL verwenden
                </Label>
              </div>
            </div>

            {/* SMTP */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SMTP (Versand)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.provider.de"
                    value={formData.smtpHost}
                    onChange={(e) => updateField('smtpHost', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => updateField('smtpPort', parseInt(e.target.value) || 587)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Benutzer</Label>
                  <Input
                    id="smtpUser"
                    placeholder="benutzer@firma.de"
                    value={formData.smtpUser}
                    onChange={(e) => updateField('smtpUser', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Passwort</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    placeholder={editingId ? 'Leer = unveraendert' : 'Passwort'}
                    value={formData.smtpPassword}
                    onChange={(e) => updateField('smtpPassword', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smtpTls"
                  checked={formData.smtpTls}
                  onCheckedChange={(checked) => updateField('smtpTls', !!checked)}
                />
                <Label htmlFor="smtpTls" className="text-sm font-normal">
                  TLS/SSL verwenden
                </Label>
              </div>
            </div>

            {/* Sync */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Synchronisierung</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncEnabled"
                  checked={formData.syncEnabled}
                  onCheckedChange={(checked) => updateField('syncEnabled', !!checked)}
                />
                <Label htmlFor="syncEnabled" className="text-sm font-normal">
                  Automatische Synchronisierung aktiviert
                </Label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Intervall (Minuten)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    min={1}
                    value={formData.syncIntervalMinutes}
                    onChange={(e) => updateField('syncIntervalMinutes', parseInt(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="syncFolders">Ordner</Label>
                  <Input
                    id="syncFolders"
                    placeholder="INBOX"
                    value={formData.syncFolders}
                    onChange={(e) => updateField('syncFolders', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm() }}>
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
