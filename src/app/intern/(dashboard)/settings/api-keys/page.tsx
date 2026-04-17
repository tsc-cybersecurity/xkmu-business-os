'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Key, Copy, AlertTriangle, Trash2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { MODULES, MODULE_LABELS } from '@/lib/types/permissions'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  rawKey?: string
}

// Modules to show in the scope selector (exclude internal/admin-only modules)
const SCOPE_MODULES = MODULES.filter(
  (m) => !['database', 'n8n_workflows', 'webhooks'].includes(m)
)

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['*'])
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/api-keys')
      const data = await response.json()

      if (data.success) {
        setApiKeys(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch API keys', error, { module: 'SettingsApiKeysPage' })
    } finally {
      setLoading(false)
    }
  }

  const isFullAccess = selectedScopes.includes('*')

  const handleFullAccessChange = (checked: boolean) => {
    if (checked) {
      setSelectedScopes(['*'])
    } else {
      setSelectedScopes([])
    }
  }

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setSelectedScopes((prev) => [...prev.filter((s) => s !== '*'), scope])
    } else {
      setSelectedScopes((prev) => prev.filter((s) => s !== scope))
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Bitte geben Sie einen Namen ein')
      return
    }

    if (selectedScopes.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Berechtigung aus')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, permissions: selectedScopes }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewKey(data.data)
        fetchApiKeys()
      } else {
        throw new Error(data.error?.message || 'Fehler beim Erstellen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success('API-Schlussel kopiert')
  }

  const handleDeleteClick = (apiKey: ApiKey) => {
    setKeyToDelete(apiKey)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/api-keys/${keyToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('API-Schlussel geloscht')
        fetchApiKeys()
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Loschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Loschen')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setKeyToDelete(null)
    }
  }

  const handleCloseNewKeyDialog = () => {
    setCreateDialogOpen(false)
    setNewKey(null)
    setNewKeyName('')
    setSelectedScopes(['*'])
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

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const renderPermissionBadges = (permissions: string[]) => {
    if (!permissions || permissions.length === 0) {
      return <Badge variant="secondary">Kein Zugriff</Badge>
    }
    if (permissions.includes('*')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Vollzugriff</Badge>
    }
    return (
      <div className="flex gap-1 flex-wrap max-w-xs">
        {permissions.slice(0, 3).map((perm) => (
          <Badge key={perm} variant="outline" className="text-xs">
            {perm}
          </Badge>
        ))}
        {permissions.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{permissions.length - 3} weitere
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
            <Link href="/intern/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">API-Schlussel</h1>
            <p className="text-muted-foreground">
              Verwalten Sie API-Schlussel fur externe Integrationen
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Neuer API-Schlussel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ihre API-Schlussel</CardTitle>
          <CardDescription>
            API-Schlussel ermoglichen externen Anwendungen den Zugriff auf Ihre Daten.
            Behandeln Sie sie wie Passworter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine API-Schlussel</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihren ersten API-Schlussel fur externe Integrationen.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Neuer API-Schlussel
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schlussel</TableHead>
                  <TableHead>Berechtigungen</TableHead>
                  <TableHead>Zuletzt verwendet</TableHead>
                  <TableHead>Ablaufdatum</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {apiKey.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {renderPermissionBadges(apiKey.permissions)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(apiKey.lastUsedAt)}
                    </TableCell>
                    <TableCell>
                      {apiKey.expiresAt ? (
                        <Badge
                          variant={isExpired(apiKey.expiresAt) ? 'destructive' : 'secondary'}
                        >
                          {isExpired(apiKey.expiresAt) ? 'Abgelaufen' : formatDate(apiKey.expiresAt)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Nie</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Löschen"
                        onClick={() => handleDeleteClick(apiKey)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseNewKeyDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newKey ? 'API-Schlussel erstellt' : 'Neuen API-Schlussel erstellen'}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? 'Speichern Sie diesen Schlussel jetzt - er wird nicht mehr angezeigt.'
                : 'Geben Sie dem API-Schlussel einen Namen und wahlen Sie die Berechtigungen.'}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wichtig!</AlertTitle>
                <AlertDescription>
                  Kopieren Sie den Schlussel jetzt. Er kann nicht erneut angezeigt werden.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Ihr neuer API-Schlussel</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                    {newKey.rawKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Kopieren"
                    onClick={() => handleCopyKey(newKey.rawKey!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseNewKeyDialog}>
                  Fertig
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Name *</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="z.B. Make Integration, Zapier, Externe App"
                />
              </div>

              {/* Scope Selector */}
              <div className="space-y-3">
                <Label>Berechtigungen *</Label>

                {/* Full Access option */}
                <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="scope-full-access"
                    checked={isFullAccess}
                    onCheckedChange={(checked) => handleFullAccessChange(checked === true)}
                  />
                  <Label
                    htmlFor="scope-full-access"
                    className="font-medium cursor-pointer"
                  >
                    Vollzugriff (alle Module)
                  </Label>
                </div>

                {/* Per-module checkboxes */}
                <div className={cn(
                  'space-y-1 transition-opacity',
                  isFullAccess ? 'opacity-40 pointer-events-none' : 'opacity-100'
                )}>
                  <p className="text-xs text-muted-foreground mb-2">
                    Oder einzelne Module auswahlen:
                  </p>
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                    {SCOPE_MODULES.map((module) => {
                      const readScope = `${module}:read`
                      const writeScope = `${module}:write`
                      const hasRead = selectedScopes.includes(readScope)
                      const hasWrite = selectedScopes.includes(writeScope)

                      return (
                        <div key={module} className="flex items-center gap-4 py-1 px-2 rounded hover:bg-muted/50">
                          <span className="text-sm flex-1 text-muted-foreground">
                            {MODULE_LABELS[module]}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`scope-${module}-read`}
                                checked={hasRead}
                                onCheckedChange={(checked) =>
                                  handleScopeChange(readScope, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`scope-${module}-read`}
                                className="text-xs cursor-pointer"
                              >
                                Lesen
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`scope-${module}-write`}
                                checked={hasWrite}
                                onCheckedChange={(checked) =>
                                  handleScopeChange(writeScope, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`scope-${module}-write`}
                                className="text-xs cursor-pointer"
                              >
                                Schreiben
                              </Label>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {!isFullAccess && selectedScopes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedScopes.length} Berechtigung{selectedScopes.length !== 1 ? 'en' : ''} ausgewahlt
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseNewKeyDialog}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateKey} disabled={creating}>
                  {creating ? 'Wird erstellt...' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="API-Schlussel loschen"
        description={`Mochten Sie den API-Schlussel "${keyToDelete?.name}" wirklich loschen? Alle Integrationen, die diesen Schlussel verwenden, funktionieren danach nicht mehr.`}
        confirmLabel="Loschen"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  )
}
