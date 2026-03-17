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
  KeyRound,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface CockpitCredential {
  id: string
  systemId: string
  type: string
  label: string
  username: string | null
  password: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

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

interface CredentialFormData {
  type: string
  label: string
  username: string
  password: string
  notes: string
}

const emptyForm: FormData = {
  name: '',
  hostname: '',
  url: '',
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

const emptyCredentialForm: CredentialFormData = {
  type: 'login',
  label: '',
  username: '',
  password: '',
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

const credentialTypeLabels: Record<string, string> = {
  login: 'Login',
  api_key: 'API-Schluessel',
  ssh_key: 'SSH-Key',
  certificate: 'Zertifikat',
  token: 'Token',
  database: 'Datenbank',
  ftp: 'FTP',
  other: 'Sonstige',
}

const credentialTypeBadgeColors: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  api_key: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  ssh_key: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  certificate: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  token: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  database: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  ftp: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
}

const credentialTypes = [
  { value: 'login', label: 'Login' },
  { value: 'api_key', label: 'API-Schluessel' },
  { value: 'ssh_key', label: 'SSH-Key' },
  { value: 'certificate', label: 'Zertifikat' },
  { value: 'token', label: 'Token' },
  { value: 'database', label: 'Datenbank' },
  { value: 'ftp', label: 'FTP' },
  { value: 'other', label: 'Sonstige' },
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

  // Credential state
  const [credentials, setCredentials] = useState<CockpitCredential[]>([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [credentialForm, setCredentialForm] = useState<CredentialFormData>(emptyCredentialForm)
  const [showCredentialForm, setShowCredentialForm] = useState(false)
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null)
  const [savingCredential, setSavingCredential] = useState(false)
  const [deleteCredentialDialogOpen, setDeleteCredentialDialogOpen] = useState(false)
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null)
  const [deletingCredential, setDeletingCredential] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [credFormPasswordVisible, setCredFormPasswordVisible] = useState(false)

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

  const fetchCredentials = useCallback(async (systemId: string) => {
    setCredentialsLoading(true)
    try {
      const response = await fetch(`/api/v1/cockpit/${systemId}/credentials`)
      const data = await response.json()
      if (data.success) {
        setCredentials(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch credentials', error, { module: 'CockpitPage' })
      toast.error('Fehler beim Laden der Zugangsdaten')
    } finally {
      setCredentialsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSystems()
    fetchStats()
  }, [fetchSystems, fetchStats])

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setCredentials([])
    setShowCredentialForm(false)
    setEditingCredentialId(null)
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
    setShowCredentialForm(false)
    setEditingCredentialId(null)
    setDialogOpen(true)
    fetchCredentials(system.id)
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

  // Credential handlers
  const openCredentialCreate = () => {
    setEditingCredentialId(null)
    setCredentialForm(emptyCredentialForm)
    setCredFormPasswordVisible(false)
    setShowCredentialForm(true)
  }

  const openCredentialEdit = (cred: CockpitCredential) => {
    setEditingCredentialId(cred.id)
    setCredentialForm({
      type: cred.type,
      label: cred.label,
      username: cred.username || '',
      password: cred.password || '',
      notes: cred.notes || '',
    })
    setCredFormPasswordVisible(false)
    setShowCredentialForm(true)
  }

  const handleSaveCredential = async () => {
    if (!editingId) return
    if (!credentialForm.label.trim()) {
      toast.error('Bezeichnung ist erforderlich')
      return
    }

    setSavingCredential(true)
    try {
      const url = editingCredentialId
        ? `/api/v1/cockpit/${editingId}/credentials/${editingCredentialId}`
        : `/api/v1/cockpit/${editingId}/credentials`

      const response = await fetch(url, {
        method: editingCredentialId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

      toast.success(editingCredentialId ? 'Zugang aktualisiert' : 'Zugang erstellt')
      setShowCredentialForm(false)
      setEditingCredentialId(null)
      fetchCredentials(editingId)
      fetchSystems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSavingCredential(false)
    }
  }

  const handleDeleteCredential = async () => {
    if (!editingId || !deletingCredentialId) return
    setDeletingCredential(true)
    try {
      const response = await fetch(
        `/api/v1/cockpit/${editingId}/credentials/${deletingCredentialId}`,
        { method: 'DELETE' }
      )
      if (response.ok) {
        toast.success('Zugang geloescht')
        setDeleteCredentialDialogOpen(false)
        setDeletingCredentialId(null)
        fetchCredentials(editingId)
        fetchSystems()
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Loeschen')
    } finally {
      setDeletingCredential(false)
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
                  <TableHead>Zugaenge</TableHead>
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
                        {system.credentialCount > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <KeyRound className="h-3 w-3" />
                            {system.credentialCount} {system.credentialCount === 1 ? 'Zugang' : 'Zugaenge'}
                          </Badge>
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

            {/* Zugangsdaten / Credentials */}
            {editingId && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Zugangsdaten</h3>
                  {!showCredentialForm && (
                    <Button variant="outline" size="sm" onClick={openCredentialCreate}>
                      <Plus className="mr-1 h-3 w-3" />
                      Neuer Zugang
                    </Button>
                  )}
                </div>

                {credentialsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Credential list */}
                    {credentials.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {credentials.map((cred) => (
                          <div
                            key={cred.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                          >
                            <Badge className={credentialTypeBadgeColors[cred.type] || credentialTypeBadgeColors.other}>
                              {credentialTypeLabels[cred.type] || cred.type}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{cred.label}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {cred.username && (
                                  <span className="text-xs text-muted-foreground">{cred.username}</span>
                                )}
                                {cred.password && (
                                  <span className="text-xs text-muted-foreground">
                                    {visiblePasswords.has(cred.id) ? cred.password : '••••••'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {cred.password && (
                                <>
                                  <button
                                    onClick={() => togglePasswordVisibility(cred.id)}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    title={visiblePasswords.has(cred.id) ? 'Verbergen' : 'Anzeigen'}
                                  >
                                    {visiblePasswords.has(cred.id) ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(cred.password!, 'Passwort')}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    title="Passwort kopieren"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {cred.username && (
                                <button
                                  onClick={() => copyToClipboard(cred.username!, 'Benutzer')}
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                  title="Benutzer kopieren"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openCredentialEdit(cred)}
                                title="Bearbeiten"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingCredentialId(cred.id)
                                  setDeleteCredentialDialogOpen(true)
                                }}
                                title="Loeschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {credentials.length === 0 && !showCredentialForm && (
                      <p className="text-sm text-muted-foreground py-2">
                        Keine Zugangsdaten vorhanden.
                      </p>
                    )}

                    {/* Credential inline form */}
                    {showCredentialForm && (
                      <div className="rounded-lg border p-4 space-y-3">
                        <h4 className="text-sm font-medium">
                          {editingCredentialId ? 'Zugang bearbeiten' : 'Neuer Zugang'}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="Typ" htmlFor="cred-type">
                            <Select
                              value={credentialForm.type}
                              onValueChange={(v) => setCredentialForm((p) => ({ ...p, type: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {credentialTypes.map((ct) => (
                                  <SelectItem key={ct.value} value={ct.value}>
                                    {ct.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>

                          <FormField label="Bezeichnung" htmlFor="cred-label" required>
                            <Input
                              id="cred-label"
                              value={credentialForm.label}
                              onChange={(e) => setCredentialForm((p) => ({ ...p, label: e.target.value }))}
                              placeholder="z.B. Admin-Login"
                            />
                          </FormField>

                          <FormField label="Benutzer" htmlFor="cred-username">
                            <Input
                              id="cred-username"
                              value={credentialForm.username}
                              onChange={(e) => setCredentialForm((p) => ({ ...p, username: e.target.value }))}
                              placeholder="z.B. admin"
                            />
                          </FormField>

                          <FormField label="Passwort" htmlFor="cred-password">
                            <div className="relative">
                              <Input
                                id="cred-password"
                                type={credFormPasswordVisible ? 'text' : 'password'}
                                value={credentialForm.password}
                                onChange={(e) => setCredentialForm((p) => ({ ...p, password: e.target.value }))}
                                placeholder="Passwort"
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setCredFormPasswordVisible(!credFormPasswordVisible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {credFormPasswordVisible ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormField>
                        </div>

                        <FormField label="Notizen" htmlFor="cred-notes">
                          <Textarea
                            id="cred-notes"
                            value={credentialForm.notes}
                            onChange={(e) => setCredentialForm((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Zusaetzliche Notizen..."
                            rows={2}
                          />
                        </FormField>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCredentialForm(false)
                              setEditingCredentialId(null)
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button size="sm" onClick={handleSaveCredential} disabled={savingCredential}>
                            {savingCredential && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            {editingCredentialId ? 'Speichern' : 'Erstellen'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

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

      {/* Delete System Dialog */}
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

      {/* Delete Credential Dialog */}
      <ConfirmDialog
        open={deleteCredentialDialogOpen}
        onOpenChange={setDeleteCredentialDialogOpen}
        title="Zugang loeschen"
        description="Moechten Sie diesen Zugang wirklich loeschen? Dies kann nicht rueckgaengig gemacht werden."
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={handleDeleteCredential}
        loading={deletingCredential}
      />
    </div>
  )
}
