'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Search, Upload, Loader2, AlertTriangle, Scale, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

const SERIES_OPTIONS = [
  { value: 'all', label: 'Alle Serien' },
  { value: 'I', label: 'Serie I' },
  { value: 'II', label: 'Serie II' },
  { value: 'III', label: 'Serie III' },
  { value: 'IV', label: 'Serie IV' },
  { value: 'V', label: 'Serie V' },
  { value: 'VI', label: 'Serie VI' },
]

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

export default function IrPlaybookPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const [search, setSearch] = useState('')
  const [series, setSeries] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [dsgvoOnly, setDsgvoOnly] = useState(false)

  const fetchScenarios = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (series !== 'all') params.set('series', series)
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
    }
  }, [search, series, severity, dsgvoOnly])

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

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const text = await file.text()
      const parsed = JSON.parse(text)

      // Normalize: ensure we send { scenarios: [...] } format to API
      let payload: Record<string, unknown>
      if (Array.isArray(parsed)) {
        payload = { scenarios: parsed }
      } else if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
        payload = parsed
      } else if (parsed.id) {
        // Single scenario object with id
        payload = { scenarios: [parsed] }
      } else {
        payload = { scenarios: [parsed] }
      }

      const res = await fetch('/api/v1/ir-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      const imported = result.data?.imported || 0
      const failed = (payload.scenarios as unknown[]).length - imported

      if (imported > 0) {
        toast.success(`${imported} Szenario(en) importiert${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}`)
        fetchScenarios()
        fetchStats()
      } else {
        toast.error('Import fehlgeschlagen')
      }
    } catch {
      toast.error('Ungueltige JSON-Datei')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Incident Response Playbook</h1>
            <p className="text-sm text-muted-foreground">
              {stats
                ? `${stats.active} Szenarien, ${stats.dsgvo_count} DSGVO-relevant, ${stats.critical_count} kritisch`
                : 'Lade Statistiken...'}
            </p>
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            JSON importieren
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szenarien durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={series} onValueChange={setSeries}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERIES_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[180px]">
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
          onClick={() => setDsgvoOnly(!dsgvoOnly)}
        >
          <Scale className="mr-1 h-4 w-4" />
          DSGVO
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : scenarios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Noch keine Szenarien importiert</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Importieren Sie IR-Szenarien aus einer JSON-Datei.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              JSON importieren
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/intern/cybersecurity/ir-playbook/${s.id}`)}
            >
              <CardContent className="space-y-3 p-5">
                {/* Title */}
                <div>
                  <h3
                    className="text-base font-semibold leading-tight"
                    style={s.color_hex ? { color: `#${s.color_hex}` } : undefined}
                  >
                    {s.emoji && <span className="mr-1">{s.emoji}</span>}
                    {s.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Serie {s.series} &middot; {s.id}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={cn('text-xs', SEVERITY_COLORS[s.severity])}>
                    {s.severity_label || s.severity}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', LIKELIHOOD_COLORS[s.likelihood])}>
                    {s.likelihood === 'VERY_HIGH' ? 'Sehr hoch' : s.likelihood}
                  </Badge>
                  {s.dsgvo_relevant && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                      <Scale className="mr-1 h-3 w-3" />
                      DSGVO
                    </Badge>
                  )}
                  {s.nis2_relevant && (
                    <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700">
                      <Zap className="mr-1 h-3 w-3" />
                      NIS2
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {s.tags && s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{s.action_count} Actions</span>
                  <span>&middot;</span>
                  <span>{s.escalation_levels} Eskalationsstufen</span>
                  <span>&middot;</span>
                  <span>{s.checklist_items} Checkliste</span>
                </div>

                {/* Financial risk */}
                {(s.avg_damage_eur_min != null || s.avg_damage_eur_max != null) && (
                  <div className="flex items-center gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">
                      Schadenspotenzial: {formatEur(s.avg_damage_eur_min)} &ndash; {formatEur(s.avg_damage_eur_max)}
                    </span>
                  </div>
                )}

                {/* Warnings */}
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
  )
}
