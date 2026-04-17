'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Shield, Search, Upload, Loader2, AlertTriangle, Scale, Zap,
  PanelLeftClose, PanelLeft,
  Monitor, Users, Eye, Globe, Clock, Info, CheckCircle2,
  Trash2, FileDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generateIrPlaybookPdf } from '@/lib/services/ir-pdf.service'

// ============================================
// Types
// ============================================

interface ScenarioSummary {
  id: string
  series: string
  slug: string
  title: string
  emoji: string | null
  color_hex: string | null
  severity: string
  severity_label: string | null
  likelihood: string
  dsgvo_relevant: boolean
  nis2_relevant: boolean
  financial_risk: string
  avg_damage_eur_min: number | null
  avg_damage_eur_max: number | null
  tags: string[]
  affected_systems: string[]
  is_active: boolean
  action_count: number
  warning_count: number
  escalation_levels: number
  recovery_steps: number
  checklist_items: number
  lessons_learned_count: number
}

interface Stats {
  total: number
  active: number
  dsgvo_count: number
  nis2_count: number
  critical_count: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// Constants
// ============================================

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
  VARIABLE: 'bg-purple-100 text-purple-700',
}

const LIKELIHOOD_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  VERY_HIGH: 'bg-red-100 text-red-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  CONTAINMENT: 'bg-red-100 text-red-700',
  ANALYSIS: 'bg-blue-100 text-blue-700',
  COMMUNICATION: 'bg-purple-100 text-purple-700',
  RECOVERY: 'bg-green-100 text-green-700',
  PREVENTION: 'bg-cyan-100 text-cyan-700',
  WARNING: 'bg-orange-100 text-orange-700',
  LEGAL: 'bg-gray-100 text-gray-700',
}

const CHECKLIST_CATEGORY_COLORS: Record<string, string> = {
  EVIDENCE: 'bg-blue-100 text-blue-700',
  LEGAL: 'bg-gray-100 text-gray-700',
  TECHNICAL: 'bg-cyan-100 text-cyan-700',
  COMMUNICATION: 'bg-purple-100 text-purple-700',
  FINANCIAL: 'bg-yellow-100 text-yellow-700',
}

const INDICATOR_ICONS: Record<string, typeof Monitor> = {
  LOG_PATTERN: Monitor,
  USER_REPORT: Users,
  ALERT: AlertTriangle,
  BEHAVIORAL: Eye,
  EXTERNAL_REPORT: Globe,
}

const PHASE_LABELS: Record<string, { label: string; time: string }> = {
  IMMEDIATE: { label: 'Sofort', time: '0-30 Min.' },
  SHORT: { label: 'Kurzfristig', time: '30 Min. - 4 Std.' },
  MEDIUM: { label: 'Mittelfristig', time: '4-72 Std.' },
  LONG: { label: 'Langfristig', time: '> 72 Std.' },
}

const ESCALATION_COLORS = ['bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-red-700']

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Alle Schweregrade' },
  { value: 'LOW', label: 'Niedrig' },
  { value: 'MEDIUM', label: 'Mittel' },
  { value: 'HIGH', label: 'Hoch' },
  { value: 'CRITICAL', label: 'Kritisch' },
  { value: 'VARIABLE', label: 'Variabel' },
]

function formatEur(value: number | null): string {
  if (value == null) return '?'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

// ============================================
// Scenario Detail Component
// ============================================

function ScenarioDetail({ scenario, onDelete }: { scenario: any; onDelete: () => void }) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const s = scenario
  const actions: any[] = s.actions || []
  const escalation: any[] = s.escalation || []
  const recoverySteps: any[] = s.recovery_steps || []
  const checklist: any[] = s.checklist || []
  const lessonsLearned: any[] = s.lessons_learned || []
  const references: any[] = s.references || []
  const indicators: any[] = s.detection_indicators || []

  const actionsByPhase = actions.reduce<Record<string, any[]>>((acc, a) => {
    const phase = a.phase as string
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(a)
    return acc
  }, {})

  const recoveryByPhase = recoverySteps.reduce<Record<string, any[]>>((acc, r) => {
    const phase = r.phase_label as string
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(r)
    return acc
  }, {})

  const lessonsByCategory = lessonsLearned.reduce<Record<string, any[]>>((acc, l) => {
    const cat = l.category as string
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(l)
    return acc
  }, {})

  const refsByType = references.reduce<Record<string, any[]>>((acc, r) => {
    const t = r.type as string
    if (!acc[t]) acc[t] = []
    acc[t].push(r)
    return acc
  }, {})

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const res = await fetch(`/api/v1/ir-playbook/${s.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Szenario geloescht')
        onDelete()
      } else {
        toast.error('Loeschen fehlgeschlagen')
      }
    } catch {
      toast.error('Loeschen fehlgeschlagen')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1
            className="text-2xl font-bold"
            style={s.color_hex ? { color: `#${s.color_hex}` } : undefined}
          >
            {s.emoji && <span className="mr-2">{s.emoji}</span>}
            {s.title}
          </h1>
          {s.subtitle && (
            <p className="text-sm text-muted-foreground">{s.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', SEVERITY_COLORS[s.severity])}>
              {s.severity_label || s.severity}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', LIKELIHOOD_COLORS[s.likelihood])}>
              Wahrscheinlichkeit: {s.likelihood === 'VERY_HIGH' ? 'Sehr hoch' : s.likelihood}
            </Badge>
            {s.dsgvo_relevant && (
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                <Scale className="mr-1 h-3 w-3" />
                DSGVO-relevant
              </Badge>
            )}
            {s.nis2_relevant && (
              <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700">
                <Zap className="mr-1 h-3 w-3" />
                NIS2-relevant
              </Badge>
            )}
          </div>
          {(s.avg_damage_eur_min != null || s.avg_damage_eur_max != null) && (
            <p className="text-sm text-muted-foreground">
              <AlertTriangle className="mr-1 inline h-4 w-4 text-orange-500" />
              Schadenspotenzial: {formatEur(s.avg_damage_eur_min)} &ndash; {formatEur(s.avg_damage_eur_max)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                const doc = generateIrPlaybookPdf(scenario)
                const slug = s.slug || s.id || 'playbook'
                doc.save(`IR-Playbook_${slug}.pdf`)
                toast.success('PDF exportiert')
              } catch {
                toast.error('PDF-Export fehlgeschlagen')
              }
            }}
          >
            <FileDown className="mr-1 h-4 w-4" />
            PDF Export
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Loeschen
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="actions">Sofortmassnahmen</TabsTrigger>
          <TabsTrigger value="escalation">Eskalation</TabsTrigger>
          <TabsTrigger value="recovery">Wiederherstellung</TabsTrigger>
          <TabsTrigger value="checklist">Checkliste</TabsTrigger>
          <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
          <TabsTrigger value="references">Referenzen</TabsTrigger>
        </TabsList>

        {/* Tab: Uebersicht */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Beschreibung</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{s.overview}</p>
            </CardContent>
          </Card>

          {indicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Erkennungsindikatoren</CardTitle>
                <CardDescription>{indicators.length} Indikatoren</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {indicators.map((ind: any, i: number) => {
                    const IconComp = INDICATOR_ICONS[ind.type] || Info
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <IconComp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{ind.description}</p>
                          {ind.threshold && (
                            <p className="text-xs text-muted-foreground">Schwellwert: {ind.threshold}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {s.tags && s.tags.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(s.tags as string[]).map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {s.affected_systems && s.affected_systems.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Betroffene Systeme</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(s.affected_systems as string[]).map((sys: string) => (
                      <Badge key={sys} variant="outline">{sys}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Sofortmassnahmen */}
        <TabsContent value="actions" className="space-y-6">
          {(['IMMEDIATE', 'SHORT', 'MEDIUM', 'LONG'] as const).map((phase) => {
            const phaseActions = actionsByPhase[phase]
            if (!phaseActions || phaseActions.length === 0) return null
            const phaseInfo = PHASE_LABELS[phase]
            return (
              <div key={phase} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{phaseInfo.label}</h3>
                  <span className="text-sm text-muted-foreground">({phaseInfo.time})</span>
                </div>
                <div className="space-y-2">
                  {phaseActions.map((action: any) => (
                    <Card key={action.id} className={cn(action.do_not && 'border-red-300 bg-red-50/50')}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {action.priority}
                          </span>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className={cn('text-xs', CATEGORY_COLORS[action.category])}>
                                {action.category}
                              </Badge>
                              {action.responsible && (
                                <Badge variant="outline" className="text-xs">{action.responsible}</Badge>
                              )}
                              {action.do_not && (
                                <Badge variant="destructive" className="text-xs">NICHT TUN</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{action.action}</p>
                            {action.detail && (
                              <p className="text-xs text-muted-foreground">{action.detail}</p>
                            )}
                            {action.tool_hint && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Info className="mr-1 h-3 w-3" />{action.tool_hint}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
          {actions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Massnahmen definiert.</p>
          )}
        </TabsContent>

        {/* Tab: Eskalation */}
        <TabsContent value="escalation" className="space-y-4">
          {escalation.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Eskalationsstufen definiert.</p>
          ) : (
            <div className="space-y-4">
              {escalation.map((level: any, i: number) => (
                <Card key={level.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold',
                        ESCALATION_COLORS[i] || 'bg-gray-500'
                      )}>
                        {level.level}
                      </div>
                      <div>
                        <CardTitle className="text-base">{level.label}</CardTitle>
                        {level.deadline_hours != null && (
                          <CardDescription>
                            <Clock className="mr-1 inline h-3 w-3" />
                            Frist: {level.deadline_hours} Stunden
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {level.condition && (
                      <p className="text-xs text-muted-foreground">Bedingung: {level.condition}</p>
                    )}
                  </CardHeader>
                  {level.recipients && level.recipients.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {level.recipients.map((r: any, ri: number) => (
                          <div key={ri} className="rounded-md border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{r.role}</span>
                              <Badge variant="outline" className="text-xs">{r.contact_type}</Badge>
                              {r.legal_basis && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Scale className="mr-1 h-3 w-3" />{r.legal_basis}
                                </Badge>
                              )}
                            </div>
                            {r.message && (
                              <p className="mt-1 text-xs text-muted-foreground">{r.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Wiederherstellung */}
        <TabsContent value="recovery" className="space-y-6">
          {recoverySteps.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Wiederherstellungsschritte definiert.</p>
          ) : (
            Object.entries(recoveryByPhase).map(([phase, steps]) => (
              <div key={phase} className="space-y-3">
                <h3 className="text-lg font-semibold">{phase}</h3>
                <div className="space-y-2">
                  {steps.map((step: any) => (
                    <Card key={step.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {step.sequence}
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{step.action}</p>
                            {step.detail && (
                              <p className="text-xs text-muted-foreground">{step.detail}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">{step.responsible}</Badge>
                              {step.depends_on && (
                                <span className="text-[10px] text-muted-foreground">
                                  Abhaengig von: {step.depends_on}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Tab: Checkliste */}
        <TabsContent value="checklist" className="space-y-2">
          {checklist.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Checkliste definiert.</p>
          ) : (
            checklist.map((item: any) => (
              <Card key={item.id} className="cursor-pointer" onClick={() => toggleCheck(item.id)}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    checkedItems.has(item.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}>
                    {checkedItems.has(item.id) && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className={cn(
                      'text-sm',
                      checkedItems.has(item.id) && 'line-through text-muted-foreground'
                    )}>
                      {item.item}
                      {item.mandatory && <span className="ml-1 text-red-500">*</span>}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', CHECKLIST_CATEGORY_COLORS[item.category])}>
                        {item.category}
                      </Badge>
                      {item.dsgvo_required && (
                        <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700">
                          <Shield className="mr-1 h-3 w-3" />DSGVO
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab: Lessons Learned */}
        <TabsContent value="lessons" className="space-y-6">
          {lessonsLearned.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Lessons Learned definiert.</p>
          ) : (
            Object.entries(lessonsByCategory).map(([category, items]) => (
              <Card key={category}>
                <CardHeader><CardTitle className="text-base">{category}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {items.map((item: any) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="mt-1 text-muted-foreground">&bull;</span>
                        <div className="space-y-1">
                          <p className="text-sm">{item.question}</p>
                          {item.maps_to_control && (
                            <Badge variant="secondary" className="font-mono text-[10px]">{item.maps_to_control}</Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab: Referenzen */}
        <TabsContent value="references" className="space-y-6">
          {references.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Referenzen definiert.</p>
          ) : (
            Object.entries(refsByType).map(([type, items]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-base">{type}</CardTitle>
                  <CardDescription>{items.length} Referenz(en)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((ref: any, i: number) => (
                      <li key={i} className="text-sm">
                        {ref.url ? (
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                            {ref.name}
                          </a>
                        ) : (
                          <span>{ref.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szenario loeschen?</DialogTitle>
            <DialogDescription>
              Soll das Szenario &quot;{s.title}&quot; unwiderruflich geloescht werden?
              Alle zugehoerigen Daten werden ebenfalls entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Endgueltig loeschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// Main Page
// ============================================

export default function IrPlaybookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [severity, setSeverity] = useState('all')
  const [dsgvoOnly, setDsgvoOnly] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Debounce the search input by 300ms so the scenario list doesn't refetch
  // on every keystroke (and the sidebar doesn't flicker/lose focus).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Layout state
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  // Detail state
  const [scenarioDetail, setScenarioDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (severity !== 'all') params.set('severity', severity)
      if (dsgvoOnly) params.set('dsgvo', 'true')

      const res = await fetch(`/api/v1/ir-playbook?${params}`)
      const json = await res.json()
      if (json.success) {
        setScenarios(json.data || [])
      }
    } catch {
      toast.error('Fehler beim Laden der Szenarien')
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
    }
  }, [debouncedSearch, severity, dsgvoOnly])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/ir-playbook/views?view=stats')
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
      }
    } catch {
      // Stats are non-critical
    }
  }, [])

  const fetchScenarioDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/v1/ir-playbook/${id}`)
      const json = await res.json()
      if (json.success) {
        setScenarioDetail(json.data)
      } else {
        toast.error('Szenario nicht gefunden')
        setSelectedScenarioId(null)
      }
    } catch {
      toast.error('Fehler beim Laden')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (selectedScenarioId) {
      fetchScenarioDetail(selectedScenarioId)
    } else {
      setScenarioDetail(null)
    }
  }, [selectedScenarioId, fetchScenarioDetail])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const text = await file.text()
      const parsed = JSON.parse(text)

      let payload: Record<string, unknown>
      if (Array.isArray(parsed)) {
        payload = { scenarios: parsed }
      } else if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
        payload = parsed
      } else {
        payload = { scenarios: [parsed] }
      }

      const res = await fetch('/api/v1/ir-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok) {
        toast.error(`Import-Fehler: ${result.error?.message || res.statusText || 'Unbekannter Fehler'}`)
        return
      }

      const imported = result.data?.imported || 0
      const failed = (payload.scenarios as unknown[]).length - imported

      if (imported > 0) {
        toast.success(`${imported} Szenario(en) importiert${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}`)
        fetchScenarios()
        fetchStats()
      } else {
        toast.error('Kein Szenario importiert — pruefen Sie das JSON-Format')
      }
    } catch (err) {
      toast.error(`Import-Fehler: ${err instanceof Error ? err.message : 'Ungueltige JSON-Datei'}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleScenarioDeleted = () => {
    setSelectedScenarioId(null)
    setScenarioDetail(null)
    fetchScenarios()
    fetchStats()
  }

  // Sort scenarios by ID (S-001, S-002, ...)
  const sortedScenarios = [...scenarios].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  // Full-screen spinner ONLY on initial load. Subsequent refreshes (filter
  // changes, search) keep the UI mounted so the search input doesn't lose
  // focus on every keystroke.
  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (scenarios.length === 0 && !debouncedSearch && severity === 'all' && !dsgvoOnly) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Incident Response Playbook</h1>
            <p className="text-sm text-muted-foreground">Noch keine Szenarien importiert</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Noch keine Szenarien importiert</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Importieren Sie IR-Szenarien aus einer JSON-Datei.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              JSON importieren
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                IR Playbook
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats
                ? `${stats.active} Szenarien, ${stats.dsgvo_count} DSGVO, ${stats.critical_count} kritisch`
                : `${scenarios.length} Szenarien`}
            </p>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={dsgvoOnly ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDsgvoOnly(!dsgvoOnly)}
              >
                <Scale className="mr-1 h-3 w-3" />
                DSGVO
              </Button>
            </div>
          </div>

          {/* Scenario List (sorted by ID) */}
          <div className="flex-1 overflow-y-auto relative">
            {loading && (
              <div className="absolute right-3 top-2 z-10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            {sortedScenarios.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Keine Szenarien gefunden
              </div>
            )}
            {sortedScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenarioId(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border/40',
                  selectedScenarioId === s.id && 'bg-accent font-medium')}
              >
                <span className="shrink-0 text-muted-foreground font-mono w-8">{s.id}</span>
                {s.emoji && <span className="shrink-0">{s.emoji}</span>}
                <span className="truncate">{s.title}</span>
                <span className="shrink-0 ml-auto flex items-center gap-1">
                  {s.severity === 'CRITICAL' && <span className="w-2 h-2 rounded-full bg-red-500" title="Kritisch" />}
                  {s.severity === 'HIGH' && <span className="w-2 h-2 rounded-full bg-orange-500" title="Hoch" />}
                  {s.dsgvo_relevant && <Scale className="h-3 w-3 text-blue-500" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b bg-muted/30 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-semibold">Incident Response Playbook</span>
              {scenarioDetail && (
                <span className="text-sm text-muted-foreground hidden md:inline">
                  — {scenarioDetail.title}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              JSON importieren
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scenarioDetail ? (
            <div className="max-w-4xl">
              <ScenarioDetail scenario={scenarioDetail} onDelete={handleScenarioDeleted} />
            </div>
          ) : (
            /* Overview: card grid when no scenario selected */
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedScenarios.map((s) => (
                <Card
                  key={s.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedScenarioId(s.id)}
                >
                  <CardContent className="space-y-3 p-5">
                    <div>
                      <h3
                        className="text-base font-semibold leading-tight"
                        style={s.color_hex ? { color: `#${s.color_hex}` } : undefined}
                      >
                        {s.emoji && <span className="mr-1">{s.emoji}</span>}
                        {s.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.id}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={cn('text-xs', SEVERITY_COLORS[s.severity])}>
                        {s.severity_label || s.severity}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', LIKELIHOOD_COLORS[s.likelihood])}>
                        {s.likelihood === 'VERY_HIGH' ? 'Sehr hoch' : s.likelihood}
                      </Badge>
                      {s.dsgvo_relevant && (
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                          <Scale className="mr-1 h-3 w-3" />DSGVO
                        </Badge>
                      )}
                      {s.nis2_relevant && (
                        <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700">
                          <Zap className="mr-1 h-3 w-3" />NIS2
                        </Badge>
                      )}
                    </div>

                    {s.tags && s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{s.action_count} Actions</span>
                      <span>&middot;</span>
                      <span>{s.escalation_levels} Eskalationsstufen</span>
                      <span>&middot;</span>
                      <span>{s.checklist_items} Checkliste</span>
                    </div>

                    {(s.avg_damage_eur_min != null || s.avg_damage_eur_max != null) && (
                      <div className="flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span className="text-muted-foreground">
                          Schadenspotenzial: {formatEur(s.avg_damage_eur_min)} &ndash; {formatEur(s.avg_damage_eur_max)}
                        </span>
                      </div>
                    )}

                    {s.warning_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {s.warning_count} Warnung(en)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
