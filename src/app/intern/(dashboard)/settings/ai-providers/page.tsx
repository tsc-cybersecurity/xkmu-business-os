'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField, ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Bot, CheckCircle, XCircle, ArrowLeft, Star, Loader2, Search, Save, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface AiProvider {
  id: string; providerType: string; name: string; apiKey: string | null; baseUrl: string | null
  model: string; maxTokens: number; temperature: string; priority: number
  isActive: boolean; isDefault: boolean; createdAt: string; updatedAt: string
}

interface ProviderFormData {
  providerType: string; name: string; apiKey: string; baseUrl: string; model: string
  maxTokens: number; temperature: number; priority: number; isActive: boolean; isDefault: boolean
}

const providerTypes = [
  { value: 'ollama', label: 'Ollama (Lokal)', needsKey: false },
  { value: 'openrouter', label: 'OpenRouter', needsKey: true },
  { value: 'gemini', label: 'Google Gemini', needsKey: true },
  { value: 'openai', label: 'OpenAI', needsKey: true },
  { value: 'deepseek', label: 'Deepseek', needsKey: true },
  { value: 'kimi', label: 'Kimi (Moonshot)', needsKey: true },
  { value: 'firecrawl', label: 'Firecrawl (Web-Scraping)', needsKey: true },
  { value: 'kie', label: 'kie.ai (Video)', needsKey: true },
  { value: 'serpapi', label: 'SerpAPI (Google Maps)', needsKey: true },
  { value: 'linkedin', label: 'LinkedIn', needsKey: true },
  { value: 'twitter', label: 'Twitter/X', needsKey: true },
  { value: 'facebook', label: 'Facebook', needsKey: true },
  { value: 'instagram', label: 'Instagram', needsKey: true },
]

const providerColors: Record<string, string> = {
  ollama: 'bg-green-500', openrouter: 'bg-purple-500', gemini: 'bg-blue-500',
  openai: 'bg-gray-700', deepseek: 'bg-teal-500', kimi: 'bg-orange-500',
  firecrawl: 'bg-amber-500', kie: 'bg-pink-500', serpapi: 'bg-lime-500',
  linkedin: 'bg-blue-600', twitter: 'bg-sky-500', facebook: 'bg-blue-700', instagram: 'bg-fuchsia-500',
}

const providerModels: Record<string, Array<{ id: string; name: string }>> = {
  gemini: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }, { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }, { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }],
  openai: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4o', name: 'GPT-4o' }, { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' }, { id: 'gpt-4.1', name: 'GPT-4.1' }],
  openrouter: [{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'openai/gpt-4o', name: 'GPT-4o' }, { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' }, { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' }, { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' }, { id: 'deepseek/deepseek-chat-v3', name: 'Deepseek V3' }],
  deepseek: [{ id: 'deepseek-chat', name: 'Deepseek V3' }, { id: 'deepseek-reasoner', name: 'Deepseek R1' }],
  kimi: [{ id: 'moonshot-v1-8k', name: 'Moonshot 8K' }, { id: 'moonshot-v1-32k', name: 'Moonshot 32K' }],
  ollama: [{ id: 'gemma3', name: 'Gemma 3' }, { id: 'llama3.3', name: 'Llama 3.3' }, { id: 'mistral', name: 'Mistral' }],
}

const defaultModels: Record<string, string> = { ollama: 'gemma3', openrouter: 'openai/gpt-4o-mini', gemini: 'gemini-2.5-flash', openai: 'gpt-4o-mini', deepseek: 'deepseek-chat', kimi: 'moonshot-v1-8k' }
const emptyForm: ProviderFormData = { providerType: 'openrouter', name: '', apiKey: '', baseUrl: '', model: '', maxTokens: 1000, temperature: 0.7, priority: 0, isActive: true, isDefault: false }
const noModelTypes = new Set(['firecrawl', 'kie', 'serpapi', 'linkedin', 'twitter', 'facebook', 'instagram'])

export default function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AiProvider | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<ProviderFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchProviders() }, [])

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/v1/ai-providers')
      const data = await res.json()
      if (data.success) setProviders(data.data)
    } catch (e) { logger.error('Fetch providers', e, { module: 'AiProviders' }) }
    finally { setLoading(false) }
  }

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/v1/ai/status')
      const data = await res.json()
      if (data.success && data.data.providers) {
        const s: Record<string, boolean> = {}
        for (const p of data.data.providers) { if (p.id) s[p.id] = p.available }
        setProviderStatus(s)
        toast.success('Status geprueft')
      }
    } catch (e) { logger.error('Check status', e, { module: 'AiProviders' }) }
  }

  const selectProvider = (p: AiProvider) => { setSelected(p); setEditMode(false); setCreating(false) }

  const startEdit = () => {
    if (!selected) return
    setFormData({ providerType: selected.providerType, name: selected.name, apiKey: '', baseUrl: selected.baseUrl || '', model: selected.model, maxTokens: selected.maxTokens, temperature: parseFloat(selected.temperature || '0.7'), priority: selected.priority, isActive: selected.isActive, isDefault: selected.isDefault })
    setEditMode(true)
  }

  const startCreate = () => { setCreating(true); setEditMode(false); setSelected(null); setFormData(emptyForm) }

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, providerType: type, model: noModelTypes.has(type) ? type : (defaultModels[type] || prev.model), name: prev.name || providerTypes.find(t => t.value === type)?.label || '' }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Name erforderlich'); return }
    setSaving(true)
    try {
      const url = creating ? '/api/v1/ai-providers' : `/api/v1/ai-providers/${selected?.id}`
      const res = await fetch(url, { method: creating ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Fehler')
      toast.success(creating ? 'Erstellt' : 'Gespeichert')
      setEditMode(false); setCreating(false); fetchProviders()
      if (data.data) setSelected(data.data)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Fehler') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/ai-providers/${selected.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Geloescht'); setSelected(null); fetchProviders() }
      else throw new Error('Fehler')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Fehler') }
    finally { setDeleting(false); setDeleteOpen(false) }
  }

  const filtered = providers.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.providerType.includes(searchQuery.toLowerCase()))
  const needsKey = providerTypes.find(t => t.value === formData.providerType)?.needsKey
  const isNoModel = noModelTypes.has(formData.providerType)
  const showForm = editMode || creating

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/intern/settings"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div><h1 className="text-2xl font-bold">Integrations</h1><p className="text-sm text-muted-foreground">{providers.length} Provider</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkStatus}><CheckCircle className="h-4 w-4 mr-1" />Status</Button>
          <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" />Neu</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Links: Liste */}
        <div className="w-80 xl:w-96 border-r flex flex-col shrink-0">
          <div className="p-3 border-b">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Suchen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" /></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.id} onClick={() => selectProvider(p)} className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-center justify-between ${selected?.id === p.id ? 'bg-muted' : ''} ${!p.isActive ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium truncate">{p.name}</span>{p.isDefault && <Star className="h-3 w-3 text-yellow-500 shrink-0" />}{providerStatus[p.id] === true && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}{providerStatus[p.id] === false && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}</div>
                  <div className="flex items-center gap-2 mt-0.5"><Badge className={`text-[10px] px-1.5 py-0 ${providerColors[p.providerType] || 'bg-gray-500'}`}>{p.providerType}</Badge>{!noModelTypes.has(p.providerType) && <span className="text-xs text-muted-foreground truncate">{p.model}</span>}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Rechts: Detail / Edit */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected && !creating ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><Bot className="h-12 w-12 mb-4" /><p>Provider auswaehlen oder neuen erstellen</p></div>
          ) : showForm ? (
            <div className="max-w-xl space-y-4">
              <h2 className="text-xl font-bold">{creating ? 'Neuen Provider erstellen' : `${selected?.name} bearbeiten`}</h2>
              <FormField label="Anbieter-Typ" required><Select value={formData.providerType} onValueChange={handleTypeChange} disabled={!!selected && editMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providerTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></FormField>
              <FormField label="Name" required><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></FormField>
              {needsKey && <FormField label="API-Schluessel" required><Input type="password" value={formData.apiKey} onChange={e => setFormData(p => ({ ...p, apiKey: e.target.value }))} placeholder={editMode ? 'Leer = beibehalten' : 'sk-...'} /></FormField>}
              {(formData.providerType === 'ollama' || formData.providerType === 'kie') && <FormField label="Base URL"><Input value={formData.baseUrl} onChange={e => setFormData(p => ({ ...p, baseUrl: e.target.value }))} /></FormField>}
              {!isNoModel && <FormField label="Modell" required>{providerModels[formData.providerType] ? <Select value={providerModels[formData.providerType]?.some(m => m.id === formData.model) ? formData.model : '_custom'} onValueChange={v => { if (v !== '_custom') setFormData(p => ({ ...p, model: v })) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providerModels[formData.providerType]?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}<SelectItem value="_custom">Benutzerdefiniert</SelectItem></SelectContent></Select> : <Input value={formData.model} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} />}</FormField>}
              {!isNoModel && <div className="grid grid-cols-3 gap-4"><FormField label="Max Tokens"><Input type="number" value={formData.maxTokens} onChange={e => setFormData(p => ({ ...p, maxTokens: parseInt(e.target.value) || 1000 }))} /></FormField><FormField label="Temperatur"><Input type="number" min={0} max={2} step={0.1} value={formData.temperature} onChange={e => setFormData(p => ({ ...p, temperature: parseFloat(e.target.value) || 0.7 }))} /></FormField><FormField label="Prioritaet"><Input type="number" min={0} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} /></FormField></div>}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="rounded" /><span className="text-sm">Aktiv</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isDefault} onChange={e => setFormData(p => ({ ...p, isDefault: e.target.checked }))} className="rounded" /><span className="text-sm">Standard</span></label>
              </div>
              <div className="flex gap-2 pt-4"><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}{creating ? 'Erstellen' : 'Speichern'}</Button><Button variant="outline" onClick={() => { setEditMode(false); setCreating(false) }}>Abbrechen</Button></div>
            </div>
          ) : selected && (
            <div className="max-w-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 flex-wrap"><h2 className="text-xl font-bold">{selected.name}</h2><Badge className={providerColors[selected.providerType] || 'bg-gray-500'}>{selected.providerType}</Badge>{selected.isDefault && <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Star className="h-3 w-3 mr-1" />Standard</Badge>}{!selected.isActive && <Badge variant="secondary">Deaktiviert</Badge>}{providerStatus[selected.id] === true && <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Erreichbar</Badge>}{providerStatus[selected.id] === false && <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Nicht erreichbar</Badge>}</div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={startEdit}><Edit className="h-4 w-4 mr-1" />Bearbeiten</Button><Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button></div>
              </div>
              <Card><CardContent className="pt-6 space-y-3">
                {!noModelTypes.has(selected.providerType) && (<><div className="flex justify-between text-sm"><span className="text-muted-foreground">Modell</span><code className="bg-muted px-2 rounded">{selected.model}</code></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Max Tokens</span><span>{selected.maxTokens}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Temperatur</span><span>{selected.temperature}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Prioritaet</span><span>{selected.priority}</span></div></>)}
                {selected.apiKey && <div className="flex justify-between text-sm"><span className="text-muted-foreground">API-Key</span><code className="bg-muted px-2 rounded text-xs">{selected.apiKey.substring(0, 8)}...{selected.apiKey.slice(-4)}</code></div>}
                {selected.baseUrl && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base URL</span><span className="text-xs">{selected.baseUrl}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Erstellt</span><span>{new Date(selected.createdAt).toLocaleDateString('de-DE')}</span></div>
              </CardContent></Card>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Provider loeschen" description="Wirklich loeschen?" confirmLabel="Loeschen" variant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}
