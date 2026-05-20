'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Briefcase, CheckCircle2, AlertCircle, Loader2, Square } from 'lucide-react'

export interface BusinessPlanListItem {
  id: string
  title: string
  mode: 'canvas' | 'kfw' | 'both'
  inputType: 'quick' | 'briefing'
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
  currentIteration: number
  maxIterations: number
  scoreThreshold: number
  finalScore: number | null
  createdAt: string | null
}

const MODE_LABEL: Record<BusinessPlanListItem['mode'], string> = {
  canvas: 'Canvas',
  kfw: 'KfW-Langform',
  both: 'Canvas + KfW',
}

const STATUS_CONFIG: Record<
  BusinessPlanListItem['status'],
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  idle: { label: 'Bereit', cls: 'bg-gray-100 text-gray-700', icon: Square },
  running: { label: 'Läuft', cls: 'bg-blue-100 text-blue-700 animate-pulse', icon: Loader2 },
  completed: { label: 'Fertig', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Fehler', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
  stopped: { label: 'Gestoppt', cls: 'bg-amber-100 text-amber-700', icon: Square },
}

function formatDate(value: string | null): string {
  if (!value) return '–'
  try {
    return new Date(value).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '–'
  }
}

export function PlanCard({ plan }: { plan: BusinessPlanListItem }) {
  const statusCfg = STATUS_CONFIG[plan.status]
  const StatusIcon = statusCfg.icon
  const score = plan.finalScore ?? 0
  const iterPercent = (plan.currentIteration / plan.maxIterations) * 100

  return (
    <Link href={`/intern/business-plans/${plan.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-base line-clamp-2">{plan.title}</CardTitle>
            </div>
            <Badge className={`${statusCfg.cls} flex items-center gap-1 flex-shrink-0`}>
              <StatusIcon className={`h-3 w-3 ${plan.status === 'running' ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">{MODE_LABEL[plan.mode]}</Badge>
            <Badge variant="outline" className="text-xs">
              {plan.inputType === 'quick' ? 'Quick-Idee' : 'Briefing'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Score</span>
              <span className="font-mono">
                {plan.finalScore !== null ? `${plan.finalScore}/100` : '–'}
                {' · Ziel '}
                {plan.scoreThreshold}
              </span>
            </div>
            <Progress value={score} className="h-2" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Iterationen</span>
              <span className="font-mono">
                {plan.currentIteration}/{plan.maxIterations}
              </span>
            </div>
            <Progress value={iterPercent} className="h-2" />
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Angelegt {formatDate(plan.createdAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
