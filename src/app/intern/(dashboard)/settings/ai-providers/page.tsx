'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Bot,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Star,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface AiProvider {
  id: string
  providerType: string
  name: string
  apiKey: string | null
  baseUrl: string | null
  model: string
  maxTokens: number
  temperature: string
  priority: number
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface ProviderFormData {
  providerType: string
  name: string
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  priority: number
  isActive: boolean
  isDefault: boolean
}

const providerTypes = [
  { value: 'ollama', label: 'Ollama (Lokal)', needsKey: false },
  { value: 'openrouter', label: 'OpenRouter', needsKey: true },
  { value: 'gemini', label: 'Google Gemini', needsKey: true },
  { value: 'openai', label: 'OpenAI', needsKey: true },
  { value: 'deepseek', label: 'Deepseek', needsKey: true },
  { value: 'kimi', label: 'Kimi (Moonshot)', needsKey: true },
  { value: 'firecrawl', label: 'Firecrawl (Web-Scraping)', needsKey: true },
  { value: 'kie', label: 'kie.ai (Video-Generierung)', needsKey: true },
]

const providerColors: Record<string, string> = {
  ollama: 'bg-green-500',
  openrouter: 'bg-purple-500',
  gemini: 'bg-blue-500',
  openai: 'bg-gray-700',
  deepseek: 'bg-teal-500',
  kimi: 'bg-orange-500',
  firecrawl: 'bg-amber-500',
  kie: 'bg-pink-500',
}

// Bekannte Modelle pro Provider-Typ
const providerModels: Record<string, Array<{ id: string; name: string; description: string }>> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Schnell & günstig (Empfohlen)' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Leichteste Variante, sehr günstig' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Leistungsstark, höhere Kosten' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Neueste Generation (Preview)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Neueste Pro-Version (Preview)' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Schnell & günstig (Empfohlen)' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Leistungsstark, multimodal' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Neueste Mini-Version' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Neueste Version' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'OpenAI, schnell & günstig' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI, leistungsstark' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Google, schnell' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google, leistungsstark' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic, ausgewogen' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Meta, Open Source' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', description: 'Mistral AI' },
    { id: 'deepseek/deepseek-chat-v3', name: 'Deepseek V3', description: 'Deepseek, günstig & leistungsstark' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'Deepseek V3', description: 'Schnell & günstig (Empfohlen)' },
    { id: 'deepseek-reasoner', name: 'Deepseek R1', description: 'Reasoning-Modell' },
  ],
  kimi: [
    { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K', description: '8K Kontext (Empfohlen)' },
    { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', description: '32K Kontext' },
    { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', description: '128K Kontext' },
  ],
  ollama: [
    { id: 'gemma3', name: 'Gemma 3', description: 'Google, leicht & schnell (Empfohlen)' },
    { id: 'llama3.3', name: 'Llama 3.3', description: 'Meta, vielseitig' },
    { id: 'mistral', name: 'Mistral', description: 'Mistral AI, schnell' },
    { id: 'qwen2.5', name: 'Qwen 2.5', description: 'Alibaba, mehrsprachig' },
    { id: 'phi4', name: 'Phi 4', description: 'Microsoft, kompakt' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'DeepSeek, Reasoning' },
  ],
}

const defaultModels: Record<string, string> = {
  ollama: 'gemma3',
  openrouter: 'openai/gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  kimi: 'moonshot-v1-8k',
}

const defaultBaseUrls: Record<string, string> = {
  ollama: 'http://ollama:11434',
  openrouter: '',
  gemini: '',
  openai: '',
  deepseek: '',
  kimi: '',
  firecrawl: '',
  kie: 'https://api.kie.ai',
}

const emptyForm: ProviderFormData = {
  providerType: 'openrouter',
  name: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  maxTokens: 1000,
  temperature: 0.7,
  priority: 0,
  isActive: true,
  isDefault: false,
}

export default function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ProviderFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/v1/ai-providers')
      const data = await response.json()
      if (data.success) {
        setProviders(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch providers', error, { module: 'SettingsAiProvidersPage' })
      toast.error('Fehler beim Laden der Integrations')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    setCheckingStatus(true)
    try {
      const response = await fetch('/api/v1/ai/status')
      const data = await response.json()
      if (data.success && data.data.providers) {
        const status: Record<string, boolean> = {}
        for (const p of data.data.providers) {
          if (p.id) status[p.id] = p.available
        }
        setProviderStatus(status)
      }
    } catch (error) {
      logger.error('Failed to check status', error, { module: 'SettingsAiProvidersPage' })
    } finally {
      setCheckingStatus(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (provider: AiProvider) => {
    setEditingId(provider.id)
    setFormData({
      providerType: provider.providerType,
      name: provider.name,
      apiKey: provider.apiKey || '',
      baseUrl: provider.baseUrl || '',
      model: provider.model,
      maxTokens: provider.maxTokens,
      temperature: parseFloat(provider.temperature || '0.7'),
      priority: provider.priority,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
    })
    setDialogOpen(true)
  }

  const handleTypeChange = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      providerType: type,
      model: type === 'firecrawl' ? 'firecrawl' : type === 'kie' ? 'kie-video' : (prev.model || defaultModels[type] || ''),
      baseUrl: prev.baseUrl || defaultBaseUrls[type] || '',
      name: prev.name || providerTypes.find((t) => t.value === type)?.label || '',
    }))
  }

  const isFirecrawl = formData.providerType === 'firecrawl'
  const isKie = formData.providerType === 'kie'
  const isNoModelProvider = isFirecrawl || isKie

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    if (!isNoModelProvider && !formData.model.trim()) {
      toast.error('Modell ist erforderlich')
      return
    }

    setSaving(true)
    try {
      const url = editingId
        ? `/api/v1/ai-providers/${editingId}`
        : '/api/v1/ai-providers'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

      toast.success(editingId ? 'Anbieter aktualisiert' : 'Anbieter erstellt')
      setDialogOpen(false)
      fetchProviders()
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
      const response = await fetch(`/api/v1/ai-providers/${deletingId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Anbieter gelöscht')
        setDeleteDialogOpen(false)
        fetchProviders()
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

  const needsApiKey = providerTypes.find(
    (t) => t.value === formData.providerType
  )?.needsKey

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
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre KI-Provider, Firecrawl und API-Schlüssel
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkStatus} disabled={checkingStatus}>
            {checkingStatus ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Status prüfen
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Anbieter hinzufügen
          </Button>
        </div>
      </div>

      {/* Provider-Liste */}
      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Keine Integrations konfiguriert</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Fügen Sie einen KI-Provider oder eine Integration hinzu.
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Ersten Anbieter hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((provider) => (
            <Card key={provider.id} className={!provider.isActive ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{provider.name}</span>
                      <Badge className={providerColors[provider.providerType] || 'bg-gray-500'}>
                        {provider.providerType}
                      </Badge>
                      {provider.isDefault && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          <Star className="h-3 w-3 mr-1" />
                          Standard
                        </Badge>
                      )}
                      {!provider.isActive && (
                        <Badge variant="secondary">Deaktiviert</Badge>
                      )}
                      {providerStatus[provider.id] !== undefined && (
                        providerStatus[provider.id] ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Erreichbar
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Nicht erreichbar
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {provider.providerType !== 'firecrawl' && (
                        <>
                          <span>Modell: <code className="bg-muted px-1 rounded">{provider.model}</code></span>
                          <span>Priorität: {provider.priority}</span>
                          <span>Max Tokens: {provider.maxTokens}</span>
                        </>
                      )}
                      {provider.providerType === 'firecrawl' && (
                        <span>Web-Scraping Integration</span>
                      )}
                      {provider.apiKey && (
                        <span>API-Key: <code className="bg-muted px-1 rounded">{provider.apiKey}</code></span>
                      )}
                      {provider.baseUrl && (
                        <span>URL: {provider.baseUrl}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(provider)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingId(provider.id)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Anbieter bearbeiten' : 'Neuen Anbieter hinzufügen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Anbieter-Typ" htmlFor="providerType" required>
              <Select
                value={formData.providerType}
                onValueChange={handleTypeChange}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Name" htmlFor="name" required>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="z.B. OpenRouter GPT-4o"
              />
            </FormField>

            {needsApiKey && (
              <FormField label="API-Schlüssel" htmlFor="apiKey" required>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData((p) => ({ ...p, apiKey: e.target.value }))}
                  placeholder={editingId ? '****' : 'sk-...'}
                />
                {editingId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Leer lassen, um den aktuellen Schlüssel beizubehalten
                  </p>
                )}
              </FormField>
            )}

            {formData.providerType === 'ollama' && (
              <FormField label="Base URL" htmlFor="baseUrl">
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, baseUrl: e.target.value }))}
                  placeholder="http://ollama:11434"
                />
              </FormField>
            )}

            {!isNoModelProvider && (
              <FormField label="Modell" htmlFor="model" required>
                {providerModels[formData.providerType] ? (
                  <div className="space-y-2">
                    <Select
                      value={providerModels[formData.providerType]?.some(m => m.id === formData.model) ? formData.model : '_custom'}
                      onValueChange={(v) => {
                        if (v !== '_custom') {
                          setFormData((p) => ({ ...p, model: v }))
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Modell auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {providerModels[formData.providerType]?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex flex-col">
                              <span>{m.name}</span>
                              <span className="text-xs text-muted-foreground">{m.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="_custom">Benutzerdefiniert...</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!providerModels[formData.providerType]?.some(m => m.id === formData.model)) && (
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                        placeholder={defaultModels[formData.providerType] || 'Modellname eingeben'}
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Modellname eingeben"
                  />
                )}
              </FormField>
            )}

            {isFirecrawl && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                Firecrawl wird als Web-Scraping-Integration verwendet. Wenn ein API-Key konfiguriert ist, wird Firecrawl automatisch für die Firmenrecherche genutzt.
              </p>
            )}

            {isKie && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                kie.ai wird für KI-Video-Generierung verwendet. API-Key von <a href="https://docs.kie.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">docs.kie.ai</a> eintragen. Videos können über die n8n-Workflow-Integration oder die API generiert werden.
              </p>
            )}

            {!isNoModelProvider && <div className="grid grid-cols-3 gap-4">
              <FormField label="Max Tokens" htmlFor="maxTokens">
                <Input
                  id="maxTokens"
                  type="number"
                  min="100"
                  max="100000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData((p) => ({ ...p, maxTokens: parseInt(e.target.value) || 1000 }))}
                />
              </FormField>

              <FormField label="Temperatur" htmlFor="temperature">
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData((p) => ({ ...p, temperature: parseFloat(e.target.value) || 0.7 }))}
                />
              </FormField>

              <FormField label="Priorität" htmlFor="priority">
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => setFormData((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Niedrig = höhere Priorität
                </p>
              </FormField>
            </div>}

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Aktiv</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Als Standard setzen</span>
              </label>
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
        title="Anbieter löschen"
        description="Möchten Sie diese Integration wirklich löschen? Dies kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
