'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Wrench } from 'lucide-react'

interface Analysis {
  score?: number
  reasoning?: string
  strengths?: string[]
  weaknesses?: string[]
  improvements?: string[]
}

function ListCard({
  title,
  items,
  icon: Icon,
  iconClass,
}: {
  title: string
  items: string[] | undefined
  icon: typeof CheckCircle2
  iconClass: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!Array.isArray(items) || items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">–</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">•</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function AnalysisView({ analysis }: { analysis: Analysis | null | undefined }) {
  if (!analysis) {
    return <p className="text-sm text-muted-foreground italic">Noch keine Analyse vorhanden.</p>
  }

  return (
    <div className="space-y-4">
      {analysis.reasoning && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Score-Begründung</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed italic">{analysis.reasoning}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ListCard
          title="Stärken"
          items={analysis.strengths}
          icon={CheckCircle2}
          iconClass="text-green-500"
        />
        <ListCard
          title="Schwächen"
          items={analysis.weaknesses}
          icon={AlertCircle}
          iconClass="text-red-500"
        />
      </div>

      <ListCard
        title="Verbesserungsvorschläge"
        items={analysis.improvements}
        icon={Wrench}
        iconClass="text-blue-500"
      />
    </div>
  )
}
