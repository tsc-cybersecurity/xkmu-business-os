'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Workflow, Plus, Loader2, Trash2, Play, Pause, ChevronRight, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { TRIGGER_LABELS } from '@/lib/services/workflow/triggers'

interface WorkflowItem {
  id: string
  name: string
  description: string | null
  trigger: string
  steps: Array<{ action: string; label?: string }>
  isActive: boolean
  createdAt: string
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState('contact.submitted')

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/workflows')
      const data = await res.json()
      if (data.success) setWorkflows(data.data)
    } catch {
      toast.error('Workflows konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  const createWorkflow = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, trigger: newTrigger, steps: [] }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Workflow erstellt')
        setShowCreate(false)
        setNewName('')
        fetchWorkflows()
      }
    } catch {
      toast.error('Fehler beim Erstellen')
    }
  }

  const toggleActive = async (e: React.MouseEvent, wf: WorkflowItem) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await fetch(`/api/v1/workflows/${wf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !wf.isActive }),
      })
      fetchWorkflows()
    } catch {
      toast.error('Fehler beim Ändern')
    }
  }

  const deleteWorkflow = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Workflow wirklich löschen?')) return
    try {
      await fetch(`/api/v1/workflows/${id}`, { method: 'DELETE' })
      toast.success('Workflow gelöscht')
      fetchWorkflows()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Workflow className="h-8 w-8" />
            Workflows
          </h1>
          <p className="text-muted-foreground mt-1">Automatisierungen konfigurieren und verwalten</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />Neuer Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Noch keine Workflows</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstellen Sie Ihren ersten Workflow, um Prozesse zu automatisieren.</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Workflow erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map(wf => (
            <Link key={wf.id} href={`/intern/settings/workflows/${wf.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{wf.name}</h3>
                        <Badge variant={wf.isActive ? 'default' : 'secondary'} className="shrink-0 text-xs">
                          {wf.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                      {wf.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{wf.description}</p>}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{TRIGGER_LABELS[wf.trigger] || wf.trigger}</Badge>
                        <span>{wf.steps.length} Schritte</span>
                      </div>

                      {wf.steps.length > 0 && (
                        <div className="flex items-center gap-1 mt-3 flex-wrap">
                          {wf.steps.slice(0, 4).map((s, i) => (
                            <span key={i} className="text-[10px] bg-muted rounded px-1.5 py-0.5">
                              {s.label || s.action}
                            </span>
                          ))}
                          {wf.steps.length > 4 && <span className="text-[10px] text-muted-foreground">+{wf.steps.length - 4}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => toggleActive(e, wf)} title={wf.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                        {wf.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => deleteWorkflow(e, wf.id)} title="Löschen">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Lead Kontaktformular" />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={newTrigger} onValueChange={setNewTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={createWorkflow} disabled={!newName.trim()}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
