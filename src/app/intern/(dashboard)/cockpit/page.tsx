'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Search, Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { CockpitStatsCards } from './_components/cockpit-stats-cards'
import { CockpitSystemsTable } from './_components/cockpit-systems-table'
import { CockpitSystemDialog } from './_components/cockpit-system-dialog'

interface CockpitSystem {
  id: string
  name: string
  hostname: string | null
  url: string | null
  category: string | null
  function: string | null
  description: string | null
  ipAddress: string | null
  port: number | null
  protocol: string | null
  status: string | null
  tags: string[] | null
  notes: string | null
  credentialCount: number
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
}

interface FormData {
  name: string
  hostname: string
  url: string
  category: string
  function: string
  description: string
  ipAddress: string
  port: string
  protocol: string
  status: string
  tags: string
  notes: string
}

const emptyForm: FormData = {
  name: '', hostname: '', url: '', category: '', function: '', description: '',
  ipAddress: '', port: '', protocol: '', status: 'active', tags: '', notes: '',
}

const categories = [
  'Server', 'Datenbank', 'Cloud', 'Monitoring', 'Mail', 'Firewall', 'VPN', 'Sonstiges',
]

export default function CockpitPage() {
  const [systems, setSystems] = useState<CockpitSystem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('alle')

  const fetchSystems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'alle') params.set('category', categoryFilter)
      params.set('limit', '200')
      const response = await fetch(`/api/v1/cockpit?${params}`)
      const data = await response.json()
      if (data.success) setSystems(data.data)
    } catch (error) {
      logger.error('Failed to fetch cockpit systems', error, { module: 'CockpitPage' })
      toast.error('Fehler beim Laden der Systeme')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cockpit/stats')
      const data = await response.json()
      if (data.success) setStats(data.data)
    } catch (error) {
      logger.error('Failed to fetch cockpit stats', error, { module: 'CockpitPage' })
    }
  }, [])

  useEffect(() => {
    fetchSystems()
    fetchStats()
  }, [fetchSystems, fetchStats])

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (system: CockpitSystem) => {
    setEditingId(system.id)
    setFormData({
      name: system.name || '',
      hostname: system.hostname || '',
      url: system.url || '',
      category: system.category || '',
      function: system.function || '',
      description: system.description || '',
      ipAddress: system.ipAddress || '',
      port: system.port?.toString() || '',
      protocol: system.protocol || '',
      status: system.status || 'active',
      tags: (system.tags || []).join(', '),
      notes: system.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Name ist erforderlich'); return }
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        hostname: formData.hostname,
        url: formData.url,
        category: formData.category,
        function: formData.function,
        description: formData.description,
        ipAddress: formData.ipAddress,
        port: formData.port ? parseInt(formData.port) : null,
        protocol: formData.protocol,
        status: formData.status,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes: formData.notes,
      }
      const url = editingId ? `/api/v1/cockpit/${editingId}` : '/api/v1/cockpit'
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Fehler beim Speichern')
      toast.success(editingId ? 'System aktualisiert' : 'System erstellt')
      setDialogOpen(false)
      fetchSystems()
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/cockpit/${deletingId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('System gelöscht')
        setDeleteDialogOpen(false)
        fetchSystems()
        fetchStats()
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Loeschen')
    } finally {
      setDeleting(false)
    }
  }

  const getConnectionString = (system: CockpitSystem): string | null => {
    if (system.url) return system.url
    if (system.hostname) {
      const proto = system.protocol || 'https'
      const port = system.port ? `:${system.port}` : ''
      return `${proto}://${system.hostname}${port}`
    }
    return null
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cockpit</h1>
          <p className="text-muted-foreground">IT-Systeme und Infrastruktur verwalten</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Neues System
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && <CockpitStatsCards stats={stats} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="flex-1">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="alle">Alle</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Systems Table */}
      <CockpitSystemsTable
        systems={systems}
        onEdit={openEdit}
        onDelete={(id) => { setDeletingId(id); setDeleteDialogOpen(true) }}
        onOpenCreate={openCreate}
        getConnectionString={getConnectionString}
      />

      {/* Dialog */}
      <CockpitSystemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSave={handleSave}
        onSystemsChanged={fetchSystems}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deletingId={deletingId}
        deleting={deleting}
        onDelete={handleDelete}
      />
    </div>
  )
}
