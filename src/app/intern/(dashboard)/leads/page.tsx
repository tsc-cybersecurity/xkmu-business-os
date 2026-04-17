'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, TrendingUp, Filter } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Lead {
  id: string
  title: string | null
  source: string
  sourceDetail: string | null
  status: string
  score: number | null
  aiResearchStatus: string | null
  createdAt: string
  company: { id: string; name: string } | null
  person: { id: string; firstName: string; lastName: string; email: string | null } | null
  assignedToUser: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  contactFirstName: string | null
  contactLastName: string | null
  contactCompany: string | null
  contactEmail: string | null
}

const statusLabels: Record<string, string> = {
  new: 'Neu',
  qualifying: 'Qualifizierung',
  qualified: 'Qualifiziert',
  contacted: 'Kontaktiert',
  meeting_scheduled: 'Termin vereinbart',
  proposal_sent: 'Angebot gesendet',
  won: 'Gewonnen',
  lost: 'Verloren',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  qualifying: 'bg-yellow-500',
  qualified: 'bg-green-400',
  contacted: 'bg-purple-500',
  meeting_scheduled: 'bg-indigo-500',
  proposal_sent: 'bg-orange-500',
  won: 'bg-green-600',
  lost: 'bg-gray-500',
}

const sourceLabels: Record<string, string> = {
  api: 'API',
  form: 'Formular',
  import: 'Import',
  manual: 'Manuell',
  idea: 'Idee',
  website: 'Website',
}

const aiStatusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  processing: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [search, statusFilter])

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') {
        // Open leads = all except won and lost
        if (statusFilter === 'open') {
          params.set('status', 'new,qualifying,qualified,contacted,meeting_scheduled,proposal_sent')
        } else {
          params.set('status', statusFilter)
        }
      }

      const response = await fetch(`/api/v1/leads?${params}`)
      const data = await response.json()

      if (data.success) {
        setLeads(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch leads', error, { module: 'LeadsPage' })
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

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600 font-bold'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Verkaufschancen
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/intern/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Lead
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="new">Neu</SelectItem>
                  <SelectItem value="qualifying">Qualifizierung</SelectItem>
                  <SelectItem value="qualified">Qualifiziert</SelectItem>
                  <SelectItem value="contacted">Kontaktiert</SelectItem>
                  <SelectItem value="meeting_scheduled">Termin vereinbart</SelectItem>
                  <SelectItem value="proposal_sent">Angebot gesendet</SelectItem>
                  <SelectItem value="won">Gewonnen</SelectItem>
                  <SelectItem value="lost">Verloren</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-10 flex-[2] rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 w-16 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                  <div className="h-10 flex-1 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Leads</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihren ersten Lead, um loszulegen.
              </p>
              <Button asChild className="mt-4">
                <Link href="/intern/leads/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Lead
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma / Person</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>KI-Status</TableHead>
                  <TableHead>Zugewiesen</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link
                        href={`/intern/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.title ||
                          lead.company?.name ||
                          (lead.person
                            ? `${lead.person.firstName} ${lead.person.lastName}`.trim()
                            : (lead.contactFirstName || lead.contactLastName)
                              ? `${lead.contactFirstName || ''} ${lead.contactLastName || ''}`.trim()
                              : lead.sourceDetail || 'Unbekannt')}
                      </Link>
                      {(() => {
                        const subtitle = lead.company?.name
                          || (lead.person ? `${lead.person.firstName || ''} ${lead.person.lastName || ''}`.trim() : null)
                          || lead.contactCompany
                          || lead.contactEmail
                        return subtitle && lead.title ? (
                          <p className="text-sm text-muted-foreground">{subtitle}</p>
                        ) : null
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sourceLabels[lead.source] || lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status] || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getScoreColor(lead.score)}>
                        {lead.score !== null ? `${lead.score}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {aiStatusLabels[lead.aiResearchStatus || 'pending'] || lead.aiResearchStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.assignedToUser
                        ? `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.trim() || lead.assignedToUser.email
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
