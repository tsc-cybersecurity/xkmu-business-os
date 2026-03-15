'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Trash2,
  Brain,
  TrendingUp,
  Calendar,
  UserCircle,
  Pencil,
  Save,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Tag,
} from 'lucide-react'
import { ActivityTimeline } from '../_components/activity-timeline'
import { logger } from '@/lib/utils/logger'

interface Lead {
  id: string
  title: string | null
  source: string
  sourceDetail: string | null
  status: string
  score: number | null
  tags: string[] | null
  notes: string | null
  aiResearchStatus: string | null
  aiResearchResult: Record<string, unknown> | null
  rawData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  company: { id: string; name: string } | null
  person: { id: string; firstName: string; lastName: string; email: string | null } | null
  assignedToUser: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  contactFirstName: string | null
  contactLastName: string | null
  contactCompany: string | null
  contactPhone: string | null
  contactEmail: string | null
}

interface UserData {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface Company {
  id: string
  name: string
}

interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
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

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [personSearch, setPersonSearch] = useState('')
  const [rawDataExpanded, setRawDataExpanded] = useState(false)
  const [researching, setResearching] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    sourceDetail: '',
    score: '',
    notes: '',
    tags: [] as string[],
    companyId: '',
    personId: '',
  })

  useEffect(() => {
    fetchLead()
    fetchUsers()
    fetchCompanies()
    fetchPersons()
  }, [leadId])

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`)
      const data = await response.json()

      if (data.success) {
        setLead(data.data)
      } else {
        toast.error('Lead nicht gefunden')
        router.push('/intern/leads')
      }
    } catch (error) {
      logger.error('Failed to fetch lead', error, { module: 'LeadsPage' })
      toast.error('Fehler beim Laden des Leads')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch users', error, { module: 'LeadsPage' })
    }
  }

  const fetchCompanies = async (search = '') => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '50')

      const response = await fetch(`/api/v1/companies?${params}`)
      const data = await response.json()

      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch companies', error, { module: 'LeadsPage' })
    }
  }

  const fetchPersons = async (search = '') => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '50')

      const response = await fetch(`/api/v1/persons?${params}`)
      const data = await response.json()

      if (data.success) {
        setPersons(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch persons', error, { module: 'LeadsPage' })
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (companySearch) {
        fetchCompanies(companySearch)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [companySearch])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (personSearch) {
        fetchPersons(personSearch)
      }
    }, 300)
    return () => clearTimeout(timeoutId)

  }, [personSearch])

  const startEditing = () => {
    if (lead) {
      setEditData({
        title: lead.title || '',
        sourceDetail: lead.sourceDetail || '',
        score: lead.score?.toString() || '',
        notes: lead.notes || '',
        tags: lead.tags || [],
        companyId: lead.company?.id || '',
        personId: lead.person?.id || '',
      })
      setEditing(true)
    }
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title || null,
          sourceDetail: editData.sourceDetail || null,
          score: editData.score ? parseInt(editData.score) : 0,
          notes: editData.notes || null,
          tags: editData.tags,
          companyId: editData.companyId || null,
          personId: editData.personId || null,
        }),
      })

      if (response.ok) {
        toast.success('Änderungen gespeichert')
        setEditing(false)
        fetchLead()
      } else {
        throw new Error('Speichern fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success('Status aktualisiert')
        fetchLead()
      } else {
        throw new Error('Status-Änderung fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status')
    }
  }

  const handleAssigneeChange = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: userId || null }),
      })

      if (response.ok) {
        toast.success('Zuweisung aktualisiert')
        fetchLead()
      } else {
        throw new Error('Zuweisung fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler bei der Zuweisung')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Lead erfolgreich gelöscht')
        router.push('/intern/leads')
      } else {
        throw new Error('Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const handleStartResearch = async () => {
    // Check if we have enough data
    if (!lead?.company && !lead?.person) {
      toast.error('Bitte verknüpfen Sie zuerst eine Firma oder Person mit dem Lead')
      return
    }

    setResearching(true)
    try {
      const response = await fetch(`/api/v1/leads/${leadId}/research`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('KI-Recherche erfolgreich abgeschlossen')
        fetchLead() // Refresh to show results
      } else {
        throw new Error(data.error?.message || 'Recherche fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler bei der KI-Recherche')
    } finally {
      setResearching(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!lead) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            {editing ? (
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Lead-Titel eingeben..."
                className="text-2xl font-bold h-auto py-1 mb-2"
              />
            ) : (
              <h1 className="text-3xl font-bold">
                {lead.title ||
                  lead.company?.name ||
                  (lead.person
                    ? `${lead.person.firstName} ${lead.person.lastName}`
                    : lead.sourceDetail || 'Lead')}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[lead.status]}>
                {statusLabels[lead.status] || lead.status}
              </Badge>
              <Badge variant="outline">
                {sourceLabels[lead.source] || lead.source}
              </Badge>
              {lead.score !== null && (
                <span className={`font-bold ${getScoreColor(lead.score)}`}>
                  Score: {lead.score}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Abbrechen
              </Button>
              <Button onClick={saveChanges} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Status & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline-Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={lead.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zugewiesen an</label>
                  <Select
                    value={lead.assignedToUser?.id || 'none'}
                    onValueChange={(value) => handleAssigneeChange(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nicht zugewiesen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nicht zugewiesen</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes / Description */}
          <Card>
            <CardHeader>
              <CardTitle>Beschreibung / Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Worum geht es bei diesem Lead? Zusätzliche Informationen..."
                  rows={6}
                  className="min-h-[150px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap min-h-[80px]">
                  {lead.notes || (
                    <span className="text-muted-foreground">Keine Beschreibung vorhanden. Klicken Sie auf "Bearbeiten" um eine Beschreibung hinzuzufügen.</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Research */}
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
                    lead.aiResearchStatus === 'completed' ? 'default' :
                    lead.aiResearchStatus === 'processing' ? 'secondary' :
                    lead.aiResearchStatus === 'failed' ? 'destructive' :
                    'outline'
                  }
                >
                  {aiStatusLabels[lead.aiResearchStatus || 'pending']}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartResearch}
                  disabled={researching || lead.aiResearchStatus === 'processing'}
                >
                  {researching || lead.aiResearchStatus === 'processing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recherche läuft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {lead.aiResearchStatus === 'completed' ? 'Erneut recherchieren' : 'Recherche starten'}
                    </>
                  )}
                </Button>
              </div>

              {lead.aiResearchResult ? (
                (() => {
                  const r = lead.aiResearchResult as Record<string, unknown>
                  const score = r.score as number | undefined
                  const getScoreEmoji = (s: number) => {
                    if (s >= 80) return '🔥'
                    if (s >= 60) return '😊'
                    if (s >= 40) return '😐'
                    if (s >= 20) return '😕'
                    return '❄️'
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
                        // Separate scalar vs array fields
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

                            {/* Description */}
                            {c.description ? (
                              <p className="text-sm text-muted-foreground">{String(c.description)}</p>
                            ) : null}

                            {/* Scalar fields in grid */}
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

                            {/* Array fields, each full-width */}
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
                })()
              ) : (
                <p className="text-muted-foreground text-sm">
                  {!lead.company && !lead.person ? (
                    'Bitte verknüpfen Sie zuerst eine Firma oder Person, um die KI-Recherche zu starten.'
                  ) : (
                    'Noch keine KI-Recherche durchgeführt. Klicken Sie auf "Recherche starten", um automatisch Informationen über diesen Lead zu sammeln.'
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <ActivityTimeline
            leadId={leadId}
            companyId={lead.company?.id}
            showOutreachButton={true}
            outreachEnabled={lead.aiResearchStatus === 'completed'}
          />

          {/* Raw Data */}
          {lead.rawData && Object.keys(lead.rawData).length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setRawDataExpanded(!rawDataExpanded)}>
                <div className="flex items-center justify-between">
                  <CardTitle>Rohdaten</CardTitle>
                  <Button variant="ghost" size="sm">
                    {rawDataExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {rawDataExpanded && (
                <CardContent>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto max-h-60">
                    {JSON.stringify(lead.rawData, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Company */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Verknüpfte Firma
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Select
                  value={editData.companyId || 'none'}
                  onValueChange={(value) =>
                    setEditData({ ...editData, companyId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keine Firma" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Firma suchen..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <SelectItem value="none">Keine Firma</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : lead.company ? (
                <Link
                  href={`/intern/contacts/companies/${lead.company.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {lead.company.name}
                </Link>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Keine Firma verknüpft
                </p>
              )}
            </CardContent>
          </Card>

          {/* Linked Person */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Verknüpfte Person
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Select
                  value={editData.personId || 'none'}
                  onValueChange={(value) =>
                    setEditData({ ...editData, personId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keine Person" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Person suchen..."
                          value={personSearch}
                          onChange={(e) => setPersonSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <SelectItem value="none">Keine Person</SelectItem>
                    {persons.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                        {person.email && ` (${person.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : lead.person ? (
                <div>
                  <Link
                    href={`/intern/contacts/persons/${lead.person.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {lead.person.firstName} {lead.person.lastName}
                  </Link>
                  {lead.person.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {lead.person.email}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Keine Person verknüpft
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Info (from website form) */}
          {(lead.contactFirstName || lead.contactLastName || lead.contactEmail) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Kontaktdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(lead.contactFirstName || lead.contactLastName) && (
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span>{lead.contactFirstName} {lead.contactLastName}</span>
                  </div>
                )}
                {lead.contactCompany && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{lead.contactCompany}</span>
                  </div>
                )}
                {lead.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${lead.contactEmail}`} className="text-blue-600 hover:underline">
                      {lead.contactEmail}
                    </a>
                  </div>
                )}
                {lead.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${lead.contactPhone}`} className="hover:underline">
                      {lead.contactPhone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Quelle:</span>
                <span>{sourceLabels[lead.source] || lead.source}</span>
              </div>

              {lead.sourceDetail && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">Details:</span>
                  <span>{lead.sourceDetail}</span>
                </div>
              )}

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-6">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Erstellt:</span>
                <span>{formatDate(lead.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Aktualisiert:</span>
                <span>{formatDate(lead.updatedAt)}</span>
              </div>

              {lead.assignedToUser && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bearbeiter:</span>
                  <span>
                    {lead.assignedToUser.firstName || lead.assignedToUser.lastName
                      ? `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.trim()
                      : lead.assignedToUser.email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Lead löschen"
        description="Möchten Sie diesen Lead wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
