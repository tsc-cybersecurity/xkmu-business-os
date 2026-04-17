'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CockpitCredentialList } from './cockpit-credential-list'
import { CockpitCredentialForm } from './cockpit-credential-form'

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

const emptyCredentialForm: CredentialFormData = { type: 'login', label: '', username: '', password: '', notes: '' }

const categories = ['Server', 'Datenbank', 'Cloud', 'Monitoring', 'Mail', 'Firewall', 'VPN', 'Sonstiges']
const protocols = [
  { value: 'https', label: 'HTTPS' }, { value: 'http', label: 'HTTP' }, { value: 'ssh', label: 'SSH' },
  { value: 'rdp', label: 'RDP' }, { value: 'ftp', label: 'FTP' }, { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' }, { value: 'other', label: 'Andere' },
]

interface CockpitSystemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  saving: boolean
  onSave: () => void
  onSystemsChanged: () => void
  deleteDialogOpen: boolean
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  deletingId: string | null
  deleting: boolean
  onDelete: () => void
}

export function CockpitSystemDialog({
  open, onOpenChange, editingId, formData, setFormData, saving, onSave,
  onSystemsChanged, deleteDialogOpen, setDeleteDialogOpen, deletingId, deleting, onDelete,
}: CockpitSystemDialogProps) {
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

  const fetchCredentials = useCallback(async (systemId: string) => {
    setCredentialsLoading(true)
    try {
      const response = await fetch(`/api/v1/cockpit/${systemId}/credentials`)
      const data = await response.json()
      if (data.success) setCredentials(data.data)
    } catch {
      toast.error('Fehler beim Laden der Zugangsdaten')
    } finally {
      setCredentialsLoading(false)
    }
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && editingId) {
      setCredentials([])
      setShowCredentialForm(false)
      setEditingCredentialId(null)
      fetchCredentials(editingId)
    } else if (!isOpen) {
      setCredentials([])
      setShowCredentialForm(false)
      setEditingCredentialId(null)
    }
    onOpenChange(isOpen)
  }

  const openCredentialCreate = () => {
    setEditingCredentialId(null)
    setCredentialForm(emptyCredentialForm)
    setCredFormPasswordVisible(false)
    setShowCredentialForm(true)
  }

  const openCredentialEdit = (cred: CockpitCredential) => {
    setEditingCredentialId(cred.id)
    setCredentialForm({ type: cred.type, label: cred.label, username: cred.username || '', password: cred.password || '', notes: cred.notes || '' })
    setCredFormPasswordVisible(false)
    setShowCredentialForm(true)
  }

  const handleSaveCredential = async () => {
    if (!editingId) return
    if (!credentialForm.label.trim()) { toast.error('Bezeichnung ist erforderlich'); return }
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
      if (!response.ok) throw new Error(data.error?.message || 'Fehler beim Speichern')
      toast.success(editingCredentialId ? 'Zugang aktualisiert' : 'Zugang erstellt')
      setShowCredentialForm(false)
      setEditingCredentialId(null)
      fetchCredentials(editingId)
      onSystemsChanged()
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
      const response = await fetch(`/api/v1/cockpit/${editingId}/credentials/${deletingCredentialId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Zugang gelöscht')
        setDeleteCredentialDialogOpen(false)
        setDeletingCredentialId(null)
        fetchCredentials(editingId)
        onSystemsChanged()
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
    try { await navigator.clipboard.writeText(text); toast.success(`${label} kopiert`) }
    catch { toast.error('Kopieren fehlgeschlagen') }
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'System bearbeiten' : 'Neues System hinzufuegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Grunddaten */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Grunddaten</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Name" htmlFor="name" required>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="z.B. Produktiv-Server" />
                </FormField>
                <FormField label="Kategorie" htmlFor="category">
                  <Select value={formData.category || '_none'} onValueChange={(v) => setFormData((p) => ({ ...p, category: v === '_none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Kategorie wählen..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Keine Kategorie</SelectItem>
                      {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Funktion" htmlFor="function">
                  <Input id="function" value={formData.function} onChange={(e) => setFormData((p) => ({ ...p, function: e.target.value }))} placeholder="z.B. Webserver, Backup" />
                </FormField>
                <FormField label="Status" htmlFor="status">
                  <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Kurze Beschreibung des Systems..." rows={2} />
                </FormField>
              </div>
            </div>

            {/* Verbindung */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Verbindung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Hostname" htmlFor="hostname">
                  <Input id="hostname" value={formData.hostname} onChange={(e) => setFormData((p) => ({ ...p, hostname: e.target.value }))} placeholder="z.B. server.example.com" />
                </FormField>
                <FormField label="URL" htmlFor="url">
                  <Input id="url" value={formData.url} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} placeholder="z.B. https://admin.example.com" />
                </FormField>
                <FormField label="IP-Adresse" htmlFor="ipAddress">
                  <Input id="ipAddress" value={formData.ipAddress} onChange={(e) => setFormData((p) => ({ ...p, ipAddress: e.target.value }))} placeholder="z.B. 192.168.1.100" />
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Port" htmlFor="port">
                    <Input id="port" type="number" value={formData.port} onChange={(e) => setFormData((p) => ({ ...p, port: e.target.value }))} placeholder="z.B. 443" />
                  </FormField>
                  <FormField label="Protokoll" htmlFor="protocol">
                    <Select value={formData.protocol || '_none'} onValueChange={(v) => setFormData((p) => ({ ...p, protocol: v === '_none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Waehlen..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Kein Protokoll</SelectItem>
                        {protocols.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>

            {/* Zugangsdaten */}
            {editingId && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Zugangsdaten</h3>
                  {!showCredentialForm && (
                    <Button variant="outline" size="sm" onClick={openCredentialCreate}>
                      <Plus className="mr-1 h-3 w-3" />Neuer Zugang
                    </Button>
                  )}
                </div>
                {credentialsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <CockpitCredentialList
                      credentials={credentials}
                      visiblePasswords={visiblePasswords}
                      onTogglePasswordVisibility={togglePasswordVisibility}
                      onCopyToClipboard={copyToClipboard}
                      onEdit={openCredentialEdit}
                      onDelete={(id) => { setDeletingCredentialId(id); setDeleteCredentialDialogOpen(true) }}
                    />
                    {credentials.length === 0 && !showCredentialForm && (
                      <p className="text-sm text-muted-foreground py-2">Keine Zugangsdaten vorhanden.</p>
                    )}
                    {showCredentialForm && (
                      <CockpitCredentialForm
                        editingCredentialId={editingCredentialId}
                        credentialForm={credentialForm}
                        setCredentialForm={setCredentialForm}
                        credFormPasswordVisible={credFormPasswordVisible}
                        setCredFormPasswordVisible={setCredFormPasswordVisible}
                        savingCredential={savingCredential}
                        onSave={handleSaveCredential}
                        onCancel={() => { setShowCredentialForm(false); setEditingCredentialId(null) }}
                      />
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
                  <Input id="tags" value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} placeholder="Tags, kommagetrennt (z.B. produktion, kritisch)" />
                </FormField>
                <FormField label="Notizen" htmlFor="notes">
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Zusaetzliche Notizen..." rows={3} />
                </FormField>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="System löschen"
        description="Möchten Sie dieses System wirklich löschen? Dies kann nicht rückgängig gemacht werden."
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={onDelete}
        loading={deleting}
      />

      <ConfirmDialog
        open={deleteCredentialDialogOpen}
        onOpenChange={setDeleteCredentialDialogOpen}
        title="Zugang löschen"
        description="Möchten Sie diesen Zugang wirklich löschen? Dies kann nicht rückgängig gemacht werden."
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={handleDeleteCredential}
        loading={deletingCredential}
      />
    </>
  )
}
