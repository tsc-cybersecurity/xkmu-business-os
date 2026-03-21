'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, ConfirmDialog, EmptyState } from '@/components/shared'
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
  Search,
  Save,
  ChevronRight,
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

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  lead: { label: 'Leads', color: 'bg-blue-500' },
  company_research: { label: 'Firmen-Recherche', color: 'bg-green-500' },
  person: { label: 'Personen', color: 'bg-purple-500' },
  quick: { label: 'Quick Tools', color: 'bg-orange-500' },
  outreach: { label: 'Outreach', color: 'bg-cyan-500' },
  company_action: { label: 'Firmen-Aktionen', color: 'bg-indigo-500' },
  document: { label: 'Dokumente', color: 'bg-red-500' },
  cms: { label: 'CMS & Blog', color: 'bg-teal-500' },
  marketing: { label: 'Marketing', color: 'bg-amber-500' },
  social: { label: 'Social Media', color: 'bg-pink-500' },
  business: { label: 'Business Intelligence', color: 'bg-emerald-500' },
  n8n: { label: 'Workflows', color: 'bg-violet-500' },
  other: { label: 'Sonstige', color: 'bg-gray-500' },
}

function getCategoryKey(slug: string): string {
  if (slug.startsWith('company_first_') || slug.startsWith('company_follow_') ||
      slug.startsWith('company_appointment') || slug.startsWith('company_thank_') ||
      slug.startsWith('company_offer_') || slug.startsWith('company_cross_') ||
      slug.startsWith('company_upselling') || slug.startsWith('company_reactivation') ||
      slug.startsWith('company_swot') || slug.startsWith('company_competitor_') ||
      slug.startsWith('company_needs_') || slug.startsWith('company_development_') ||
      slug.startsWith('company_social_') || slug.startsWith('company_reference_') ||
      slug.startsWith('company_newsletter') || slug.startsWith('company_event_') ||
      slug.startsWith('company_meeting_') || slug.startsWith('company_call_') ||
      slug.startsWith('company_next_') || slug.startsWith('company_risk_'))
    return 'company_action'
  if (slug.startsWith('lead_')) return 'lead'
  if (slug === 'company_research') return 'company_research'
  if (slug.startsWith('person_')) return 'person'
  if (slug.startsWith('quick_')) return 'quick'
  if (slug.startsWith('outreach_')) return 'outreach'
  if (slug.startsWith('document_')) return 'document'
  if (slug.startsWith('cms_') || slug.startsWith('blog_')) return 'cms'
  if (slug.startsWith('marketing_')) return 'marketing'
  if (slug.startsWith('social_media_')) return 'social'
  if (slug.startsWith('business_')) return 'business'
  if (slug.startsWith('n8n_')) return 'n8n'
  return 'other'
}

export default function AiPromptsPage() {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([])
  const [placeholders, setPlaceholders] = useState<Record<string, Placeholder[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
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
  const [deleting, setDeleting] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId]
  )

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    )
  }, [templates, searchQuery])

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, AiPromptTemplate[]> = {}
    for (const t of filteredTemplates) {
      const key = getCategoryKey(t.slug)
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    return groups
  }, [filteredTemplates])

  const selectTemplate = (template: AiPromptTemplate) => {
    setSelectedId(template.id)
    setEditMode(false)
  }

  const openEdit = () => {
    if (!selectedTemplate) return
    setFormData({
      name: selectedTemplate.name,
      description: selectedTemplate.description || '',
      systemPrompt: selectedTemplate.systemPrompt,
      userPrompt: selectedTemplate.userPrompt,
      outputFormat: selectedTemplate.outputFormat || '',
      isActive: selectedTemplate.isActive,
    })
    setEditMode(true)
  }

  const handleSave = async () => {
    if (!selectedTemplate) return
    if (!formData.name.trim() || !formData.systemPrompt.trim() || !formData.userPrompt.trim()) {
      toast.error('Name, System-Prompt und User-Prompt sind erforderlich')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Fehler beim Speichern')

      toast.success('Vorlage aktualisiert')
      setEditMode(false)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/v1/ai-prompt-templates/seed', { method: 'POST' })
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

  const handleReset = async (id: string) => {
    setResettingId(id)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${id}`, { method: 'PATCH' })
      const data = await response.json()
      if (data.success) {
        toast.success('Vorlage auf Standard zurueckgesetzt')
        fetchTemplates()
        if (editMode && selectedTemplate?.id === id && data.data) {
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
    if (!selectedTemplate) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/ai-prompt-templates/${selectedTemplate.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Vorlage gelöscht')
        setDeleteDialogOpen(false)
        setSelectedId(null)
        setEditMode(false)
        fetchTemplates()
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

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const currentPlaceholders = selectedTemplate ? (placeholders[selectedTemplate.slug] || []) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
            <Link href="/intern/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">KI-Prompts</h1>
            <p className="text-sm text-muted-foreground">
              {templates.length} Vorlagen verwalten
            </p>
          </div>
        </div>
        <Button onClick={handleSeed} disabled={seeding} variant="outline">
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Standard-Vorlagen laden
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={FileText}
            title="Keine Prompt-Vorlagen vorhanden"
            description="Laden Sie die Standard-Vorlagen, um die KI-Funktionen zu konfigurieren."
            action={
              <Button onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Standard-Vorlagen laden
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ────── Linke Seite: Index ────── */}
          <div className="w-80 xl:w-96 border-r flex flex-col shrink-0">
            {/* Suche */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Template-Liste */}
            <div className="flex-1 overflow-y-auto">
              {Object.entries(groupedTemplates).map(([categoryKey, categoryTemplates]) => {
                const cat = CATEGORY_MAP[categoryKey] || CATEGORY_MAP.other
                return (
                  <div key={categoryKey}>
                    <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5 border-b">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cat.color}`} />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {cat.label}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                          {categoryTemplates.length}
                        </Badge>
                      </div>
                    </div>
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template)}
                        className={`w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-accent/50 ${
                          selectedId === template.id ? 'bg-accent border-l-2 border-l-primary' : ''
                        } ${!template.isActive ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{template.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] text-muted-foreground font-mono truncate">{template.slug}</code>
                          {!template.isActive && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-3.5">Inaktiv</Badge>}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ────── Rechte Seite: Details ────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedTemplate ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Prompt auswaehlen</p>
                  <p className="text-sm mt-1">Waehlen Sie links eine Vorlage aus</p>
                </div>
              </div>
            ) : editMode ? (
              /* ── Bearbeiten-Modus ── */
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold">Bearbeiten</h2>
                    <Badge variant="outline" className="font-mono text-xs">{selectedTemplate.slug}</Badge>
                    <label className="flex items-center gap-2 cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                        className="rounded h-4 w-4"
                      />
                      <span className="text-sm">Aktiv</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(selectedTemplate.id)}
                      disabled={resettingId === selectedTemplate.id}
                    >
                      {resettingId === selectedTemplate.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                      Zurücksetzen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Abbrechen
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                      Speichern
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-6">
                    <div className="xl:col-span-3 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label="Name" htmlFor="edit-name" required>
                          <Input id="edit-name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                        </FormField>
                        <div className="md:col-span-2">
                          <FormField label="Beschreibung" htmlFor="edit-desc">
                            <Input id="edit-desc" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Kurze Beschreibung" />
                          </FormField>
                        </div>
                      </div>
                      <FormField label="System-Prompt" htmlFor="edit-sys" required>
                        <Textarea id="edit-sys" value={formData.systemPrompt} onChange={(e) => setFormData((p) => ({ ...p, systemPrompt: e.target.value }))} className="min-h-[180px] font-mono text-sm leading-relaxed resize-y" />
                      </FormField>
                      <FormField label="User-Prompt" htmlFor="edit-user" required>
                        <Textarea id="edit-user" value={formData.userPrompt} onChange={(e) => setFormData((p) => ({ ...p, userPrompt: e.target.value }))} className="min-h-[240px] font-mono text-sm leading-relaxed resize-y" />
                      </FormField>
                      <FormField label="Ausgabeformat (JSON)" htmlFor="edit-format">
                        <Textarea id="edit-format" value={formData.outputFormat} onChange={(e) => setFormData((p) => ({ ...p, outputFormat: e.target.value }))} className="min-h-[160px] font-mono text-sm leading-relaxed resize-y" />
                      </FormField>
                    </div>
                    {/* Platzhalter-Sidebar */}
                    <div className="xl:col-span-1">
                      <PlaceholderPanel placeholders={currentPlaceholders} copiedKey={copiedKey} onCopy={copyPlaceholder} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ── Ansicht-Modus ── */
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                    {selectedTemplate.isDefault && <Badge variant="outline" className="text-blue-600 border-blue-600">Standard</Badge>}
                    {!selectedTemplate.isActive && <Badge variant="secondary">Deaktiviert</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleReset(selectedTemplate.id)} disabled={resettingId === selectedTemplate.id} aria-label="Zurücksetzen">
                      {resettingId === selectedTemplate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={openEdit}>
                      <Edit className="mr-1.5 h-3.5 w-3.5" />
                      Bearbeiten
                    </Button>
                    {!selectedTemplate.isDefault && (
                      <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Loeschen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline" className="font-mono">{selectedTemplate.slug}</Badge>
                    <span>Version {selectedTemplate.version}</span>
                    <span>Aktualisiert: {new Date(selectedTemplate.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {selectedTemplate.description && (
                    <p className="text-muted-foreground">{selectedTemplate.description}</p>
                  )}

                  {/* Platzhalter */}
                  {currentPlaceholders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Platzhalter</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {currentPlaceholders.map((ph) => (
                          <button key={ph.key} onClick={() => copyPlaceholder(ph.key)} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs font-mono hover:bg-accent transition-colors" title={ph.description}>
                            <code className="text-blue-600">{`{{${ph.key}}}`}</code>
                            {copiedKey === ph.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System-Prompt */}
                  <PromptSection title="System-Prompt" content={selectedTemplate.systemPrompt} chars={selectedTemplate.systemPrompt.length} />

                  {/* User-Prompt */}
                  <PromptSection title="User-Prompt" content={selectedTemplate.userPrompt} chars={selectedTemplate.userPrompt.length} />

                  {/* Ausgabeformat */}
                  {selectedTemplate.outputFormat && (
                    <PromptSection title="Ausgabeformat" content={selectedTemplate.outputFormat} chars={selectedTemplate.outputFormat.length} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Vorlage löschen"
        description="Möchten Sie diese Prompt-Vorlage wirklich löschen? Bei der nächsten Recherche wird die Standard-Vorlage verwendet."
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function PromptSection({ title, content, chars }: { title: string; content: string; chars: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{chars} Zeichen</span>
      </div>
      <Card>
        <CardContent className="py-3">
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-muted-foreground max-h-[400px] overflow-y-auto">{content}</pre>
        </CardContent>
      </Card>
    </div>
  )
}

function PlaceholderPanel({ placeholders, copiedKey, onCopy }: { placeholders: Placeholder[]; copiedKey: string | null; onCopy: (key: string) => void }) {
  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Platzhalter
        </h3>
        {placeholders.length > 0 ? (
          <div className="space-y-1.5">
            {placeholders.map((ph) => (
              <button key={ph.key} onClick={() => onCopy(ph.key)} className="w-full text-left rounded-md border bg-background px-2.5 py-2 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-blue-600 break-all">{`{{${ph.key}}}`}</code>
                  {copiedKey === ph.key ? <Check className="h-3 w-3 text-green-500 shrink-0" /> : <Copy className="h-3 w-3 text-muted-foreground shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{ph.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Keine Platzhalter definiert.</p>
        )}
      </div>
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold text-sm mb-2">Syntax</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div><code className="text-blue-600">{'{{variable}}'}</code> &ndash; Wert einsetzen</div>
          <div><code className="text-blue-600">{'{{#if var}}...{{/if}}'}</code> &ndash; Bedingt</div>
        </div>
      </div>
    </div>
  )
}
