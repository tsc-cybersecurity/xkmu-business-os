'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { Plus, Loader2, Workflow, Play, Power, PowerOff, Trash2, Eye, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import Link from 'next/link'

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export default function N8nWorkflowsPage() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadWorkflows = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/v1/n8n/workflows')
      const json = await res.json()
      if (json.success) {
        setWorkflows(json.data || [])
      } else {
        setError(json.error?.message || 'Fehler beim Laden')
      }
    } catch {
      setError('Keine n8n-Verbindung konfiguriert. Bitte in den Einstellungen anlegen.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  async function handleActivate(id: string, active: boolean) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(active ? 'Workflow aktiviert' : 'Workflow deaktiviert')
        loadWorkflows()
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Aktivieren')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleExecute(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow gestartet')
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Ausführen')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Workflow "${name}" wirklich löschen?`)) return

    setActionLoading(id)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow gelöscht')
        loadWorkflows()
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Löschen')
    } finally {
      setActionLoading(null)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">n8n Workflows</h1>
          <p className="text-muted-foreground">
            Workflows erstellen, verwalten und automatisieren
          </p>
        </div>
        <Link href="/intern/n8n-workflows/new" className="self-start sm:self-auto">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Workflow erstellen
          </Button>
        </Link>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Verbindungsfehler</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link href="/intern/settings/n8n" className="text-sm text-primary hover:underline">
                n8n-Verbindung konfigurieren
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Workflow}
              title="Keine Workflows vorhanden"
              description="Erstellen Sie Ihren ersten Workflow mit KI-Unterstützung"
              action={
                <Link href="/intern/n8n-workflows/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Workflow erstellen
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Workflows ({workflows.length})</CardTitle>
            <CardDescription>
              Workflows aus Ihrer n8n-Instanz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium">{wf.name}</TableCell>
                    <TableCell>
                      <Badge variant={wf.active ? 'default' : 'secondary'}>
                        {wf.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {wf.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/intern/n8n-workflows/${wf.id}`}>
                          <Button variant="ghost" size="icon" title="Details" aria-label="Anzeigen">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ausführen"
                          aria-label="Ausfuehren"
                          onClick={() => handleExecute(wf.id)}
                          disabled={actionLoading === wf.id}
                        >
                          {actionLoading === wf.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={wf.active ? 'Deaktivieren' : 'Aktivieren'}
                          aria-label={wf.active ? 'Deaktivieren' : 'Aktivieren'}
                          onClick={() => handleActivate(wf.id, !wf.active)}
                          disabled={actionLoading === wf.id}
                        >
                          {wf.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Löschen"
                          aria-label="Löschen"
                          onClick={() => handleDelete(wf.id, wf.name)}
                          disabled={actionLoading === wf.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
