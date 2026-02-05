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
import { Building2, Users, TrendingUp, Activity, Target } from 'lucide-react'

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
      console.error('Failed to fetch dashboard:', error)
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen bei xKMU Business OS
        </p>
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

      {/* 30-Tage-Trends */}
      {data?.trends && (data.trends.leads.length > 0 || data.trends.companies.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.trends.leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead-Trend (30 Tage)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {data.trends.leads.map((point) => {
                    const maxCount = Math.max(...data.trends.leads.map((p) => p.count), 1)
                    const heightPct = (point.count / maxCount) * 100
                    return (
                      <div
                        key={point.date}
                        className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                        title={`${new Date(point.date).toLocaleDateString('de-DE')}: ${point.count} Leads`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{data.trends.leads.length > 0 && new Date(data.trends.leads[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                  <span>Gesamt: {data.trends.leads.reduce((sum, p) => sum + p.count, 0)}</span>
                  <span>{data.trends.leads.length > 0 && new Date(data.trends.leads[data.trends.leads.length - 1].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {data.trends.companies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Firmen-Trend (30 Tage)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {data.trends.companies.map((point) => {
                    const maxCount = Math.max(...data.trends.companies.map((p) => p.count), 1)
                    const heightPct = (point.count / maxCount) * 100
                    return (
                      <div
                        key={point.date}
                        className="flex-1 bg-green-500/80 rounded-t hover:bg-green-500 transition-colors"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                        title={`${new Date(point.date).toLocaleDateString('de-DE')}: ${point.count} Firmen`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{data.trends.companies.length > 0 && new Date(data.trends.companies[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                  <span>Gesamt: {data.trends.companies.reduce((sum, p) => sum + p.count, 0)}</span>
                  <span>{data.trends.companies.length > 0 && new Date(data.trends.companies[data.trends.companies.length - 1].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              </CardContent>
            </Card>
          )}
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
                href="/contacts/companies"
                className="text-sm font-normal text-muted-foreground hover:underline"
              >
                Alle anzeigen
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentCompanies && data.recentCompanies.length > 0 ? (
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
                          href={`/contacts/companies/${company.id}`}
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
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Firmen vorhanden.{' '}
                <Link
                  href="/contacts/companies/new"
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
                href="/contacts/persons"
                className="text-sm font-normal text-muted-foreground hover:underline"
              >
                Alle anzeigen
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentPersons && data.recentPersons.length > 0 ? (
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
                          href={`/contacts/persons/${person.id}`}
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
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Personen vorhanden.{' '}
                <Link
                  href="/contacts/persons/new"
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
              href="/leads"
              className="text-sm font-normal text-muted-foreground hover:underline"
            >
              Alle anzeigen
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.openLeads && data.openLeads.length > 0 ? (
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
