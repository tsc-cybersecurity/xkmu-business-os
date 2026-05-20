'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, MessageCircle, HelpCircle } from 'lucide-react'

interface RiskSignal {
  severity: 'low' | 'medium' | 'high'
  description: string
}

interface NarrativePath {
  persona: string
  reaction: string
  reasoning: string
}

interface SimulationResult {
  summary?: string
  riskSignals?: RiskSignal[]
  narrativePaths?: NarrativePath[]
  followUpQuestions?: string[]
}

const SEVERITY_CLS: Record<RiskSignal['severity'], string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
}

const SEVERITY_LABEL: Record<RiskSignal['severity'], string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
}

export function SimulationView({
  request,
  result,
}: {
  request: unknown
  result: SimulationResult | null | undefined
}) {
  const r = result ?? {}
  const question = (request as { question?: string } | null)?.question

  if (!result) {
    return <p className="text-sm text-muted-foreground italic">Noch keine Simulation gelaufen.</p>
  }

  return (
    <div className="space-y-4">
      {question && (
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Simulationsfrage an Mirofish
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm italic">„{question}"</p>
          </CardContent>
        </Card>
      )}

      {r.summary && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Zusammenfassung</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed">{r.summary}</p>
          </CardContent>
        </Card>
      )}

      {Array.isArray(r.riskSignals) && r.riskSignals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risiko-Signale
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {r.riskSignals.map((rs, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3">
                <Badge className={`${SEVERITY_CLS[rs.severity]} flex-shrink-0`}>
                  {SEVERITY_LABEL[rs.severity]}
                </Badge>
                <p className="leading-relaxed">{rs.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {Array.isArray(r.narrativePaths) && r.narrativePaths.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              Narrativ-Pfade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {r.narrativePaths.map((np, i) => (
              <div key={i} className="text-sm border rounded-md p-3 space-y-1">
                <p className="font-medium">{np.persona}</p>
                <p>
                  <span className="text-muted-foreground">Reaktion:</span> {np.reaction}
                </p>
                <p className="text-muted-foreground text-xs">{np.reasoning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {Array.isArray(r.followUpQuestions) && r.followUpQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Anschlussfragen</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm">
              {r.followUpQuestions.map((q, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
