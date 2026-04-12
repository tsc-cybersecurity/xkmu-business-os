'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Kanban, Loader2, Plus, Building2, Calendar, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProjectItem {
  id: string; name: string; description: string | null; status: string; projectType: string
  priority: string | null; startDate: string | null; endDate: string | null
  companyName: string | null; taskCount: number; createdAt: string
}

interface Company { id: string; name: string }

const PRIORITY_COLORS: Record<string, string> = {
  hoch: 'text-orange-600', mittel: 'text-yellow-600', niedrig: 'text-blue-400',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv', completed: 'Abgeschlossen', archived: 'Archiviert', on_hold: 'Pausiert',
}

export default function ProjektePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCompanyId, setNewCompanyId] = useState('none')
  const [newPriority, setNewPriority] = useState('mittel')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  const fetchData = useCallback(async () => {
    const [projRes, compRes] = await Promise.all([
      fetch('/api/v1/projects'), fetch('/api/v1/companies?limit=200'),
    ])
    const [projData, compData] = await Promise.all([projRes.json(), compRes.json()])
    if (projData.success) setProjects(projData.data)
    if (compData.success) setCompanies(compData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName, description: newDesc || undefined,
          companyId: newCompanyId !== 'none' ? newCompanyId : undefined,
          priority: newPriority,
          startDate: newStartDate || undefined, endDate: newEndDate || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowNew(false); setNewName(''); setNewDesc(''); setNewCompanyId('none')
        setNewPriority('mittel'); setNewStartDate(''); setNewEndDate('')
        fetchData(); toast.success('Projekt erstellt')
      } else {
        toast.error(data?.error?.message || 'Erstellen fehlgeschlagen')
      }
    } catch { toast.error('Erstellen fehlgeschlagen') }
    finally { setCreating(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Kanban className="h-8 w-8" />Projekte</h1>
          <p className="text-muted-foreground mt-1">Kanban-Boards und Timeline fuer Projektmanagement</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Neues Projekt</Button>
      </div>

      {projects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Noch keine Projekte vorhanden</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Link key={project.id} href={`/intern/projekte/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {STATUS_LABELS[project.status] || project.status}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {project.priority && (
                        <Flag className={cn('h-3.5 w-3.5', PRIORITY_COLORS[project.priority])} />
                      )}
                      <span className="text-xs text-muted-foreground">{project.taskCount} Aufgaben</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {project.companyName && (
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{project.companyName}</span>
                    )}
                    {project.startDate && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(project.startDate).toLocaleDateString('de-DE')}</span>
                    )}
                    {project.endDate && (
                      <span>— {new Date(project.endDate).toLocaleDateString('de-DE')}</span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Projektname *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Website-Relaunch" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Beschreibung</label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Firma</label>
                <Select value={newCompanyId} onValueChange={setNewCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Keine" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Firma</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Prioritaet</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoch">Hoch</SelectItem>
                    <SelectItem value="mittel">Mittel</SelectItem>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Startdatum</label>
                <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Enddatum</label>
                <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
            <Button onClick={createProject} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
