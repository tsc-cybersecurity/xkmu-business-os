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
  Loader2, RefreshCw, Play, Square, Phone, Save, Settings2, MessageSquareText,
  PhoneOutgoing, AlertTriangle, CheckCircle2, XCircle, CircleSlash, CircleDashed,
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
  const [dispatching, setDispatching] = useState(false)
  const [lastCall, setLastCall] = useState<{ roomName: string; status: string } | null>(null)

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
        }}
      >
        <TabsList>
          <TabsTrigger value="overview"><Phone className="h-4 w-4 mr-2" />Uebersicht</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          <TabsTrigger value="prompts"><MessageSquareText className="h-4 w-4 mr-2" />Prompts</TabsTrigger>
          <TabsTrigger value="outbound"><PhoneOutgoing className="h-4 w-4 mr-2" />Outbound-Anruf</TabsTrigger>
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
                <Label htmlFor="out-context">Kontext</Label>
                <Textarea
                  id="out-context"
                  rows={3}
                  value={outContext}
                  onChange={(e) => setOutContext(e.target.value)}
                  placeholder='Was soll der Agent wissen? (z.B. "Interessiert sich fuer Premium-Paket")'
                />
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
      </Tabs>
    </div>
  )
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <div className="space-y-0.5">
        <Label className="font-mono text-xs">{name}</Label>
        {defaultValue !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            Default: <code>{defaultValue === null ? 'null' : String(defaultValue)}</code>
          </p>
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
