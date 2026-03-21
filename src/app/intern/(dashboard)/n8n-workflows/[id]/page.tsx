'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Loader2, ArrowLeft, Play, Power, PowerOff, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes?: Array<{ id: string; name: string; type: string; position: number[] }>
  createdAt?: string
  updatedAt?: string
}

interface N8nExecution {
  id: string
  workflowId: string
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt?: string
  status: string
}

export default function N8nWorkflowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [workflow, setWorkflow] = useState<N8nWorkflow | null>(null)
  const [executions, setExecutions] = useState<N8nExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [wfRes, exRes] = await Promise.all([
        fetch(`/api/v1/n8n/workflows/${id}`),
        fetch(`/api/v1/n8n/workflows?workflowId=${id}`).catch(() => null),
      ])

      const wfJson = await wfRes.json()
      if (wfJson.success) {
        setWorkflow(wfJson.data)
      }

      // Executions sind optional
      if (exRes) {
        const exJson = await exRes.json()
        if (exJson.success && Array.isArray(exJson.data)) {
          setExecutions(exJson.data)
        }
      }
    } catch (error) {
      logger.error('Failed to load workflow', error, { module: 'N8nWorkflowsPage' })
      toast.error('Fehler beim Laden des Workflows')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleActivate(active: boolean) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(active ? 'Workflow aktiviert' : 'Workflow deaktiviert')
        loadData()
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Aktivieren')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExecute() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow gestartet')
        setTimeout(loadData, 2000)
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Ausführen')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Workflow "${workflow?.name}" wirklich löschen?`)) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/n8n/workflows/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow gelöscht')
        router.push('/intern/n8n-workflows')
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler beim Löschen')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="space-y-4">
        <Link href="/intern/n8n-workflows">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </Link>
        <p className="text-muted-foreground">Workflow nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/n8n-workflows">
          <Button variant="ghost" size="icon" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{workflow.name}</h1>
            <Badge variant={workflow.active ? 'default' : 'secondary'}>
              {workflow.active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">ID: {workflow.id}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExecute}
            disabled={actionLoading}
          >
            <Play className="mr-2 h-4 w-4" />
            Ausführen
          </Button>
          <Button
            variant="outline"
            onClick={() => handleActivate(!workflow.active)}
            disabled={actionLoading}
          >
            {workflow.active ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Deaktivieren
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Aktivieren
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={actionLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Nodes */}
      {workflow.nodes && workflow.nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow-Nodes ({workflow.nodes.length})</CardTitle>
            <CardDescription>Schritte in diesem Workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflow.nodes.map((node, idx) => (
                  <TableRow key={node.id || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {node.type}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ausführungs-Historie */}
      <Card>
        <CardHeader>
          <CardTitle>Ausführungs-Historie</CardTitle>
          <CardDescription>Letzte Ausführungen dieses Workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <p>Noch keine Ausführungen</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Gestartet</TableHead>
                  <TableHead>Beendet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono text-xs">{ex.id}</TableCell>
                    <TableCell>
                      <Badge variant={ex.status === 'success' ? 'default' : ex.status === 'error' ? 'destructive' : 'secondary'}>
                        {ex.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ex.mode}</TableCell>
                    <TableCell className="text-sm">
                      {ex.startedAt ? new Date(ex.startedAt).toLocaleString('de-DE') : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ex.stoppedAt ? new Date(ex.stoppedAt).toLocaleString('de-DE') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
