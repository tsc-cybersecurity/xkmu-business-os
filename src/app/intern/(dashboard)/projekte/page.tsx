'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Kanban, Loader2, Plus, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectItem {
  id: string
  name: string
  description: string | null
  status: string
  projectType: string
  companyName: string | null
  taskCount: number
  createdAt: string
}

export default function ProjektePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/projects')
      const data = await response.json()
      if (data.success) setProjects(data.data)
    } catch {
      toast.error('Projekte konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const data = await response.json()
      if (data.success) {
        setShowNew(false)
        setNewName('')
        fetchProjects()
        toast.success('Projekt erstellt')
      }
    } catch {
      toast.error('Erstellen fehlgeschlagen')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Kanban className="h-8 w-8" />Projekte</h1>
          <p className="text-muted-foreground mt-1">Kanban-Boards fuer Projekte und Aufgaben</p>
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
                      {project.status === 'active' ? 'Aktiv' : project.status === 'completed' ? 'Abgeschlossen' : 'Archiviert'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{project.taskCount} Aufgaben</span>
                  </div>
                  <CardTitle className="text-lg mt-2">{project.name}</CardTitle>
                  {project.companyName && (
                    <CardDescription className="flex items-center gap-1"><Building2 className="h-3 w-3" />{project.companyName}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
          <Input placeholder="Projektname" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} />
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
