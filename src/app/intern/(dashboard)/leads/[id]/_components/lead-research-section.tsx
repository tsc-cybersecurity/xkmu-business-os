'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Building2,
  User,
  Loader2,
  Sparkles,
} from 'lucide-react'

const aiStatusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  processing: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
}

interface LeadResearchSectionProps {
  aiResearchStatus: string | null
  aiResearchResult: Record<string, unknown> | null
  hasCompanyOrPerson: boolean
  researching: boolean
  onStartResearch: () => void
  formatDate: (dateString: string) => string
}

export function LeadResearchSection({
  aiResearchStatus,
  aiResearchResult,
  hasCompanyOrPerson,
  researching,
  onStartResearch,
  formatDate,
}: LeadResearchSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          KI-Recherche
        </CardTitle>
        <CardDescription>
          Automatische Analyse und Anreicherung mit KI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Badge
            variant={
              aiResearchStatus === 'completed' ? 'default' :
              aiResearchStatus === 'processing' ? 'secondary' :
              aiResearchStatus === 'failed' ? 'destructive' :
              'outline'
            }
          >
            {aiStatusLabels[aiResearchStatus || 'pending']}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onStartResearch}
            disabled={researching || aiResearchStatus === 'processing'}
          >
            {researching || aiResearchStatus === 'processing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche läuft...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {aiResearchStatus === 'completed' ? 'Erneut recherchieren' : 'Recherche starten'}
              </>
            )}
          </Button>
        </div>

        {aiResearchResult ? (
          <ResearchResultDisplay
            result={aiResearchResult}
            formatDate={formatDate}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {!hasCompanyOrPerson ? (
              'Bitte verknüpfen Sie zuerst eine Firma oder Person, um die KI-Recherche zu starten.'
            ) : (
              'Noch keine KI-Recherche durchgeführt. Klicken Sie auf "Recherche starten", um automatisch Informationen über diesen Lead zu sammeln.'
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ResearchResultDisplay({
  result,
  formatDate,
}: {
  result: Record<string, unknown>
  formatDate: (dateString: string) => string
}) {
  const r = result
  const score = r.score as number | undefined
  const getScoreEmoji = (s: number) => {
    if (s >= 80) return '\u{1F525}'
    if (s >= 60) return '\u{1F60A}'
    if (s >= 40) return '\u{1F610}'
    if (s >= 20) return '\u{1F615}'
    return '\u{2744}\u{FE0F}'
  }
  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
    if (s >= 60) return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
    if (s >= 40) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
    if (s >= 20) return 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
    return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
  }
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#16a34a'
    if (s >= 60) return '#059669'
    if (s >= 40) return '#ca8a04'
    if (s >= 20) return '#ea580c'
    return '#dc2626'
  }

  return (
    <div className="space-y-4">
      {/* Score Banner */}
      {score !== undefined && (
        <div className={`p-4 rounded-lg border ${getScoreBg(score)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getScoreEmoji(score)}</span>
              <div>
                <p className="font-semibold text-lg">Lead-Score: {score}/100</p>
                <p className="text-sm text-muted-foreground">
                  {score >= 80 ? 'Sehr vielversprechender Lead!' :
                   score >= 60 ? 'Guter Lead mit Potenzial' :
                   score >= 40 ? 'Moderates Interesse' :
                   score >= 20 ? 'Geringes Potenzial' :
                   'Wenig vielversprechend'}
                </p>
              </div>
            </div>
            <div className="text-4xl font-bold" style={{ color: getScoreColor(score) }}>
              {score}%
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(r.summary as string) && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Zusammenfassung</h4>
          <p className="text-sm">{r.summary as string}</p>
        </div>
      )}

      {/* Score Reasoning */}
      {(r.scoreReasoning as string) && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Score-Begründung</h4>
          <p className="text-sm">{r.scoreReasoning as string}</p>
        </div>
      )}

      {/* Recommended Actions */}
      {(r.recommendedActions as string[])?.length > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Empfohlene Aktionen</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {(r.recommendedActions as string[]).map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Company Info */}
      {(r.company as Record<string, unknown>) && (() => {
        const c = r.company as Record<string, unknown>
        const scalarLabels: Record<string, string> = {
          name: 'Firmenname', industry: 'Branche', employeeCount: 'Mitarbeiter',
          headquarters: 'Hauptsitz', website: 'Website', foundedYear: 'Gründungsjahr',
          targetMarket: 'Zielmarkt',
        }
        const arrayLabels: Record<string, string> = {
          products: 'Produkte', services: 'Dienstleistungen', technologies: 'Technologien',
          competitors: 'Wettbewerber', certifications: 'Zertifizierungen', strengths: 'Stärken',
        }
        const scalarFields = Object.entries(c).filter(
          ([key, val]) => val && !Array.isArray(val) && key !== 'description' && key in scalarLabels
        )
        const arrayFields = Object.entries(c).filter(
          ([key, val]) => Array.isArray(val) && (val as unknown[]).length > 0
        )

        return (
          <div className="p-4 bg-muted rounded-lg space-y-4 overflow-hidden">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Firmendetails (KI)
            </h4>

            {c.description ? (
              <p className="text-sm text-muted-foreground">{String(c.description)}</p>
            ) : null}

            {scalarFields.length > 0 && (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                {scalarFields.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs">{scalarLabels[key] || key}</dt>
                    <dd className="font-medium">
                      {key === 'website' ? (
                        <a
                          href={String(value).startsWith('http') ? String(value) : `https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {String(value)}
                        </a>
                      ) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {arrayFields.map(([key, value]) => {
              const items = (value as string[]).filter(v => v && v !== 'Nicht ermittelbar')
              if (items.length === 0) return null
              return (
                <div key={key} className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1.5">{arrayLabels[key] || key}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal max-w-full whitespace-normal break-words">
                        {String(item)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Person Info */}
      {(r.person as Record<string, unknown>) && (() => {
        const p = r.person as Record<string, unknown>
        const personLabels: Record<string, string> = {
          name: 'Name', jobTitle: 'Position', company: 'Firma', linkedinUrl: 'LinkedIn',
        }
        const scalarPersonFields = Object.entries(p).filter(
          ([key, val]) => val && key !== 'bio' && key in personLabels
        )
        return (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Personendetails (KI)
            </h4>
            {p.bio ? (
              <p className="text-sm text-muted-foreground">{String(p.bio)}</p>
            ) : null}
            {scalarPersonFields.length > 0 && (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                {scalarPersonFields.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground text-xs">{personLabels[key] || key}</dt>
                    <dd className="font-medium">
                      {key === 'linkedinUrl' ? (
                        <a
                          href={String(value).startsWith('http') ? String(value) : `https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          LinkedIn-Profil
                        </a>
                      ) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )
      })()}

      {/* Error if failed */}
      {(r.error as string) && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="font-medium mb-2 text-destructive">Fehler</h4>
          <p className="text-sm text-destructive">{r.error as string}</p>
        </div>
      )}

      {/* Research timestamp */}
      {(r.researchedAt as string) && (
        <p className="text-xs text-muted-foreground">
          Recherche durchgeführt am: {formatDate(r.researchedAt as string)}
        </p>
      )}
    </div>
  )
}
