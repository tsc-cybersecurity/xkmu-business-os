'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Monitor,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Server,
  Activity,
  AlertTriangle,
  Search,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface CockpitSystem {
  id: string
  name: string
  hostname: string | null
  url: string | null
  username: string | null
  password: string | null
  category: string | null
  function: string | null
  description: string | null
  ipAddress: string | null
  port: number | null
  protocol: string | null
  status: string | null
  tags: string[] | null
  notes: string | null
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
  username: string
  password: string
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
  name: '',
  hostname: '',
  url: '',
  username: '',
  password: '',
  category: '',
  function: '',
  description: '',
  ipAddress: '',
  port: '',
  protocol: '',
  status: 'active',
  tags: '',
  notes: '',
}

const categories = [
  'Server',
  'Datenbank',
  'Cloud',
  'Monitoring',
  'Mail',
  'Firewall',
  'VPN',
  'Sonstiges',
]

const protocols = [
  { value: 'https', label: 'HTTPS' },
  { value: 'http', label: 'HTTP' },
  { value: 'ssh', label: 'SSH' },
  { value: 'rdp', label: 'RDP' },
  { value: 'ftp', label: 'FTP' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'other', label: 'Andere' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  inactive: { label: 'Inaktiv', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  maintenance: { label: 'Wartung', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
}

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
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [formPasswordVisible, setFormPasswordVisible] = useState(false)

  const fetchSystems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'alle') params.set('category', categoryFilter)
      params.set('limit', '200')

      const response = await fetch(`/api/v1/cockpit?${params}`)
      const data = await response.json()
      if (data.success) {
        setSystems(data.data)
      }
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
      if (data.success) {
        setStats(data.data)
      }
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
    setFormPasswordVisible(false)
    setDialogOpen(true)
  }

  const openEdit = (system: CockpitSystem) => {
    setEditingId(system.id)
    setFormData({
      name: system.name || '',
      hostname: system.hostname || '',
      url: system.url || '',
      username: system.username || '',
      password: system.password || '',
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
    setFormPasswordVisible(false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        hostname: formData.hostname,
        url: formData.url,
        username: formData.username,
        password: formData.password,
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

      const url = editingId
        ? `/api/v1/cockpit/${editingId}`
        : '/api/v1/cockpit'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

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
      const response = await fetch(`/api/v1/cockpit/${deletingId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('System geloescht')
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} kopiert`)
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cockpit</h1>
          <p className="text-muted-foreground">
            IT-Systeme und Infrastruktur verwalten
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neues System
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamt</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 dark:bg-green-900 p-2">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktiv</p>
                  <p className="text-2xl font-bold">{stats.byStatus['active'] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 dark:bg-red-900 p-2">
                  <Server className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inaktiv</p>
                  <p className="text-2xl font-bold">{stats.byStatus['inactive'] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900 p-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wartung</p>
                  <p className="text-2xl font-bold">{stats.byStatus['maintenance'] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Distribution */}
      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <Badge key={cat} variant="secondary" className="text-sm">
              {cat}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="flex-1">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="alle">Alle</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat}
              </TabsTrigger>
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
      {systems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Keine Systeme vorhanden</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Erfassen Sie Ihre IT-Systeme und Infrastruktur.
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Erstes System hinzufuegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hostname / URL</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Funktion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zugangsdaten</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((system) => {
                  const connStr = getConnectionString(system)
                  const statusConf = statusConfig[system.status || 'active'] || statusConfig.active

                  return (
                    <TableRow key={system.id}>
                      <TableCell>
                        <button
                          className="font-medium text-left hover:text-primary transition-colors"
                          onClick={() => openEdit(system)}
                        >
                          {system.name}
                        </button>
                        {system.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                            {system.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {connStr && (
                            <a
                              href={connStr.startsWith('http') ? connStr : `https://${connStr}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {system.hostname || system.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {system.ipAddress && (
                            <span className="text-xs text-muted-foreground">
                              {system.ipAddress}
                              {system.port ? `:${system.port}` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {system.category && (
                          <Badge variant="outline">{system.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{system.function || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConf.color}>
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(system.username || system.password) ? (
                          <div className="flex items-center gap-1">
                            {system.username && (
                              <span className="text-xs text-muted-foreground">{system.username}</span>
                            )}
                            {system.password && (
                              <>
                                <span className="text-xs mx-1">
                                  {visiblePasswords.has(system.id)
                                    ? system.password
                                    : '••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(system.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  title={visiblePasswords.has(system.id) ? 'Verbergen' : 'Anzeigen'}
                                >
                                  {visiblePasswords.has(system.id) ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(system.password!, 'Passwort')}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Passwort kopieren"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(system)}
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingId(system.id)
                              setDeleteDialogOpen(true)
                            }}
                            title="Loeschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'System bearbeiten' : 'Neues System hinzufuegen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Grunddaten */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Grunddaten</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Name" htmlFor="name" required>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="z.B. Produktiv-Server"
                  />
                </FormField>

                <FormField label="Kategorie" htmlFor="category">
                  <Select
                    value={formData.category || '_none'}
                    onValueChange={(v) => setFormData((p) => ({ ...p, category: v === '_none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategorie waehlen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Keine Kategorie</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Funktion" htmlFor="function">
                  <Input
                    id="function"
                    value={formData.function}
                    onChange={(e) => setFormData((p) => ({ ...p, function: e.target.value }))}
                    placeholder="z.B. Webserver, Backup"
                  />
                </FormField>

                <FormField label="Status" htmlFor="status">
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="inactive">Inaktiv</SelectItem>
                      <SelectItem value="maintenance">Wartung</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="mt-4">
                <FormField label="Beschreibung" htmlFor="description">
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Kurze Beschreibung des Systems..."
                    rows={2}
                  />
                </FormField>
              </div>
            </div>

            {/* Verbindung */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Verbindung</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Hostname" htmlFor="hostname">
                  <Input
                    id="hostname"
                    value={formData.hostname}
                    onChange={(e) => setFormData((p) => ({ ...p, hostname: e.target.value }))}
                    placeholder="z.B. server.example.com"
                  />
                </FormField>

                <FormField label="URL" htmlFor="url">
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                    placeholder="z.B. https://admin.example.com"
                  />
                </FormField>

                <FormField label="IP-Adresse" htmlFor="ipAddress">
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData((p) => ({ ...p, ipAddress: e.target.value }))}
                    placeholder="z.B. 192.168.1.100"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Port" htmlFor="port">
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData((p) => ({ ...p, port: e.target.value }))}
                      placeholder="z.B. 443"
                    />
                  </FormField>

                  <FormField label="Protokoll" htmlFor="protocol">
                    <Select
                      value={formData.protocol || '_none'}
                      onValueChange={(v) => setFormData((p) => ({ ...p, protocol: v === '_none' ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Waehlen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Kein Protokoll</SelectItem>
                        {protocols.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>

            {/* Zugangsdaten */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Zugangsdaten</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Benutzer" htmlFor="username">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                    placeholder="z.B. admin"
                  />
                </FormField>

                <FormField label="Passwort" htmlFor="password">
                  <div className="relative">
                    <Input
                      id="password"
                      type={formPasswordVisible ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Passwort"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setFormPasswordVisible(!formPasswordVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {formPasswordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormField>
              </div>
            </div>

            {/* Sonstiges */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sonstiges</h3>
              <div className="space-y-4">
                <FormField label="Tags" htmlFor="tags">
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="Tags, kommagetrennt (z.B. produktion, kritisch)"
                  />
                </FormField>

                <FormField label="Notizen" htmlFor="notes">
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Zusaetzliche Notizen..."
                    rows={3}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="System loeschen"
        description="Moechten Sie dieses System wirklich loeschen? Dies kann nicht rueckgaengig gemacht werden."
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
