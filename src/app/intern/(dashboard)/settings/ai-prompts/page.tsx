'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  FileText,
  Sparkles,
  Copy,
  Download,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface AiPromptTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  systemPrompt: string
  userPrompt: string
  outputFormat: string | null
  isActive: boolean
  isDefault: boolean
  version: number
  createdAt: string
  updatedAt: string
}

interface Placeholder {
  key: string
  label: string
  description: string
}

interface TemplateFormData {
  name: string
  description: string
  systemPrompt: string
  userPrompt: string
  outputFormat: string
  isActive: boolean
}

const slugLabels: Record<string, string> = {
  lead_research: 'Lead-Recherche',
  company_research: 'Firmen-Recherche',
  person_research: 'Personen-Recherche',
  quick_score: 'Schnell-Scoring',
}

const slugColors: Record<string, string> = {
  lead_research: 'bg-blue-500',
  company_research: 'bg-green-500',
  person_research: 'bg-purple-500',
  quick_score: 'bg-orange-500',
}

export default function AiPromptsPage() {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([])
  const [placeholders, setPlaceholders] = useState<Record<string, Placeholder[]>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AiPromptTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    systemPrompt: '',
    userPrompt: '',
    outputFormat: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/ai-prompt-templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data.templates)
        setPlaceholders(data.data.placeholders)
      }
    } catch (error) {
      logger.error('Failed to fetch templates', error, { module: 'SettingsAiPromptsPage' })
      toast.error('Fehler beim Laden der Prompt-Vorlagen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/v1/ai-prompt-templates/seed', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Standard-Vorlagen wurden erstellt')
        fetchTemplates()
      } else {
        throw new Error(data.error?.message || 'Fehler')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen der Standard-Vorlagen')
    } finally {
      setSeeding(false)
    }
  }

  const openEdit = (template: AiPromptTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      outputFormat: template.outputFormat || '',
      isActive: template.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingTemplate) return

    if (!formData.name.trim() || !formData.systemPrompt.trim() || !formData.userPrompt.trim()) {
      toast.error('Name, System-Prompt und User-Prompt sind erforderlich')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

      toast.success('Vorlage aktualisiert')
      setDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (id: string) => {
    setResettingId(id)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${id}`, {
        method: 'PATCH',
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Vorlage auf Standard zurückgesetzt')
        fetchTemplates()
        // Wenn der Dialog offen ist und wir dieses Template bearbeiten, aktualisieren
        if (editingTemplate?.id === id && data.data) {
          const t = data.data
          setFormData({
            name: t.name,
            description: t.description || '',
            systemPrompt: t.systemPrompt,
            userPrompt: t.userPrompt,
            outputFormat: t.outputFormat || '',
            isActive: t.isActive,
          })
        }
      } else {
        throw new Error(data.error?.message || 'Fehler')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Zurücksetzen')
    } finally {
      setResettingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${deletingId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Vorlage gelöscht')
        setDeleteDialogOpen(false)
        fetchTemplates()
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Fehler beim Löschen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const currentPlaceholders = editingTemplate ? (placeholders[editingTemplate.slug] || []) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">KI-Prompts</h1>
            <p className="text-muted-foreground">
              Verwalten Sie die Prompt-Vorlagen für die KI-Recherche
            </p>
          </div>
        </div>
        <Button onClick={handleSeed} disabled={seeding}>
          {seeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Standard-Vorlagen laden
        </Button>
      </div>

      {/* Template-Liste */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Keine Prompt-Vorlagen vorhanden</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Laden Sie die Standard-Vorlagen, um die KI-Recherche zu konfigurieren.
            </p>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Standard-Vorlagen laden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-lg">{template.name}</span>
                      <Badge className={slugColors[template.slug] || 'bg-gray-500'}>
                        {template.slug}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Standard
                        </Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="secondary">Deaktiviert</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>System-Prompt: {template.systemPrompt.length} Zeichen</span>
                      <span>User-Prompt: {template.userPrompt.length} Zeichen</span>
                      {template.outputFormat && (
                        <span>Format: {template.outputFormat.length} Zeichen</span>
                      )}
                      <span>
                        Aktualisiert: {new Date(template.updatedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(template.id)}
                    disabled={resettingId === template.id}
                    title="Auf Standard zurücksetzen"
                  >
                    {resettingId === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeletingId(template.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fullscreen Edit Overlay */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Fester Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b shrink-0 bg-background">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setDialogOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold">Vorlage bearbeiten</h2>
              {editingTemplate && (
                <Badge className={`${slugColors[editingTemplate.slug] || 'bg-gray-500'} text-sm px-3 py-1`}>
                  {editingTemplate.slug}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded h-4 w-4"
                />
                <span className="text-sm font-medium">Aktiv</span>
              </label>
              {editingTemplate && (
                <Button
                  variant="outline"
                  onClick={() => handleReset(editingTemplate.id)}
                  disabled={resettingId === editingTemplate.id}
                >
                  {resettingId === editingTemplate.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Zurücksetzen
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>

          {/* Scrollbarer Inhalt */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 p-8 max-w-[1800px] mx-auto w-full">
              {/* Linke Seite: Formular (3/4 Breite) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Name & Beschreibung in einer Zeile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Name" htmlFor="name" required>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="text-base"
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Beschreibung" htmlFor="description">
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Kurze Beschreibung der Vorlage"
                        className="text-base"
                      />
                    </FormField>
                  </div>
                </div>

                {/* System-Prompt */}
                <FormField label="System-Prompt (Rolle & Regeln)" htmlFor="systemPrompt" required>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData((p) => ({ ...p, systemPrompt: e.target.value }))}
                    placeholder="Du bist ein erfahrener..."
                    className="min-h-[200px] font-mono text-sm leading-relaxed resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Definiert die Rolle und Grundregeln der KI. Wird als separater System-Prompt gesendet.
                  </p>
                </FormField>

                {/* User-Prompt */}
                <FormField label="User-Prompt (Aufgabe mit Platzhaltern)" htmlFor="userPrompt" required>
                  <Textarea
                    id="userPrompt"
                    value={formData.userPrompt}
                    onChange={(e) => setFormData((p) => ({ ...p, userPrompt: e.target.value }))}
                    placeholder="Analysiere die folgenden Informationen: {{companyName}}..."
                    className="min-h-[280px] font-mono text-sm leading-relaxed resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Die eigentliche Aufgabe. Verwende {'{{platzhalter}}'} für dynamische Daten und {'{{#if key}}...{{/if}}'} für optionale Blöcke.
                  </p>
                </FormField>

                {/* Ausgabeformat */}
                <FormField label="Ausgabeformat (JSON-Schema)" htmlFor="outputFormat">
                  <Textarea
                    id="outputFormat"
                    value={formData.outputFormat}
                    onChange={(e) => setFormData((p) => ({ ...p, outputFormat: e.target.value }))}
                    placeholder='Antworte NUR mit dem folgenden JSON: { "key": "value" }'
                    className="min-h-[300px] font-mono text-sm leading-relaxed resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Das gewünschte Antwortformat. Wird an den User-Prompt angehängt.
                  </p>
                </FormField>
              </div>

              {/* Rechte Seite: Platzhalter-Referenz (1/4 Breite, sticky) */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-4 space-y-4">
                  {/* Platzhalter */}
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Verfügbare Platzhalter
                    </h3>
                    {currentPlaceholders.length > 0 ? (
                      <div className="space-y-2">
                        {currentPlaceholders.map((ph) => (
                          <button
                            key={ph.key}
                            onClick={() => copyPlaceholder(ph.key)}
                            className="w-full text-left rounded-md border bg-background px-3 py-2.5 hover:bg-accent transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <code className="text-xs font-mono text-blue-600 break-all">
                                {`{{${ph.key}}}`}
                              </code>
                              {copiedKey === ph.key ? (
                                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {ph.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Keine Platzhalter für diesen Typ definiert.
                      </p>
                    )}
                  </div>

                  {/* Syntax-Hilfe */}
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h3 className="font-semibold text-sm mb-2">Syntax-Hilfe</h3>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div>
                        <code className="text-blue-600">{'{{variable}}'}</code>
                        <span className="ml-1">&ndash; Wird durch den Wert ersetzt</span>
                      </div>
                      <div>
                        <code className="text-blue-600">{'{{#if var}}...{{/if}}'}</code>
                        <span className="ml-1">&ndash; Nur wenn Wert vorhanden</span>
                      </div>
                    </div>
                  </div>

                  {/* Tipps */}
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h3 className="font-semibold text-sm mb-2">Tipps</h3>
                    <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                      <li>System-Prompt: Rolle & Regeln</li>
                      <li>User-Prompt: Die eigentliche Aufgabe</li>
                      <li>Ausgabeformat: JSON-Struktur vorgeben</li>
                      <li>&quot;Nicht ermittelbar&quot; gegen Halluzination</li>
                      <li>Klick auf Platzhalter kopiert ihn</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Vorlage löschen"
        description="Möchten Sie diese Prompt-Vorlage wirklich löschen? Bei der nächsten Recherche wird die Standard-Vorlage verwendet."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
