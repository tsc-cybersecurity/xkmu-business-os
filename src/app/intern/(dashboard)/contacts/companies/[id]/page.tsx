'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import { Brain, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatContext } from '@/components/chat/chat-provider'
import { ActivityTimeline } from '@/app/intern/(dashboard)/leads/_components/activity-timeline'
import { logger } from '@/lib/utils/logger'
import { CompanyDetailsHeader } from './_components/company-details-header'
import { CompanyInfoCard } from './_components/company-info-card'
import { CompanyContactsSection } from './_components/company-contacts-section'
import { CompanyResearchSection } from './_components/company-research-section'
import { CompanyActionsGrid } from './_components/company-actions-grid'

interface AIResearchData {
  lastResearchedAt?: string
  description?: string | null
  foundedYear?: string | null
  headquarters?: string | null
  targetMarket?: string | null
  website?: string | null
  products?: string[]
  services?: string[]
  technologies?: string[]
  certifications?: string[]
  competitors?: string[]
  strengths?: string[]
  addresses?: Array<{
    label?: string
    street?: string
    houseNumber?: string
    postalCode?: string
    city?: string
    country?: string
    phone?: string
    email?: string
  }>
  socialMedia?: Record<string, string>
  financials?: Record<string, string>
}

interface Company {
  id: string
  name: string
  legalForm: string | null
  street: string | null
  houseNumber: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  industry: string | null
  employeeCount: number | null
  annualRevenue: string | null
  vatId: string | null
  status: string
  tags: string[]
  notes: string | null
  customFields: {
    aiResearch?: AIResearchData
    documentAnalysis?: {
      summary: string
      financialKPIs: Record<string, string>
      documentType: string
      fileName?: string
      analyzedAt: string
    }
  } | null
  createdAt: string
  updatedAt: string
}

interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  jobTitle: string | null
  isPrimaryContact: boolean
}

// Interface for available persons (without company assignment)
interface AvailablePerson {
  id: string
  firstName: string
  lastName: string
  email: string | null
  companyId: string | null
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // State for document analysis
  const [analyzingDoc, setAnalyzingDoc] = useState(false)

  // State for person selection dialog
  const [selectPersonDialogOpen, setSelectPersonDialogOpen] = useState(false)
  const [availablePersons, setAvailablePersons] = useState<AvailablePerson[]>([])
  const [personSearch, setPersonSearch] = useState('')
  const [loadingPersons, setLoadingPersons] = useState(false)
  const [assigningPerson, setAssigningPerson] = useState<string | null>(null)

  const { openChat } = useChatContext()
  const companyId = params.id as string

  useEffect(() => {
    fetchCompany()
    fetchPersons()
  }, [companyId])

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`)
      const data = await response.json()

      if (data.success) {
        setCompany(data.data)
      } else {
        toast.error('Firma nicht gefunden')
        router.push('/intern/contacts/companies')
      }
    } catch (error) {
      logger.error('Failed to fetch company', error, { module: 'ContactsCompaniesPage' })
      toast.error('Fehler beim Laden der Firma')
    } finally {
      setLoading(false)
    }
  }

  const fetchPersons = async () => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/persons`)
      const data = await response.json()

      if (data.success) {
        setPersons(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch persons', error, { module: 'ContactsCompaniesPage' })
    }
  }

  const fetchAvailablePersons = async (search: string = '') => {
    setLoadingPersons(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '50')

      const response = await fetch(`/api/v1/persons?${params}`)
      const data = await response.json()

      if (data.success) {
        // Filter out persons already assigned to this company
        const filtered = data.data.filter(
          (p: AvailablePerson) => p.companyId !== companyId
        )
        setAvailablePersons(filtered)
      }
    } catch (error) {
      logger.error('Failed to fetch available persons', error, { module: 'ContactsCompaniesPage' })
    } finally {
      setLoadingPersons(false)
    }
  }

  const handleOpenSelectPersonDialog = () => {
    setSelectPersonDialogOpen(true)
    setPersonSearch('')
    fetchAvailablePersons()
  }

  const handleAssignPerson = async (personId: string) => {
    setAssigningPerson(personId)
    try {
      const response = await fetch(`/api/v1/persons/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        toast.success('Person wurde der Firma zugeordnet')
        setSelectPersonDialogOpen(false)
        fetchPersons() // Refresh the persons list
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Zuordnung fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler bei der Zuordnung'
      )
    } finally {
      setAssigningPerson(null)
    }
  }

  const handleAnalyzeDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Bitte waehlen Sie eine PDF-Datei aus')
      return
    }

    setAnalyzingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/v1/companies/${companyId}/analyze-document`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Dokument erfolgreich analysiert')
        fetchCompany() // Reload to show results
      } else {
        toast.error(data.error?.message || 'Analyse fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler bei der Dokumentanalyse')
    } finally {
      setAnalyzingDoc(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Firma erfolgreich gelöscht')
        router.push('/intern/contacts/companies')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Löschen'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CompanyDetailsHeader
          company={company}
          onDeleteClick={() => setDeleteDialogOpen(true)}
        />
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto shrink-0"
          onClick={() => openChat({
            type: 'company',
            title: company.name,
            data: {
              name: company.name,
              industry: company.industry,
              city: company.city,
              status: company.status,
              phone: company.phone,
              email: company.email,
              website: company.website,
              notes: company.notes,
            },
          })}
        >
          <Brain className="mr-2 h-4 w-4" />
          KI fragen
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="contacts">
            Ansprechpartner ({persons.length})
          </TabsTrigger>
          <TabsTrigger value="ai-research">
            <Brain className="h-4 w-4 mr-1" />
            KI-Recherche
          </TabsTrigger>
          <TabsTrigger value="ai-actions">
            <Sparkles className="h-4 w-4 mr-1" />
            KI-Aktionen
          </TabsTrigger>
          <TabsTrigger value="activity">Aktivitäten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CompanyInfoCard
            company={company}
            analyzingDoc={analyzingDoc}
            onAnalyzeDocument={handleAnalyzeDocument}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <CompanyContactsSection
            companyId={companyId}
            persons={persons}
            selectPersonDialogOpen={selectPersonDialogOpen}
            onSelectPersonDialogOpenChange={setSelectPersonDialogOpen}
            onOpenSelectPersonDialog={handleOpenSelectPersonDialog}
            availablePersons={availablePersons}
            personSearch={personSearch}
            onPersonSearchChange={setPersonSearch}
            onFetchAvailablePersons={fetchAvailablePersons}
            loadingPersons={loadingPersons}
            assigningPerson={assigningPerson}
            onAssignPerson={handleAssignPerson}
          />
        </TabsContent>

        <TabsContent value="ai-research" className="space-y-6">
          <CompanyResearchSection
            companyId={companyId}
            company={company}
            onResearchComplete={() => fetchCompany()}
          />
        </TabsContent>

        <TabsContent value="ai-actions">
          <CompanyActionsGrid companyId={companyId} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimeline companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Firma löschen"
        description={`Möchten Sie "${company.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
