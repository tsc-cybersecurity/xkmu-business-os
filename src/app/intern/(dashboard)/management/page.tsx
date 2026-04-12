'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Target, BarChart3, FileText, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ManagementDashboard() {
  const [loading, setLoading] = useState(true)
  const [rocks, setRocks] = useState<any[]>([])
  const [scorecard, setScorecard] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [okr, setOkr] = useState<any>(null)
  const [sops, setSops] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const [rRes, sRes, iRes, oRes, sopRes] = await Promise.all([
        fetch('/api/v1/eos/rocks'), fetch('/api/v1/eos/scorecard'),
        fetch('/api/v1/eos/issues?status=open'), fetch('/api/v1/okr/dashboard'),
        fetch('/api/v1/sops'),
      ])
      const [rD, sD, iD, oD, sopD] = await Promise.all([
        rRes.json(), sRes.json(), iRes.json(), oRes.json(), sopRes.json(),
      ])
      if (rD.success) setRocks(rD.data)
      if (sD.success) setScorecard(sD.data)
      if (iD.success) setIssues(iD.data)
      if (oD.success) setOkr(oD.data)
      if (sopD.success) setSops(sopD.data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const onTrack = rocks.filter(r => r.status === 'on-track').length
  const offTrack = rocks.filter(r => r.status === 'off-track').length
  const done = rocks.filter(r => r.status === 'done').length

  const greenMetrics = scorecard.reduce((n, m) => {
    const last = m.entries?.[0]
    if (last && m.goal && Number(last.actual) >= Number(m.goal)) return n + 1
    return n
  }, 0)
  const redMetrics = scorecard.length - greenMetrics

  const drafts = sops.filter((s: any) => s.status === 'draft').length
  const reviewSoon = sops.filter((s: any) => {
    if (!s.reviewDate) return false
    const d = new Date(s.reviewDate)
    const inTwoWeeks = new Date(); inTwoWeeks.setDate(inTwoWeeks.getDate() + 14)
    return d <= inTwoWeeks
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Management Framework</h1>
          <p className="text-muted-foreground mt-1">EOS, OKR und SOPs im Ueberblick</p>
        </div>
      </div>

      {/* EOS Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Target className="h-5 w-5" />EOS</h2>
          <Link href="/intern/management/eos"><Button variant="ghost" size="sm">Details <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Rocks</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rocks.length}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="default" className="bg-green-600">{onTrack} On-Track</Badge>
                <Badge variant="destructive">{offTrack} Off-Track</Badge>
                <Badge variant="secondary">{done} Done</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Scorecard</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scorecard.length} Metriken</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="default" className="bg-green-600">{greenMetrics} im Ziel</Badge>
                <Badge variant="destructive">{redMetrics} unter Ziel</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Offene Issues</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {issues.length}
                {issues.length > 0 && <AlertCircle className="h-5 w-5 text-orange-500" />}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {issues.filter(i => i.priority === 'high').length} mit hoher Prioritaet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OKR Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />OKR</h2>
          <Link href="/intern/management/okr"><Button variant="ghost" size="sm">Details <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
        {okr?.cycle ? (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{okr.cycle.name}</CardTitle>
                  <Badge>{okr.overallProgress}% Gesamt</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-secondary rounded-full h-2.5 mb-4">
                  <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${okr.overallProgress}%` }} />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {okr.objectives?.map((obj: any) => (
                    <div key={obj.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm font-medium truncate mr-2">{obj.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 bg-secondary rounded-full h-1.5">
                          <div className={cn('h-1.5 rounded-full', obj.progress >= 70 ? 'bg-green-500' : obj.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${obj.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{obj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Kein aktiver OKR-Zyklus</CardContent></Card>
        )}
      </div>

      {/* SOP Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />SOPs</h2>
          <Link href="/intern/management/sops"><Button variant="ghost" size="sm">Details <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gesamt</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{sops.length} SOPs</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Entwuerfe</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">{drafts} <Clock className="h-5 w-5 text-yellow-500" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Review faellig</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {reviewSoon} {reviewSoon > 0 && <CheckCircle2 className="h-5 w-5 text-orange-500" />}
              </div>
              <p className="text-sm text-muted-foreground mt-1">In den naechsten 14 Tagen</p>
            </CardContent>
          </Card>
        </div>
        {sops.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Zuletzt aktualisiert</p>
            {sops.slice(0, 5).map((s: any) => (
              <Link key={s.id} href={`/intern/management/sops/${s.id}`} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{s.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{s.category}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(s.updatedAt).toLocaleDateString('de-DE')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
