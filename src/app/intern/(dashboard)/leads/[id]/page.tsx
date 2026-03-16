'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import { useChatContext } from '@/components/chat/chat-provider'
import { LeadDetailsHeader } from './_components/lead-details-header'
import { LeadInfoCard } from './_components/lead-info-card'
import { LeadOutreachSection } from './_components/lead-outreach-section'
import { LeadResearchSection } from './_components/lead-research-section'

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

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { openChat } = useChatContext()
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
        <LeadDetailsHeader
          lead={lead}
          editing={editing}
          saving={saving}
          editTitle={editData.title}
          onEditTitleChange={(title) => setEditData({ ...editData, title })}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onSave={saveChanges}
          onDeleteClick={() => setDeleteDialogOpen(true)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => openChat({
            type: 'lead',
            title: lead.title || `Lead #${lead.id.slice(0, 8)}`,
            data: {
              title: lead.title,
              source: lead.source,
              status: lead.status,
              score: lead.score,
              company: lead.company?.name || lead.contactCompany,
              contactName: [lead.contactFirstName, lead.contactLastName].filter(Boolean).join(' ') || [lead.person?.firstName, lead.person?.lastName].filter(Boolean).join(' '),
              contactEmail: lead.contactEmail || lead.person?.email,
              contactPhone: lead.contactPhone,
              notes: lead.notes,
            },
          })}
        >
          <Brain className="mr-2 h-4 w-4" />
          KI fragen
        </Button>
      </div>

      {/* Content - Info Card with sidebar */}
      <LeadInfoCard
        lead={lead}
        users={users}
        companies={companies}
        persons={persons}
        editing={editing}
        editData={editData}
        onEditDataChange={setEditData}
        companySearch={companySearch}
        onCompanySearchChange={setCompanySearch}
        personSearch={personSearch}
        onPersonSearchChange={setPersonSearch}
        rawDataExpanded={rawDataExpanded}
        onRawDataExpandedChange={setRawDataExpanded}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
        formatDate={formatDate}
      />

      {/* AI Research */}
      <LeadResearchSection
        aiResearchStatus={lead.aiResearchStatus}
        aiResearchResult={lead.aiResearchResult}
        hasCompanyOrPerson={!!(lead.company || lead.person)}
        researching={researching}
        onStartResearch={handleStartResearch}
        formatDate={formatDate}
      />

      {/* Activity Timeline with Outreach */}
      <LeadOutreachSection
        leadId={leadId}
        companyId={lead.company?.id}
        aiResearchCompleted={lead.aiResearchStatus === 'completed'}
      />

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
