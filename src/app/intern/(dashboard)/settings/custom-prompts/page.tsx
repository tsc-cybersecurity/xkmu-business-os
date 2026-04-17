'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, Sparkles, Wand2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface CustomPrompt {
  id: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  color: string | null
  systemPrompt: string | null
  userPrompt: string
  contextConfig: Record<string, boolean> | null
  activityType: string | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
}

interface FormState {
  name: string
  description: string
  systemPrompt: string
  userPrompt: string
  activityType: string
  color: string
  isActive: boolean
  contextConfig: {
    includeOrganization: boolean
    includeCompany: boolean
    includePersons: boolean
    includeRecentActivities: boolean
    includeResearch: boolean
    includeProducts: boolean
    includeProcesses: boolean
  }
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  systemPrompt: '',
  userPrompt: '',
  activityType: 'note',
  color: 'indigo',
  isActive: true,
  contextConfig: {
    includeOrganization: false,
    includeCompany: true,
    includePersons: false,
    includeRecentActivities: false,
    includeResearch: false,
    includeProducts: false,
    includeProcesses: false,
  },
}

const PLACEHOLDER_REFERENCE = [
  { key: '{{companyName}}', desc: 'Firmenname (erfordert includeCompany)' },
  { key: '{{companyIndustry}}', desc: 'Branche' },
  { key: '{{companyCity}}', desc: 'Stadt' },
  { key: '{{companyWebsite}}', desc: 'Website' },
  { key: '{{companyNotes}}', desc: 'Notizen' },
  { key: '{{organizationName}}', desc: 'Eigene Organisation (erfordert includeOrganization)' },
  { key: '{{primaryContactName}}', desc: 'Hauptansprechpartner (erfordert includePersons)' },
  { key: '{{primaryContactTitle}}', desc: 'Titel/Position' },
  { key: '{{recentActivities}}', desc: 'Letzte Aktivitäten' },
  { key: '{{latestResearch}}', desc: 'Letzte KI-Recherche' },
  { key: '{{productList}}', desc: 'Produkte/Leistungen' },
  { key: '{{processList}}', desc: 'Prozesse' },
]

export default function CustomPromptsPage() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateInput, setGenerateInput] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/custom-prompts')
      const data = await res.json()
      if (data?.success) setPrompts(data.data?.prompts || [])
    } catch (e) {
      logger.error('Failed to load custom prompts', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setEditingId(null)
    setCreating(false)
    setForm(EMPTY_FORM)
    setShowGenerate(false)
    setGenerateInput('')
  }

  const beginEdit = (p: CustomPrompt) => {
    setEditingId(p.id)
    setCreating(false)
    setForm({
      name: p.name,
      description: p.description || '',
      systemPrompt: p.systemPrompt || '',
      userPrompt: p.userPrompt,
      activityType: p.activityType || 'note',
      color: p.color || 'indigo',
      isActive: p.isActive !== false,
      contextConfig: {
        includeOrganization: !!p.contextConfig?.includeOrganization,
        includeCompany: p.contextConfig?.includeCompany !== false,
        includePersons: !!p.contextConfig?.includePersons,
        includeRecentActivities: !!p.contextConfig?.includeRecentActivities,
        includeResearch: !!p.contextConfig?.includeResearch,
        includeProducts: !!p.contextConfig?.includeProducts,
        includeProcesses: !!p.contextConfig?.includeProcesses,
      },
    })
  }

  const save = async () => {
    if (!form.name.trim() || !form.userPrompt.trim()) {
      toast.error('Name und Prompt-Text sind Pflichtfelder')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        systemPrompt: form.systemPrompt || null,
        userPrompt: form.userPrompt,
        activityType: form.activityType,
        color: form.color,
        isActive: form.isActive,
        contextConfig: form.contextConfig,
      }
      const res = editingId
        ? await fetch(`/api/v1/custom-prompts/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/v1/custom-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (data?.success) {
        toast.success(editingId ? 'Prompt aktualisiert' : 'Prompt erstellt')
        resetForm()
        load()
      } else {
        toast.error(data?.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch (e) {
      toast.error('Fehler beim Speichern')
      logger.error('save custom prompt failed', e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Diesen Prompt wirklich löschen?')) return
    try {
      const res = await fetch(`/api/v1/custom-prompts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Prompt gelöscht')
        load()
      } else {
        toast.error('Löschen fehlgeschlagen')
      }
    } catch {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const generate = async () => {
    if (generateInput.trim().length < 10) {
      toast.error('Bitte mindestens 10 Zeichen beschreiben')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/v1/custom-prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: generateInput }),
      })
      const data = await res.json()
      if (data?.success && data.data) {
        setForm(prev => ({
          ...prev,
          name: data.data.name || prev.name,
          systemPrompt: data.data.systemPrompt || prev.systemPrompt,
          userPrompt: data.data.userPrompt || prev.userPrompt,
          contextConfig: {
            ...prev.contextConfig,
            ...(data.data.suggestedContext || {}),
          },
        }))
        toast.success('Prompt-Vorschlag übernommen — bitte prüfen und speichern')
        setShowGenerate(false)
        setGenerateInput('')
      } else {
        toast.error(data?.error?.message || 'Generierung fehlgeschlagen')
      }
    } catch (e) {
      toast.error('Generierung fehlgeschlagen')
      logger.error('generate custom prompt failed', e)
    } finally {
      setGenerating(false)
    }
  }

  const toggleContext = (key: keyof FormState['contextConfig']) => {
    setForm(prev => ({
      ...prev,
      contextConfig: { ...prev.contextConfig, [key]: !prev.contextConfig[key] },
    }))
  }

  const editing = editingId !== null || creating

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Eigene KI-Prompts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erstelle wiederverwendbare Prompts. Auf der Firmenseite unter &quot;KI-Aktionen&quot; ausführbar und aus Workflows aufrufbar.
          </p>
        </div>
        {!editing && (
          <Button onClick={() => { setCreating(true); setForm(EMPTY_FORM) }}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Prompt
          </Button>
        )}
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Prompt bearbeiten' : 'Neuer Prompt'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showGenerate ? (
              <Button variant="outline" size="sm" onClick={() => setShowGenerate(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                KI-Vorschlag aus Beschreibung
              </Button>
            ) : (
              <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                <Label>Was soll der Prompt tun?</Label>
                <Textarea
                  value={generateInput}
                  onChange={e => setGenerateInput(e.target.value)}
                  rows={3}
                  placeholder="z.B. Erstelle einen Aquise-Brief der auf die Branche und Größe der Firma eingeht und ein konkretes Produkt vorschlägt"
                />
                <div className="flex gap-2">
                  <Button onClick={generate} disabled={generating} size="sm">
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    Generieren
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowGenerate(false); setGenerateInput('') }}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp-name">Name *</Label>
                <Input id="cp-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-activity">Aktivitätstyp (Speicherung)</Label>
                <Select value={form.activityType} onValueChange={v => setForm({ ...form, activityType: v })}>
                  <SelectTrigger id="cp-activity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Notiz</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="call">Anruf</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-desc">Beschreibung (optional, wird als Tooltip angezeigt)</Label>
              <Input id="cp-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-sys">System-Prompt (Rolle/Regeln — optional)</Label>
              <Textarea id="cp-sys" rows={3} value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cp-user">Prompt-Text * <span className="text-muted-foreground font-normal">(Platzhalter unten verfügbar)</span></Label>
              <Textarea id="cp-user" rows={10} className="font-mono text-sm" value={form.userPrompt} onChange={e => setForm({ ...form, userPrompt: e.target.value })} />
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Verfügbare Platzhalter</summary>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1 pl-2">
                  {PLACEHOLDER_REFERENCE.map(p => (
                    <div key={p.key}><code className="bg-muted px-1 rounded">{p.key}</code> — {p.desc}</div>
                  ))}
                </div>
              </details>
            </div>

            <div className="space-y-2">
              <Label>Kontext einbinden</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {([
                  ['includeCompany', 'Firma (aktueller Kontext)'],
                  ['includePersons', 'Ansprechpartner'],
                  ['includeRecentActivities', 'Letzte Aktivitäten'],
                  ['includeResearch', 'KI-Recherche'],
                  ['includeOrganization', 'Eigene Organisation'],
                  ['includeProducts', 'Produkte / Leistungen'],
                  ['includeProcesses', 'Prozesse'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.contextConfig[key]} onCheckedChange={() => toggleContext(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="cp-active" checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: !!v })} />
              <Label htmlFor="cp-active" className="cursor-pointer">Aktiv (auf Firmenseite sichtbar)</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? 'Speichern' : 'Erstellen'}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!editing && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Laden...
              </div>
            ) : prompts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Noch keine eigenen Prompts angelegt.
              </div>
            ) : (
              <div className="divide-y">
                {prompts.map(p => (
                  <div key={p.id} className="p-4 flex items-start gap-4 hover:bg-muted/30">
                    <Sparkles className={`h-5 w-5 mt-0.5 text-${p.color || 'indigo'}-500`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.name}</div>
                        {!p.isActive && <Badge variant="secondary">Inaktiv</Badge>}
                        <Badge variant="outline">{p.activityType || 'note'}</Badge>
                      </div>
                      {p.description && <div className="text-sm text-muted-foreground mt-0.5">{p.description}</div>}
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">{p.userPrompt}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => beginEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
