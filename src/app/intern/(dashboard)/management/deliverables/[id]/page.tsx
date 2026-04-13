'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileText, ExternalLink } from 'lucide-react'
import { getCategoryLabel } from '@/lib/constants/framework'

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf', review: 'Review', approved: 'Freigegeben', archived: 'Archiviert'
}
const AUTOMATION_LEVEL_LABELS: Record<string, string> = {
  manual: 'Manuell', semi: 'Semi-Auto', full: 'Vollautomatisch'
}
const AUTOMATION_LEVEL_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  manual: 'secondary', semi: 'outline', full: 'default'
}

export default function DeliverableDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [deliverable, setDeliverable] = useState<any>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/deliverables/${id}`)
    const d = await res.json()
    if (d.success) setDeliverable(d.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
  if (!deliverable) return (
    <div className="py-16 text-center text-muted-foreground">Deliverable nicht gefunden</div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/intern/management/deliverables">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{deliverable.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-xs">{deliverable.module?.code}</Badge>
            <Badge variant="secondary">{getCategoryLabel(deliverable.category_code) || deliverable.category}</Badge>
            <Badge variant={deliverable.status === 'approved' ? 'default' : 'secondary'}>
              {STATUS_LABELS[deliverable.status] || deliverable.status}
            </Badge>
            <span className="text-xs text-muted-foreground">v{deliverable.version}</span>
          </div>
        </div>
      </div>

      {/* Metadaten-Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modul */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Modul</p>
              <p className="text-sm mt-0.5">
                <span className="font-mono font-semibold">{deliverable.module?.code}</span>
                {' — '}{deliverable.module?.name}
              </p>
            </div>
            {/* Format */}
            {deliverable.format && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Format</p>
                <p className="text-sm mt-0.5">{deliverable.format}</p>
              </div>
            )}
            {/* Umfang */}
            {deliverable.umfang && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Umfang</p>
                <p className="text-sm mt-0.5">{deliverable.umfang}</p>
              </div>
            )}
            {/* Trigger */}
            {deliverable.trigger && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Trigger</p>
                <p className="text-sm mt-0.5">{deliverable.trigger}</p>
              </div>
            )}
          </div>
          {/* Beschreibung */}
          {deliverable.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Beschreibung</p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{deliverable.description}</p>
            </div>
          )}
          {/* Modulziel */}
          {deliverable.module?.ziel && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Modulziel</p>
              <p className="text-sm mt-0.5 text-muted-foreground">{deliverable.module.ziel}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verknuepfte SOPs */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5" />
          Produzierende SOPs
          <Badge variant="outline">{deliverable.sops?.length ?? 0}</Badge>
        </h2>
        {!deliverable.sops?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Keine SOPs verknuepft
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {deliverable.sops.map((sop: any) => (
              <Link key={sop.id} href={`/intern/management/sops/${sop.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {sop.source_task_id && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {sop.source_task_id}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate">{sop.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sop.automation_level && (
                        <Badge variant={AUTOMATION_LEVEL_VARIANT[sop.automation_level] || 'secondary'} className="text-xs">
                          {AUTOMATION_LEVEL_LABELS[sop.automation_level] || sop.automation_level}
                        </Badge>
                      )}
                      {sop.maturity_level && (
                        <Badge variant="outline" className="text-xs">
                          Reife {sop.maturity_level}/5
                        </Badge>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
