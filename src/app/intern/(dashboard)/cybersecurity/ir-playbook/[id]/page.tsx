'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, AlertTriangle, ArrowLeft, Trash2, Scale, Zap,
  Monitor, Users, Eye, Globe, Clock, Info, CheckCircle2, FileDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { generateIrPlaybookPdf } from '@/lib/services/ir-pdf.service'

/* eslint-disable @typescript-eslint/no-explicit-any */

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

function formatEur(value: number | null): string {
  if (value == null) return '?'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

export default function IrPlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [scenario, setScenario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const fetchScenario = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/ir-playbook/${id}`)
      const json = await res.json()
      if (json.success) {
        setScenario(json.data)
      } else {
        toast.error('Szenario nicht gefunden')
        router.push('/intern/cybersecurity/ir-playbook')
      }
    } catch {
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchScenario()
  }, [fetchScenario])

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const res = await fetch(`/api/v1/ir-playbook/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Szenario geloescht')
        router.push('/intern/cybersecurity/ir-playbook')
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

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!scenario) return null

  const s = scenario
  const actions: any[] = s.actions || []
  const escalation: any[] = s.escalation || []
  const recoverySteps: any[] = s.recovery_steps || []
  const checklist: any[] = s.checklist || []
  const lessonsLearned: any[] = s.lessons_learned || []
  const references: any[] = s.references || []
  const indicators: any[] = s.detection_indicators || []

  // Group actions by phase
  const actionsByPhase = actions.reduce<Record<string, any[]>>((acc, a) => {
    const phase = a.phase as string
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(a)
    return acc
  }, {})

  // Group recovery by phase_label
  const recoveryByPhase = recoverySteps.reduce<Record<string, any[]>>((acc, r) => {
    const phase = r.phase_label as string
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(r)
    return acc
  }, {})

  // Group lessons by category
  const lessonsByCategory = lessonsLearned.reduce<Record<string, any[]>>((acc, l) => {
    const cat = l.category as string
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(l)
    return acc
  }, {})

  // Group references by type
  const refsByType = references.reduce<Record<string, any[]>>((acc, r) => {
    const t = r.type as string
    if (!acc[t]) acc[t] = []
    acc[t].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/intern/cybersecurity/ir-playbook')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurueck
          </Button>
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

        {/* Tab 1: Uebersicht */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Beschreibung</CardTitle>
            </CardHeader>
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
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
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
                <CardHeader>
                  <CardTitle>Betroffene Systeme</CardTitle>
                </CardHeader>
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

        {/* Tab 2: Sofortmassnahmen */}
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
                    <Card
                      key={action.id}
                      className={cn(
                        action.do_not && 'border-red-300 bg-red-50/50'
                      )}
                    >
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
                                <Badge variant="outline" className="text-xs">
                                  {action.responsible}
                                </Badge>
                              )}
                              {action.do_not && (
                                <Badge variant="destructive" className="text-xs">
                                  NICHT TUN
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{action.action}</p>
                            {action.detail && (
                              <p className="text-xs text-muted-foreground">{action.detail}</p>
                            )}
                            {action.tool_hint && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Info className="mr-1 h-3 w-3" />
                                {action.tool_hint}
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

        {/* Tab 3: Eskalation */}
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
                                  <Scale className="mr-1 h-3 w-3" />
                                  {r.legal_basis}
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

        {/* Tab 4: Wiederherstellung */}
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

        {/* Tab 5: Checkliste */}
        <TabsContent value="checklist" className="space-y-2">
          {checklist.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Checkliste definiert.</p>
          ) : (
            checklist.map((item: any) => (
              <Card
                key={item.id}
                className="cursor-pointer"
                onClick={() => toggleCheck(item.id)}
              >
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn(
                        'text-sm',
                        checkedItems.has(item.id) && 'line-through text-muted-foreground'
                      )}>
                        {item.item}
                        {item.mandatory && <span className="ml-1 text-red-500">*</span>}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', CHECKLIST_CATEGORY_COLORS[item.category])}>
                        {item.category}
                      </Badge>
                      {item.dsgvo_required && (
                        <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700">
                          <Shield className="mr-1 h-3 w-3" />
                          DSGVO
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 6: Lessons Learned */}
        <TabsContent value="lessons" className="space-y-6">
          {lessonsLearned.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Lessons Learned definiert.</p>
          ) : (
            Object.entries(lessonsByCategory).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-base">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {items.map((item: any) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="mt-1 text-muted-foreground">&bull;</span>
                        <div className="space-y-1">
                          <p className="text-sm">{item.question}</p>
                          {item.maps_to_control && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {item.maps_to_control}
                            </Badge>
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

        {/* Tab 7: Referenzen */}
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
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline hover:no-underline"
                          >
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

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szenario loeschen?</DialogTitle>
            <DialogDescription>
              Soll das Szenario &quot;{s.title}&quot; unwiderruflich geloescht werden?
              Alle zugehoerigen Daten (Massnahmen, Eskalationsstufen, Checklisten etc.) werden ebenfalls entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
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
