'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Users, TrendingUp, Activity, Target, Globe } from 'lucide-react'
import { LoadingCards } from '@/components/shared/loading-states'
import { logger } from '@/lib/utils/logger'

interface DashboardData {
  stats: {
    companies: number
    persons: number
    leads: number
    activityLast7Days: number
  }
  recentCompanies: {
    id: string
    name: string
    status: string
    createdAt: string
  }[]
  recentPersons: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    createdAt: string
  }[]
  openLeads: {
    id: string
    source: string
    status: string
    score: number | null
    createdAt: string
  }[]
  conversionRate: number
  trends: {
    leads: { date: string; count: number }[]
    companies: { date: string; count: number }[]
  }
  companyStatuses: {
    status: string
    count: number
  }[]
}

const statusLabels: Record<string, string> = {
  prospect: 'Interessent',
  lead: 'Lead',
  customer: 'Kunde',
  partner: 'Partner',
  churned: 'Verloren',
  inactive: 'Inaktiv',
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  proposal: 'Angebot',
  negotiation: 'Verhandlung',
}

const statusColors: Record<string, string> = {
  prospect: 'bg-gray-500',
  lead: 'bg-blue-500',
  customer: 'bg-green-500',
  partner: 'bg-purple-500',
  churned: 'bg-red-500',
  inactive: 'bg-gray-400',
  new: 'bg-blue-400',
  contacted: 'bg-yellow-500',
  qualified: 'bg-green-400',
  proposal: 'bg-orange-500',
  negotiation: 'bg-purple-400',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/v1/dashboard')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      logger.error('Failed to fetch dashboard', error, { module: 'DashboardPage' })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Willkommen bei xKMU Business OS</p>
        </div>
        <LoadingCards count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Willkommen bei xKMU Business OS
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <Globe className="h-4 w-4" />
          Zur Webseite
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmen</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.companies || 0}</div>
            <p className="text-xs text-muted-foreground">Gesamt im System</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.persons || 0}</div>
            <p className="text-xs text-muted-foreground">Kontakte gespeichert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.leads || 0}</div>
            <p className="text-xs text-muted-foreground">Offene Anfragen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivität</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats.activityLast7Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konversionsrate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Won / Total Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* 60-Tage-Trends — Timeline-Style */}
      {data?.trends && (
        <div className="grid gap-4 md:grid-cols-2">
          <TrendTimeline title="Lead-Trend (60 Tage)" data={data.trends.leads} color="bg-primary" label="Leads" />
          <TrendTimeline title="Firmen-Trend (60 Tage)" data={data.trends.companies} color="bg-green-500" label="Firmen" />
        </div>
      )}

      {/* Recent Data */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Neueste Firmen</span>
              <Link
                href="/intern/contacts/companies"
                className="text-sm font-normal text-muted-foreground hover:underline"
              >
                Alle anzeigen
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentCompanies && data.recentCompanies.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Link
                          href={`/intern/contacts/companies/${company.id}`}
                          className="font-medium hover:underline"
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[company.status]}>
                          {statusLabels[company.status] || company.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(company.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Firmen vorhanden.{' '}
                <Link
                  href="/intern/contacts/companies/new"
                  className="text-primary hover:underline"
                >
                  Erste Firma erstellen
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Persons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Neueste Personen</span>
              <Link
                href="/intern/contacts/persons"
                className="text-sm font-normal text-muted-foreground hover:underline"
              >
                Alle anzeigen
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentPersons && data.recentPersons.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Erstellt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPersons.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Link
                          href={`/intern/contacts/persons/${person.id}`}
                          className="font-medium hover:underline"
                        >
                          {person.firstName} {person.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.email || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(person.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Personen vorhanden.{' '}
                <Link
                  href="/intern/contacts/persons/new"
                  className="text-primary hover:underline"
                >
                  Erste Person erstellen
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Offene Leads</span>
            <Link
              href="/intern/leads"
              className="text-sm font-normal text-muted-foreground hover:underline"
            >
              Alle anzeigen
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.openLeads && data.openLeads.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quelle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.openLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.source}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status] || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.score || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Keine offenen Leads vorhanden.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Company Status Distribution */}
      {data?.companyStatuses && data.companyStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Firmen nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {data.companyStatuses.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <Badge className={statusColors[item.status]}>
                    {statusLabels[item.status] || item.status}
                  </Badge>
                  <span className="text-lg font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// Trend-Timeline Komponente (wie Projekte-Timeline)
// ============================================================================

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function TrendTimeline({ title, data, color, label }: {
  title: string; data: { date: string; count: number }[]; color: string; label: string
}) {
  if (!data || data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{total} {label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div style={{ minWidth: data.length * 14 }}>
            {/* Monats-Header */}
            <div className="flex">
              {data.map((d, i) => {
                const date = new Date(d.date + 'T00:00:00')
                const showMonth = i === 0 || date.getDate() === 1
                return (
                  <div key={`m-${i}`} className="shrink-0 text-center" style={{ width: 14 }}>
                    {showMonth && <span className="text-[8px] text-muted-foreground font-medium">{date.toLocaleDateString('de-DE', { month: 'short' })}</span>}
                  </div>
                )
              })}
            </div>
            {/* Balken */}
            <div className="flex items-end gap-px h-28">
              {data.map((d, i) => {
                const date = new Date(d.date + 'T00:00:00')
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const heightPct = (d.count / maxCount) * 100
                return (
                  <div
                    key={d.date}
                    className={`shrink-0 rounded-t transition-colors cursor-default ${d.count > 0 ? `${color}/80 hover:${color}` : isWeekend ? 'bg-muted/60' : 'bg-muted/30'}`}
                    style={{ width: 13, height: d.count > 0 ? `${Math.max(heightPct, 8)}%` : '4px' }}
                    title={`${date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}: ${d.count} ${label}`}
                  />
                )
              })}
            </div>
            {/* Tag-Header */}
            <div className="flex border-t mt-0.5 pt-0.5">
              {data.map((d, i) => {
                const date = new Date(d.date + 'T00:00:00')
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const showDay = i % 7 === 0 || i === data.length - 1
                return (
                  <div key={`d-${i}`} className="shrink-0 text-center" style={{ width: 14 }}>
                    {showDay && <span className={`text-[8px] ${isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{String(date.getDate()).padStart(2, '0')}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
