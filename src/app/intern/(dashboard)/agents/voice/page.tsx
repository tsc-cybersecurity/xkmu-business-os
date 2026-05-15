'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Loader2, RefreshCw, Play, Square, Phone, Save, Settings2, MessageSquareText,
  PhoneOutgoing, AlertTriangle, CheckCircle2, XCircle, CircleSlash, CircleDashed,
  FileText, Plus, Pencil, Trash2, History, ExternalLink, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { normalizeToE164 } from '@/lib/utils/phone'

type AgentKey = 'simple-latency' | 'appointment-booking' | 'outbound-telephony' | 'inbound-receptionist'
type AgentState = 'running' | 'stopped' | 'starting' | 'missing' | 'failed'

const AGENT_LABELS: Record<AgentKey, string> = {
  'simple-latency':       'Agent 01 — Simple Latency (Speech-to-Speech)',
  'appointment-booking':  'Agent 02 — Termin-Assistent',
  'outbound-telephony':   'Agent 03 — Outbound-Telefonie',
  'inbound-receptionist': 'Agent 04 — Inbound Empfangsdienst',
}

const AGENT_KEYS: AgentKey[] = [
  'simple-latency',
  'appointment-booking',
  'outbound-telephony',
  'inbound-receptionist',
]

// Use-Case-Vorlagen werden ab jetzt aus der DB geladen (Tabelle
// voice_prompt_templates). Default-Pseudo-Eintrag bleibt clientseitig —
// signalisiert "Server-Default-Prompt nehmen, kein Override".
interface VoiceTemplate {
  id: string
  agentKey: string
  slug: string
  name: string
  description: string | null
  category: string | null
  systemPrompt: string
  greeting: string
  isActive: boolean
  sortOrder: number
}

const DEFAULT_TEMPLATE_OPTION = {
  id: '__default__',
  slug: '__default__',
  name: 'Default-Prompt (vom Server)',
  category: null as string | null,
  systemPrompt: '',
  greeting: '',
}

// Persistierte Calls (Webhook von voice.xkmu.de).
interface VoiceCallRow {
  id: string
  roomName: string
  agentKey: string
  direction: string
  phone: string | null
  callerName: string | null
  contextText: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  status: string
  summary: string | null
  recordingUrl: string | null
  twilioCallSid: string | null
}

interface VoiceCallMessageRow {
  id: string
  ts: string
  role: string
  text: string
}

// Field-Spec aus dem Voice-API-Schema. Wir rendern dynamisch — keine harten
// Listen von Voices/Modellen, damit serverseitige Erweiterungen automatisch
// in der UI auftauchen.
type FieldSpec =
  | { kind: 'enum'; values: string[] }
  | { kind: 'float'; min: number; max: number; nullable?: boolean }
  | { kind: 'bool' }

interface SettingsAgent {
  key: string
  label: string
  fields: Record<string, FieldSpec>
  defaults: Record<string, unknown>
  settings: Record<string, unknown>
}

interface PromptAgent {
  key: string
  label: string
  placeholders: string[]
  prompt: { system_prompt: string; greeting: string }
}

interface StatusResponse {
  agents: Record<string, AgentState>
  phoneNumber: string | null
}

function StateBadge({ state }: { state: AgentState | undefined }) {
  if (!state) return <Badge variant="secondary">unbekannt</Badge>
  const map: Record<AgentState, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    running:  { label: 'läuft',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900', Icon: CheckCircle2 },
    stopped:  { label: 'gestoppt',  cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700', Icon: CircleSlash },
    starting: { label: 'startet …', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900', Icon: CircleDashed },
    missing:  { label: 'nicht gebaut', cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900', Icon: AlertTriangle },
    failed:   { label: 'Fehler',    cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900', Icon: XCircle },
  }
  const { label, cls, Icon } = map[state]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export default function VoiceAgentsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // ─── Status / Container ───
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [actingOn, setActingOn] = useState<AgentKey | null>(null)

  // ─── Settings ───
  const [settingsAgents, setSettingsAgents] = useState<SettingsAgent[] | null>(null)
  const [settingsAgentKey, setSettingsAgentKey] = useState<string>('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // ─── Prompts ───
  const [promptAgents, setPromptAgents] = useState<PromptAgent[] | null>(null)
  const [promptAgentKey, setPromptAgentKey] = useState<string>('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptSaving, setPromptSaving] = useState(false)

  // ─── Outbound-Call ───
  const [outName, setOutName] = useState('')
  const [outPhone, setOutPhone] = useState('')
  const [outContext, setOutContext] = useState('')
  const [outUseCase, setOutUseCase] = useState<string>(DEFAULT_TEMPLATE_OPTION.slug)
  const [outSystemOverride, setOutSystemOverride] = useState('')
  const [outGreetingOverride, setOutGreetingOverride] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [lastCall, setLastCall] = useState<{ roomName: string; status: string } | null>(null)

  // ─── Voice-Prompt-Templates (DB) ───
  const [voiceTemplates, setVoiceTemplates] = useState<VoiceTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<VoiceTemplate | null>(null)
  const [templateSaving, setTemplateSaving] = useState(false)

  // ─── Voice-Calls (Webhook-Persistierung) ───
  const [calls, setCalls] = useState<VoiceCallRow[]>([])
  const [callsLoading, setCallsLoading] = useState(false)
  const [callsLoaded, setCallsLoaded] = useState(false)
  const [callDetailOpen, setCallDetailOpen] = useState(false)
  const [activeCall, setActiveCall] = useState<VoiceCallRow | null>(null)
  const [activeMessages, setActiveMessages] = useState<VoiceCallMessageRow[]>([])
  const [activeLoading, setActiveLoading] = useState(false)

  // ────────────────────────────────────────────────────────
  // Status-Polling alle 5 s — gibt schnelles Feedback nach
  // Start/Stop, ohne den Voice-Server zu fluten.
  // ────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setStatusLoading(true)
    try {
      const res = await fetch('/api/v1/voice-agent/status')
      const data = await res.json()
      if (data.success) {
        setStatus(data.data)
        setConfigured(true)
      } else {
        if (data.error?.code === 'NOT_CONFIGURED') {
          setConfigured(false)
          setConfigError(data.error.message)
        } else {
          setConfigError(data.error?.message ?? 'Fehler')
        }
      }
    } catch (error) {
      logger.error('Voice status fetch failed', error, { module: 'VoiceAgents' })
    } finally {
      if (!silent) setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(true), 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleStart = async (name: AgentKey) => {
    setActingOn(name)
    try {
      const res = await fetch('/api/v1/voice-agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!data.success) toast.error(data.error?.message ?? 'Start fehlgeschlagen')
      else toast.success(`${AGENT_LABELS[name]}: ${data.data.status}`)
      fetchStatus()
    } finally {
      setActingOn(null)
    }
  }

  const handleStop = async (name: AgentKey) => {
    setActingOn(name)
    try {
      const res = await fetch('/api/v1/voice-agent/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!data.success) toast.error(data.error?.message ?? 'Stop fehlgeschlagen')
      else toast.success(`${AGENT_LABELS[name]}: ${data.data.status}`)
      fetchStatus()
    } finally {
      setActingOn(null)
    }
  }

  // ────────────────────────────────────────────────────────
  // Settings — Lazy-Load beim Tab-Wechsel
  // ────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/v1/voice-agent/settings')
      const data = await res.json()
      if (data.success) {
        setSettingsAgents(data.data.agents)
        if (!settingsAgentKey && data.data.agents?.[0]) {
          setSettingsAgentKey(data.data.agents[0].key)
        }
      } else if (data.error?.code !== 'NOT_CONFIGURED') {
        toast.error(data.error?.message ?? 'Fehler beim Laden der Settings')
      }
    } catch (error) {
      logger.error('Voice settings fetch failed', error, { module: 'VoiceAgents' })
    } finally {
      setSettingsLoading(false)
    }
  }, [settingsAgentKey])

  const updateSetting = (field: string, value: unknown) => {
    setSettingsAgents((prev) =>
      prev?.map((a) =>
        a.key === settingsAgentKey
          ? { ...a, settings: { ...a.settings, [field]: value } }
          : a
      ) ?? prev
    )
  }

  const handleSaveSettings = async () => {
    const agent = settingsAgents?.find((a) => a.key === settingsAgentKey)
    if (!agent) return
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/v1/voice-agent/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: agent.key, settings: agent.settings }),
      })
      const data = await res.json()
      if (!data.success) toast.error(data.error?.message ?? 'Speichern fehlgeschlagen')
      else {
        toast.success('Settings gespeichert')
        // Server gibt das gemergte Objekt zurueck — Local State angleichen.
        setSettingsAgents((prev) =>
          prev?.map((a) => (a.key === agent.key ? { ...a, settings: data.data.settings } : a)) ?? prev
        )
      }
    } finally {
      setSettingsSaving(false)
    }
  }

  // ────────────────────────────────────────────────────────
  // Prompts — Lazy-Load beim Tab-Wechsel
  // ────────────────────────────────────────────────────────
  const fetchPrompts = useCallback(async () => {
    setPromptLoading(true)
    try {
      const res = await fetch('/api/v1/voice-agent/prompts')
      const data = await res.json()
      if (data.success) {
        setPromptAgents(data.data.agents)
        if (!promptAgentKey && data.data.agents?.[0]) {
          setPromptAgentKey(data.data.agents[0].key)
        }
      } else if (data.error?.code !== 'NOT_CONFIGURED') {
        toast.error(data.error?.message ?? 'Fehler beim Laden der Prompts')
      }
    } catch (error) {
      logger.error('Voice prompts fetch failed', error, { module: 'VoiceAgents' })
    } finally {
      setPromptLoading(false)
    }
  }, [promptAgentKey])

  const updatePromptField = (field: 'system_prompt' | 'greeting', value: string) => {
    setPromptAgents((prev) =>
      prev?.map((a) =>
        a.key === promptAgentKey ? { ...a, prompt: { ...a.prompt, [field]: value } } : a
      ) ?? prev
    )
  }

  const handleSavePrompt = async () => {
    const agent = promptAgents?.find((a) => a.key === promptAgentKey)
    if (!agent) return
    setPromptSaving(true)
    try {
      const res = await fetch('/api/v1/voice-agent/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: agent.key,
          system_prompt: agent.prompt.system_prompt,
          greeting: agent.prompt.greeting,
        }),
      })
      const data = await res.json()
      if (!data.success) toast.error(data.error?.message ?? 'Speichern fehlgeschlagen')
      else toast.success('Prompt gespeichert — wirksam beim naechsten Call')
    } finally {
      setPromptSaving(false)
    }
  }

  // ────────────────────────────────────────────────────────
  // Voice-Prompt-Templates (DB) — laden + verwalten
  // ────────────────────────────────────────────────────────
  const fetchVoiceTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const res = await fetch(
        '/api/v1/voice-prompt-templates?agentKey=outbound-telephony&onlyActive=true'
      )
      const data = await res.json()
      if (data.success) setVoiceTemplates(data.data)
    } catch (error) {
      logger.error('Voice templates fetch failed', error, { module: 'VoiceAgents' })
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVoiceTemplates()
  }, [fetchVoiceTemplates])

  const applyTemplate = (slug: string) => {
    setOutUseCase(slug)
    if (slug === DEFAULT_TEMPLATE_OPTION.slug) {
      setOutSystemOverride('')
      setOutGreetingOverride('')
      return
    }
    const tpl = voiceTemplates.find((t) => t.slug === slug)
    if (tpl) {
      setOutSystemOverride(tpl.systemPrompt)
      setOutGreetingOverride(tpl.greeting)
    }
  }

  const openNewTemplate = () => {
    setEditingTemplate({
      id: '',
      agentKey: 'outbound-telephony',
      slug: '',
      name: '',
      description: null,
      category: null,
      systemPrompt: '',
      greeting: '',
      isActive: true,
      sortOrder: 0,
    } as VoiceTemplate)
    setTemplateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return
    const isUpdate = !!editingTemplate.id
    setTemplateSaving(true)
    try {
      const payload = {
        agentKey: editingTemplate.agentKey,
        slug: editingTemplate.slug,
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        systemPrompt: editingTemplate.systemPrompt,
        greeting: editingTemplate.greeting,
        isActive: editingTemplate.isActive,
        sortOrder: editingTemplate.sortOrder,
      }
      const url = isUpdate
        ? `/api/v1/voice-prompt-templates/${editingTemplate.id}`
        : '/api/v1/voice-prompt-templates'
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success(isUpdate ? 'Vorlage aktualisiert' : 'Vorlage angelegt')
      setTemplateDialogOpen(false)
      setEditingTemplate(null)
      fetchVoiceTemplates()
    } finally {
      setTemplateSaving(false)
    }
  }

  const handleDeleteTemplate = async (tpl: VoiceTemplate) => {
    if (!confirm(`Vorlage "${tpl.name}" wirklich loeschen?`)) return
    await fetch(`/api/v1/voice-prompt-templates/${tpl.id}`, { method: 'DELETE' })
    fetchVoiceTemplates()
  }

  // ────────────────────────────────────────────────────────
  // Voice-Calls (Webhook-Persistierung)
  // ────────────────────────────────────────────────────────
  const fetchCalls = useCallback(async () => {
    setCallsLoading(true)
    try {
      const res = await fetch('/api/v1/voice-calls?limit=100')
      const data = await res.json()
      if (data.success) setCalls(data.data)
    } catch (error) {
      logger.error('Voice calls fetch failed', error, { module: 'VoiceAgents' })
    } finally {
      setCallsLoading(false)
      setCallsLoaded(true)
    }
  }, [])

  const openCallDetail = async (call: VoiceCallRow) => {
    setActiveCall(call)
    setActiveMessages([])
    setCallDetailOpen(true)
    setActiveLoading(true)
    try {
      const res = await fetch(`/api/v1/voice-calls/${call.id}`)
      const data = await res.json()
      if (data.success) {
        setActiveCall(data.data.call)
        setActiveMessages(data.data.messages)
      }
    } finally {
      setActiveLoading(false)
    }
  }

  const handleDeleteCall = async (call: VoiceCallRow) => {
    if (!confirm(`Anruf "${call.callerName ?? call.phone ?? call.roomName}" wirklich loeschen?`)) return
    await fetch(`/api/v1/voice-calls/${call.id}`, { method: 'DELETE' })
    fetchCalls()
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDuration = (sec: number | null) => {
    if (sec === null || sec === undefined) return '—'
    if (sec < 60) return `${sec}s`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }

  // ────────────────────────────────────────────────────────
  // Outbound-Call dispatch
  // ────────────────────────────────────────────────────────
  const handleDispatch = async () => {
    if (!outName.trim() || !outPhone.trim()) {
      toast.error('Name und Telefonnummer sind erforderlich.')
      return
    }
    // Eingaben wie "0172 …" oder "+49 (0) 172 …" zu E.164 normalisieren —
    // das Voice-API akzeptiert ausschliesslich +<countryCode><nummer>.
    const normalizedPhone = normalizeToE164(outPhone)
    if (!normalizedPhone) {
      toast.error('Telefonnummer ungueltig — bitte als 0172… oder +49172… eingeben.')
      return
    }
    setDispatching(true)
    setLastCall(null)
    try {
      const res = await fetch('/api/v1/voice-agent/dispatch-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: outName.trim(),
          phone: normalizedPhone,
          context: outContext.trim() || undefined,
          system_prompt_override: outSystemOverride.trim() || undefined,
          greeting_override: outGreetingOverride.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Dispatch fehlgeschlagen')
      } else {
        toast.success('Call angestoßen')
        setLastCall(data.data)
      }
    } finally {
      setDispatching(false)
    }
  }

  const settingsAgent = settingsAgents?.find((a) => a.key === settingsAgentKey)
  const promptAgent = promptAgents?.find((a) => a.key === promptAgentKey)

  // ────────────────────────────────────────────────────────
  // Konfigurationshinweis wenn kein Voice-Provider gepflegt
  // ────────────────────────────────────────────────────────
  if (configured === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Voice-Agents</h1>
          <p className="text-sm text-muted-foreground">Steuerung von voice.xkmu.de</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <div>
              <p className="font-medium">Voice-Provider nicht konfiguriert</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {configError ?? 'Kein aktiver Provider mit Typ "voice" vorhanden.'}
              </p>
            </div>
            <Link href="/intern/settings/ai-providers">
              <Button>
                <Settings2 className="h-4 w-4 mr-2" />
                Voice-Provider anlegen
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              Provider-Typ: <code className="bg-muted px-1 rounded">voice</code> · Base-URL: <code className="bg-muted px-1 rounded">https://voice.xkmu.de</code> · API-Key: ADMIN_API_KEY
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Voice-Agents</h1>
          <p className="text-sm text-muted-foreground">
            Steuerung von voice.xkmu.de · Telefonnummer:{' '}
            {status?.phoneNumber ? (
              <code className="bg-muted px-1 rounded">{status.phoneNumber}</code>
            ) : (
              <span className="opacity-50">—</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchStatus()} disabled={statusLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === 'settings' && !settingsAgents) fetchSettings()
          if (v === 'prompts' && !promptAgents) fetchPrompts()
          if (v === 'calls' && !callsLoaded) fetchCalls()
        }}
      >
        <TabsList>
          <TabsTrigger value="overview"><Phone className="h-4 w-4 mr-2" />Uebersicht</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          <TabsTrigger value="prompts"><MessageSquareText className="h-4 w-4 mr-2" />Prompts</TabsTrigger>
          <TabsTrigger value="outbound"><PhoneOutgoing className="h-4 w-4 mr-2" />Outbound-Anruf</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Vorlagen</TabsTrigger>
          <TabsTrigger value="calls"><History className="h-4 w-4 mr-2" />Anrufe</TabsTrigger>
        </TabsList>

        {/* ─── Uebersicht ─── */}
        <TabsContent value="overview" className="space-y-3">
          {AGENT_KEYS.map((key) => {
            const state = status?.agents[key]
            const isRunning = state === 'running' || state === 'starting'
            const canAct = !!status && state !== undefined && state !== 'missing'
            return (
              <Card key={key}>
                <CardContent className="py-4 px-5 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{AGENT_LABELS[key]}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{key}</div>
                  </div>
                  <StateBadge state={state} />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canAct || isRunning || actingOn === key}
                      onClick={() => handleStart(key)}
                    >
                      {actingOn === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">Start</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canAct || !isRunning || actingOn === key}
                      onClick={() => handleStop(key)}
                    >
                      {actingOn === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">Stop</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* ─── Settings ─── */}
        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Agent</Label>
            <Select value={settingsAgentKey} onValueChange={setSettingsAgentKey}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Agent waehlen" /></SelectTrigger>
              <SelectContent>
                {(settingsAgents ?? []).map((a) => (
                  <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSettings}
              disabled={settingsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${settingsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {settingsLoading && !settingsAgents ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : settingsAgent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{settingsAgent.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settingsAgent.fields).map(([fieldName, spec]) => (
                  <SettingsField
                    key={fieldName}
                    name={fieldName}
                    spec={spec}
                    value={settingsAgent.settings[fieldName]}
                    defaultValue={settingsAgent.defaults[fieldName]}
                    onChange={(v) => updateSetting(fieldName, v)}
                  />
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Keine Settings geladen. Auf „Aktualisieren" klicken.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Prompts ─── */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Agent</Label>
            <Select value={promptAgentKey} onValueChange={setPromptAgentKey}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Agent waehlen" /></SelectTrigger>
              <SelectContent>
                {(promptAgents ?? []).map((a) => (
                  <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={fetchPrompts} disabled={promptLoading}>
              <RefreshCw className={`h-4 w-4 ${promptLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {promptLoading && !promptAgents ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : promptAgent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                  <span>{promptAgent.label}</span>
                  {promptAgent.placeholders.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Placeholder:{' '}
                      {promptAgent.placeholders.map((p) => (
                        <code key={p} className="bg-muted px-1 mx-0.5 rounded">{p}</code>
                      ))}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="system_prompt">System-Prompt</Label>
                  <Textarea
                    id="system_prompt"
                    rows={14}
                    value={promptAgent.prompt.system_prompt}
                    onChange={(e) => updatePromptField('system_prompt', e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="greeting">Greeting</Label>
                  <Textarea
                    id="greeting"
                    rows={4}
                    value={promptAgent.prompt.greeting}
                    onChange={(e) => updatePromptField('greeting', e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSavePrompt} disabled={promptSaving}>
                    {promptSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Keine Prompts geladen.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Outbound-Anruf ─── */}
        <TabsContent value="outbound" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outbound-Anruf ausloesen (Agent 03)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.agents['outbound-telephony'] !== 'running' && (
                <div className="text-xs flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Agent 03 ist gerade nicht im Status &laquo;laeuft&raquo;. Anruf wird vermutlich fehlschlagen.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="out-name">Name</Label>
                  <Input
                    id="out-name"
                    value={outName}
                    onChange={(e) => setOutName(e.target.value)}
                    placeholder="Max Mustermann"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="out-phone">Telefon (E.164)</Label>
                  <Input
                    id="out-phone"
                    value={outPhone}
                    onChange={(e) => setOutPhone(e.target.value)}
                    placeholder="+491701234567"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="out-context">Auftrag / Anrufgrund</Label>
                <Textarea
                  id="out-context"
                  rows={3}
                  value={outContext}
                  onChange={(e) => setOutContext(e.target.value)}
                  placeholder='Konkreter Anrufgrund — wird im Prompt als {context} eingesetzt (z.B. "Terminvereinbarung fuer 15-Min-Erstgespraech zur DIN-SPEC-27076-Analyse")'
                />
                <p className="text-[11px] text-muted-foreground">
                  Je praeziser, desto weniger Abweichung.
                </p>
              </div>

              {/* ─── Per-Call Prompt-Overrides (optional) ─── */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="shrink-0">Use-Case</Label>
                  <Select value={outUseCase} onValueChange={applyTemplate}>
                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_TEMPLATE_OPTION.slug}>
                        {DEFAULT_TEMPLATE_OPTION.name}
                      </SelectItem>
                      {voiceTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.slug}>
                          {t.name}
                          {t.category && (
                            <span className="text-xs text-muted-foreground ml-2">· {t.category}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">
                    Platzhalter: <code className="bg-muted px-1 rounded">{'{name}'}</code> · <code className="bg-muted px-1 rounded">{'{context}'}</code>
                  </span>
                  {templatesLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="out-system-override">
                    System-Prompt (Override, optional)
                  </Label>
                  <Textarea
                    id="out-system-override"
                    rows={8}
                    value={outSystemOverride}
                    onChange={(e) => setOutSystemOverride(e.target.value)}
                    placeholder="Leer lassen → Default-Prompt vom Server (Tab Prompts) wird verwendet."
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="out-greeting-override">
                    Greeting (Override, optional)
                  </Label>
                  <Textarea
                    id="out-greeting-override"
                    rows={3}
                    value={outGreetingOverride}
                    onChange={(e) => setOutGreetingOverride(e.target.value)}
                    placeholder="Leer lassen → Default-Greeting vom Server."
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Verursacht Telefonkosten via Twilio.
                </p>
                <Button onClick={handleDispatch} disabled={dispatching}>
                  {dispatching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PhoneOutgoing className="h-4 w-4 mr-2" />}
                  Anruf starten
                </Button>
              </div>
              {lastCall && (
                <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded p-3">
                  Status: <strong>{lastCall.status}</strong> · Room: <code className="font-mono">{lastCall.roomName}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Vorlagen (Use-Case-Templates fuer Outbound) ─── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Outbound-Vorlagen</h2>
              <p className="text-xs text-muted-foreground">
                Use-Case-Templates fuer Agent 03. Werden im Outbound-Tab als Auswahl angeboten.
              </p>
            </div>
            <Button size="sm" onClick={openNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Vorlage
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : voiceTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Noch keine Vorlagen angelegt.
                      </TableCell>
                    </TableRow>
                  ) : (
                    voiceTemplates.map((tpl) => (
                      <TableRow key={tpl.id}>
                        <TableCell>
                          <div className="font-medium">{tpl.name}</div>
                          {tpl.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-md">
                              {tpl.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tpl.category && <Badge variant="outline">{tpl.category}</Badge>}
                        </TableCell>
                        <TableCell><code className="text-xs">{tpl.slug}</code></TableCell>
                        <TableCell>
                          <Badge variant={tpl.isActive ? 'default' : 'secondary'}>
                            {tpl.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTemplate(tpl)
                                setTemplateDialogOpen(true)
                              }}
                              title="Bearbeiten"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTemplate(tpl)}
                              title="Loeschen"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Anrufe (Webhook-Persistierung) ─── */}
        <TabsContent value="calls" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Anrufe &amp; Transkripte</h2>
              <p className="text-xs text-muted-foreground">
                Persistierte Anrufe (via Webhook von voice.xkmu.de). Klick auf Zeile fuer Transkript.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCalls} disabled={callsLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${callsLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Richtung</TableHead>
                    <TableHead>Nummer / Name</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : calls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Noch keine Anrufe persistiert. Sobald voice.xkmu.de den Webhook schickt, erscheinen sie hier.
                      </TableCell>
                    </TableRow>
                  ) : (
                    calls.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => openCallDetail(c)}>
                        <TableCell className="font-mono text-xs">{formatDateTime(c.startedAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {AGENT_LABELS[c.agentKey as AgentKey]?.replace(/^Agent \d+ — /, '') ?? c.agentKey}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.direction === 'inbound' ? '↘ inbound' : '↗ outbound'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{c.callerName ?? '—'}</div>
                          {c.phone && <div className="text-xs text-muted-foreground font-mono">{c.phone}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{formatDuration(c.durationSeconds)}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Anzeigen" onClick={() => openCallDetail(c)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Loeschen"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCall(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Call-Detail-Dialog ─── */}
      <Dialog open={callDetailOpen} onOpenChange={setCallDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Anruf-Transkript</DialogTitle>
          </DialogHeader>
          {activeCall && (
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Zeitpunkt</div>
                  <div className="font-medium">{formatDateTime(activeCall.startedAt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dauer</div>
                  <div className="font-medium">{formatDuration(activeCall.durationSeconds)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Anrufer</div>
                  <div className="font-medium">{activeCall.callerName ?? '—'}</div>
                  {activeCall.phone && <div className="font-mono text-[10px]">{activeCall.phone}</div>}
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div><Badge variant={activeCall.status === 'completed' ? 'default' : 'secondary'}>{activeCall.status}</Badge></div>
                </div>
              </div>

              {activeCall.contextText && (
                <div className="rounded border p-3 text-xs bg-muted/40">
                  <div className="text-muted-foreground mb-1">Auftrag / Kontext</div>
                  <div>{activeCall.contextText}</div>
                </div>
              )}

              {activeCall.summary && (
                <div className="rounded border p-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                  <div className="text-emerald-700 dark:text-emerald-400 mb-1 font-medium">Zusammenfassung</div>
                  <div>{activeCall.summary}</div>
                </div>
              )}

              {activeCall.recordingUrl && (
                <a
                  href={activeCall.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Aufzeichnung oeffnen
                </a>
              )}

              <div className="border-t pt-3">
                <div className="text-muted-foreground text-xs mb-2">Transkript</div>
                {activeLoading ? (
                  <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : activeMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Kein Transkript verfuegbar.</p>
                ) : (
                  <div className="space-y-2">
                    {activeMessages.map((m) => {
                      const isAgent = m.role === 'agent'
                      return (
                        <div
                          key={m.id}
                          className={`rounded p-2.5 text-sm ${
                            isAgent
                              ? 'bg-primary/10 border border-primary/20'
                              : m.role === 'system'
                                ? 'bg-muted text-muted-foreground italic'
                                : 'bg-card border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                              {m.role === 'agent' ? 'Agent' : m.role === 'user' ? 'Anrufer' : m.role}
                            </span>
                            <span className="text-[10px] font-mono opacity-50">
                              {new Date(m.ts).toLocaleTimeString('de-DE')}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap">{m.text}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Vorlage-Editor-Dialog ─── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-slug">Slug</Label>
                  <Input
                    id="tpl-slug"
                    value={editingTemplate.slug}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, slug: e.target.value.toLowerCase() })
                    }
                    placeholder="strict-task"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Name</Label>
                  <Input
                    id="tpl-name"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-category">Kategorie</Label>
                  <Input
                    id="tpl-category"
                    value={editingTemplate.category ?? ''}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value || null,
                      })
                    }
                    placeholder="Sales / Service / Marketing"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-description">Beschreibung</Label>
                <Input
                  id="tpl-description"
                  value={editingTemplate.description ?? ''}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      description: e.target.value || null,
                    })
                  }
                  placeholder="Kurze Erklaerung, wofuer diese Vorlage gut ist"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-system">
                  System-Prompt — Platzhalter <code className="bg-muted px-1 rounded text-[10px]">{'{name}'}</code> &amp; <code className="bg-muted px-1 rounded text-[10px]">{'{context}'}</code>
                </Label>
                <Textarea
                  id="tpl-system"
                  rows={14}
                  value={editingTemplate.systemPrompt}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, systemPrompt: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-greeting">Greeting</Label>
                <Textarea
                  id="tpl-greeting"
                  rows={4}
                  value={editingTemplate.greeting}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, greeting: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isActive}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Aktiv (im Dropdown sichtbar)
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="tpl-sort" className="text-xs">Sortierung</Label>
                  <Input
                    id="tpl-sort"
                    type="number"
                    value={editingTemplate.sortOrder}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={templateSaving}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveTemplate} disabled={templateSaving}>
              {templateSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Hilfetexte pro Setting-Feld. Bewusst lokal gepflegt — die
// Voice-API liefert nur das Schema, nicht die Bedeutung.
// "what" = was bewirkt das Feld; "rec" = Empfehlung in der Praxis.
// ────────────────────────────────────────────────────────────────
const FIELD_HELP: Record<string, { what: string; rec?: string }> = {
  // ─── Agent 01 (Simple Latency / Speech-to-Speech) ─────────────
  model: {
    what: 'Realtime-Modell fuer Agent 01. native-audio = direkt Audio→Audio (niedrigste Latenz), -exp = experimentell.',
    rec: 'gemini-live-2.5-flash-native-audio (Default) — schnellste Antwort.',
  },
  voice: {
    what: 'Gemini-Live-Stimme. Aoede klingt natuerlich-weiblich, Charon tief-maennlich, Puck/Kore/Fenrir markanter.',
    rec: 'Aoede fuer freundlich-neutral, Charon fuer seriös-maennlich.',
  },
  language: {
    what: 'Sprache, in der Agent 01 spricht und versteht.',
    rec: 'de-DE fuer deutsche Anrufer.',
  },
  // ─── LLM (Agent 02/03/04) ─────────────────────────────────────
  llm_model: {
    what: 'LLM, das Antworten formuliert. flash = schnell + guenstig, pro = bessere Reasoning-Qualitaet aber langsamer + teurer.',
    rec: 'gemini-2.5-flash fuer fast alle Calls. 2.5-pro nur bei komplexen Aufgaben (Verhandlung, mehrere Constraints).',
  },
  temperature: {
    what: 'Zufaelligkeit der LLM-Antworten. 0 = deterministisch/formal, 1 = ausgewogen, 2 = sehr kreativ (kann Fakten erfinden). null = Provider-Default.',
    rec: 'null oder 0.3 — Outbound-Calls sollen verlaesslich klingen, kein Improvisations-Bedarf.',
  },
  // ─── STT / TTS ────────────────────────────────────────────────
  stt_language: {
    what: 'Speech-to-Text — Sprache, in der der Anrufer spricht. Falsche Wahl → schlechte Transkription.',
    rec: 'de-DE fuer deutsche Anrufer.',
  },
  tts_voice: {
    what: 'Stimme des Agents (Azure Neural). "Multilingual"-Stimmen wechseln nahtlos die Sprache; KatjaNeural/ConradNeural sind klassische DE-Stimmen.',
    rec: 'FlorianMultilingualNeural (maennlich) oder SeraphinaMultilingualNeural (weiblich) — beide klingen sehr natuerlich.',
  },
  tts_language: {
    what: 'Akzent/Lokal der TTS-Stimme. Bei deutschen Calls de-DE, sonst klingt die Aussprache fremd.',
    rec: 'Identisch mit stt_language.',
  },
  // ─── Greeting / VAD / Interruption ────────────────────────────
  greeting_delay_seconds: {
    what: 'Wartezeit nach Verbindungsaufbau, bevor der Agent "Hallo" sagt. Zu kurz wirkt aggressiv, zu lang wirkt kaputt.',
    rec: '1.0–1.5 s. Default 1.2 s passt fuer fast alle Telefonsetups.',
  },
  vad_activation_threshold: {
    what: 'Lautstaerke-Schwelle, ab der der Agent erkennt: "der Anrufer spricht". 0.1 = ultra-sensibel (Hintergrundrauschen triggert), 0.9 = nur sehr laute Stimmen.',
    rec: '0.5 (Default). Lauter Hintergrund (Strasse/Buero) → 0.6–0.7. Sehr leiser Anrufer → 0.3–0.4.',
  },
  vad_min_silence_duration: {
    what: 'Wie viele Sekunden Stille noetig sind, bevor der Agent annimmt "Anrufer hat ausgeredet" und antwortet.',
    rec: '0.55 s. Niedriger → Agent faellt ins Wort. Hoeher → Gespraech wirkt traege.',
  },
  allow_interruptions: {
    what: 'Darf der Anrufer den Agent unterbrechen? true = natuerliches Gespraech; false = Agent redet immer aus (formal, robotisch).',
    rec: 'true. Nur deaktivieren wenn der Agent zwingend Pflichttext am Stueck vorlesen muss (Rechtshinweise).',
  },
  min_interruption_duration: {
    what: 'Wie lange der Anrufer reden muss, bevor der Agent als unterbrochen gilt. Kurzes "mhm" oder "ja" soll nicht stoppen.',
    rec: '0.5–0.7 s. Zu niedrig → Filler-Words stoppen den Agent. Zu hoch → echte Einwuerfe gehen verloren.',
  },
  min_endpointing_delay: {
    what: 'Wartezeit nach Ende der Agent-Aussage, bevor er Anrufer-Schweigen als Nicht-Antwort wertet und nachhakt.',
    rec: '0.4–0.7 s. Zu niedrig → Agent quasselt direkt rein, der Anrufer kommt nicht zu Wort.',
  },
}

// ────────────────────────────────────────────────────────────────
// Field-Renderer pro Spec-Kind. Halten wir lokal — nur hier
// gebraucht, kein Wert in einer eigenen Datei.
// ────────────────────────────────────────────────────────────────
function SettingsField({
  name, spec, value, defaultValue, onChange,
}: {
  name: string
  spec: FieldSpec
  value: unknown
  defaultValue: unknown
  onChange: (v: unknown) => void
}) {
  const help = FIELD_HELP[name]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
      <div className="space-y-1">
        <Label className="font-mono text-xs">{name}</Label>
        {defaultValue !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            Default: <code>{defaultValue === null ? 'null' : String(defaultValue)}</code>
          </p>
        )}
        {help && (
          <div className="text-[11px] text-muted-foreground leading-snug space-y-0.5 pt-1">
            <p>{help.what}</p>
            {help.rec && (
              <p>
                <span className="font-medium text-foreground/70">Empfehlung:</span> {help.rec}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        {spec.kind === 'enum' && (
          <Select value={typeof value === 'string' ? value : ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {spec.values.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {spec.kind === 'bool' && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-muted-foreground">{value === true ? 'aktiviert' : 'deaktiviert'}</span>
          </label>
        )}
        {spec.kind === 'float' && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={spec.min}
              max={spec.max}
              step={0.05}
              value={typeof value === 'number' ? value : ''}
              placeholder={spec.nullable ? 'null' : ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') onChange(spec.nullable ? null : spec.min)
                else onChange(Number(v))
              }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              [{spec.min}…{spec.max}]
              {spec.nullable && <span> · null erlaubt</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
