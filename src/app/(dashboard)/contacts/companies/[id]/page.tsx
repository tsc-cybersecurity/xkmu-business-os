'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ConfirmDialog, AIResearchCard } from '@/components/shared'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Award,
  Building2,
  ChevronDown,
  Cpu,
  Edit,
  ExternalLink,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Shield,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Brain,
  Wrench,
  Calendar,
  FileText,
  Upload,
  Loader2,
} from 'lucide-react'
import { ActivityTimeline } from '@/app/(dashboard)/leads/_components/activity-timeline'

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

const statusLabels: Record<string, string> = {
  prospect: 'Interessent',
  lead: 'Lead',
  customer: 'Kunde',
  partner: 'Partner',
  churned: 'Verloren',
  inactive: 'Inaktiv',
}

const statusColors: Record<string, string> = {
  prospect: 'bg-gray-500',
  lead: 'bg-blue-500',
  customer: 'bg-green-500',
  partner: 'bg-purple-500',
  churned: 'bg-red-500',
  inactive: 'bg-gray-400',
}

// Interface for available persons (without company assignment)
interface AvailablePerson {
  id: string
  firstName: string
  lastName: string
  email: string | null
  companyId: string | null
}

// ============================================
// KI-Recherche Overview component for the Overview tab
// ============================================
function AIResearchOverview({ research }: { research: AIResearchData }) {
  const hasDescription = research.description && research.description !== 'Nicht ermittelbar'
  const hasProducts = research.products && research.products.length > 0
  const hasServices = research.services && research.services.length > 0
  const hasTechnologies = research.technologies && research.technologies.length > 0
  const hasCertifications = research.certifications && research.certifications.length > 0
  const hasCompetitors = research.competitors && research.competitors.length > 0
  const hasStrengths = research.strengths && research.strengths.length > 0
  const hasFoundedYear = research.foundedYear && research.foundedYear !== 'Nicht ermittelbar'
  const hasHeadquarters = research.headquarters && research.headquarters !== 'Nicht ermittelbar'
  const hasTargetMarket = research.targetMarket && research.targetMarket !== 'Nicht ermittelbar'
  const hasFinancials = research.financials && Object.values(research.financials).some(v => v && v !== 'null' && v !== 'Nicht ermittelbar')
  const hasSocialMedia = research.socialMedia && Object.values(research.socialMedia).some(v => v && v !== 'null')
  const hasAddresses = research.addresses && research.addresses.length > 0

  const hasAnyData = hasDescription || hasProducts || hasServices || hasTechnologies ||
    hasCertifications || hasCompetitors || hasStrengths || hasFoundedYear ||
    hasHeadquarters || hasTargetMarket || hasFinancials || hasSocialMedia || hasAddresses

  if (!hasAnyData) return null

  return (
    <>
      {/* Description + Key Data */}
      {(hasDescription || hasFoundedYear || hasHeadquarters || hasTargetMarket) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              KI-Recherche
              {research.lastResearchedAt && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Recherche vom {new Date(research.lastResearchedAt).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDescription && (
              <p className="text-sm text-muted-foreground">{research.description}</p>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hasFoundedYear && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Gründungsjahr</dt>
                    <dd className="text-sm font-medium">{research.foundedYear}</dd>
                  </div>
                </div>
              )}
              {hasHeadquarters && (
                <div className="flex items-start gap-2">
                  <Landmark className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Hauptsitz</dt>
                    <dd className="text-sm font-medium">{research.headquarters}</dd>
                  </div>
                </div>
              )}
              {hasTargetMarket && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Zielmarkt</dt>
                    <dd className="text-sm font-medium">{research.targetMarket}</dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Products, Services, Technologies */}
      {(hasProducts || hasServices || hasTechnologies || hasCertifications) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasProducts && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produkte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {research.products!.filter(p => p && p !== 'Nicht ermittelbar').map((product, i) => (
                    <Badge key={i} variant="secondary" className="text-xs max-w-full whitespace-normal break-words">
                      {product}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasServices && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Dienstleistungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {research.services!.filter(s => s && s !== 'Nicht ermittelbar').map((service, i) => (
                    <Badge key={i} variant="secondary" className="text-xs max-w-full whitespace-normal break-words">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasTechnologies && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Technologien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {research.technologies!.filter(t => t && t !== 'Nicht ermittelbar').map((tech, i) => (
                    <Badge key={i} variant="outline" className="text-xs max-w-full whitespace-normal break-words">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasCertifications && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Zertifizierungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {research.certifications!.filter(c => c && c !== 'Nicht ermittelbar').map((cert, i) => (
                    <Badge key={i} variant="outline" className="text-xs max-w-full whitespace-normal break-words">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Strengths & Competitors */}
      {(hasStrengths || hasCompetitors) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasStrengths && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Stärken / USP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {research.strengths!.filter(s => s && s !== 'Nicht ermittelbar').map((strength, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasCompetitors && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Wettbewerber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {research.competitors!.filter(c => c && c !== 'Nicht ermittelbar').map((comp, i) => (
                    <Badge key={i} variant="destructive" className="text-xs font-normal max-w-full whitespace-normal break-words">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Financials & Social Media */}
      {(hasFinancials || hasSocialMedia) && (
        <div className="grid gap-6 md:grid-cols-2">
          {hasFinancials && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Finanzen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {research.financials!.estimatedRevenue && research.financials!.estimatedRevenue !== 'Nicht ermittelbar' && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Geschätzter Umsatz</dt>
                      <dd className="text-sm font-medium">{research.financials!.estimatedRevenue}</dd>
                    </div>
                  )}
                  {research.financials!.growthTrend && research.financials!.growthTrend !== 'Nicht ermittelbar' && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Wachstumstrend</dt>
                      <dd className="text-sm font-medium">{research.financials!.growthTrend}</dd>
                    </div>
                  )}
                  {research.financials!.fundingStatus && research.financials!.fundingStatus !== 'Nicht ermittelbar' && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Finanzierung</dt>
                      <dd className="text-sm font-medium">{research.financials!.fundingStatus}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {hasSocialMedia && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Social Media
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(research.socialMedia!).map(([platform, url]) => {
                    if (!url || url === 'null') return null
                    const labels: Record<string, string> = {
                      linkedin: 'LinkedIn', xing: 'Xing', twitter: 'Twitter/X',
                      facebook: 'Facebook', instagram: 'Instagram',
                    }
                    return (
                      <div key={platform} className="flex justify-between items-center">
                        <dt className="text-sm text-muted-foreground">{labels[platform] || platform}</dt>
                        <dd className="text-sm">
                          <a
                            href={url.startsWith('http') ? url : `https://${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {url.length > 40 ? url.substring(0, 40) + '...' : url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Additional addresses from research */}
      {hasAddresses && research.addresses!.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Weitere Standorte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {research.addresses!.slice(1).map((addr, i) => {
                const parts: string[] = []
                if (addr.street) parts.push(`${addr.street} ${addr.houseNumber || ''}`.trim())
                if (addr.postalCode || addr.city) parts.push(`${addr.postalCode || ''} ${addr.city || ''}`.trim())
                if (addr.country && addr.country !== 'DE') parts.push(addr.country)
                return (
                  <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">{addr.label || `Standort ${i + 2}`}</p>
                    <p>{parts.join(', ')}</p>
                    {addr.phone && <p className="text-muted-foreground">Tel: {addr.phone}</p>}
                    {addr.email && <p className="text-muted-foreground">E-Mail: {addr.email}</p>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
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
        router.push('/contacts/companies')
      }
    } catch (error) {
      console.error('Failed to fetch company:', error)
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
      console.error('Failed to fetch persons:', error)
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
      console.error('Failed to fetch available persons:', error)
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
        router.push('/contacts/companies')
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

  const formatAddress = () => {
    const parts = []
    if (company.street) {
      parts.push(`${company.street} ${company.houseNumber || ''}`.trim())
    }
    if (company.postalCode || company.city) {
      parts.push(`${company.postalCode || ''} ${company.city || ''}`.trim())
    }
    return parts.join(', ') || 'Keine Adresse'
  }

  const formatCurrency = (value: string | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(value))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts/companies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{company.name}</h1>
              {company.legalForm && (
                <span className="text-muted-foreground">
                  {company.legalForm}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[company.status]}>
                {statusLabels[company.status] || company.status}
              </Badge>
              {company.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/contacts/companies/${companyId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="contacts">
            Ansprechpartner ({persons.length})
          </TabsTrigger>
          <TabsTrigger value="ai-research">
            <Brain className="h-4 w-4 mr-1" />
            KI-Recherche
          </TabsTrigger>
          <TabsTrigger value="activity">Aktivitäten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Kontaktdaten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Kontaktdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p>{formatAddress()}</p>
                  </div>
                </div>

                {company.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a
                        href={`tel:${company.phone}`}
                        className="hover:underline"
                      >
                        {company.phone}
                      </a>
                    </div>
                  </div>
                )}

                {company.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-Mail</p>
                      <a
                        href={`mailto:${company.email}`}
                        className="hover:underline"
                      >
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}

                {company.website && (
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle>Business-Informationen</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Branche</dt>
                    <dd>{company.industry || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Mitarbeiter</dt>
                    <dd>{company.employeeCount || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Jahresumsatz</dt>
                    <dd>{formatCurrency(company.annualRevenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">USt-IdNr.</dt>
                    <dd>{company.vatId || '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* KI-Recherche Daten aus customFields */}
          {company.customFields?.aiResearch && (
            <AIResearchOverview research={company.customFields.aiResearch} />
          )}

          {/* Notizen */}
          {company.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Dokumentanalyse */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dokumentanalyse
                </CardTitle>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleAnalyzeDocument}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    disabled={analyzingDoc}
                  />
                  <Button variant="outline" size="sm" disabled={analyzingDoc}>
                    {analyzingDoc ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {analyzingDoc ? 'Analysiere...' : 'PDF analysieren'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {company.customFields?.documentAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Typ: {company.customFields.documentAnalysis.documentType}</span>
                    {company.customFields.documentAnalysis.fileName && (
                      <>
                        <span>·</span>
                        <span>{company.customFields.documentAnalysis.fileName}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(company.customFields.documentAnalysis.analyzedAt).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Zusammenfassung</h4>
                    <p className="text-sm">{company.customFields.documentAnalysis.summary}</p>
                  </div>

                  {Object.keys(company.customFields.documentAnalysis.financialKPIs).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Extrahierte KPIs</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(company.customFields.documentAnalysis.financialKPIs).map(([key, value]) => {
                          if (!value) return null
                          const kpiLabels: Record<string, string> = {
                            revenue: 'Umsatz', profit: 'Gewinn', ebitda: 'EBITDA',
                            employeeCount: 'Mitarbeiter', growthRate: 'Wachstum',
                            netIncome: 'Nettoergebnis', totalAssets: 'Bilanzsumme',
                            equity: 'Eigenkapital', debtRatio: 'Verschuldungsgrad',
                          }
                          return (
                            <div key={key} className="p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">{kpiLabels[key] || key}</p>
                              <p className="text-sm font-medium">{value}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Laden Sie ein PDF (z.B. Geschaeftsbericht, Bilanz) hoch, um automatisch KPIs und eine Zusammenfassung zu extrahieren.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ansprechpartner
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Person hinzufügen
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/contacts/persons/new?companyId=${companyId}`}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Neue Person erstellen
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenSelectPersonDialog}>
                    <Search className="mr-2 h-4 w-4" />
                    Bestehende Person auswählen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {persons.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Keine Ansprechpartner vorhanden
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {persons.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <Link
                            href={`/contacts/persons/${person.id}`}
                            className="font-medium hover:underline"
                          >
                            {person.firstName} {person.lastName}
                            {person.isPrimaryContact && (
                              <Badge variant="secondary" className="ml-2">
                                Hauptkontakt
                              </Badge>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>{person.jobTitle || '-'}</TableCell>
                        <TableCell>
                          {person.email ? (
                            <a
                              href={`mailto:${person.email}`}
                              className="hover:underline"
                            >
                              {person.email}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{person.phone || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-research" className="space-y-6">
          <AIResearchCard
            entityType="company"
            entityId={companyId}
            entityLabel={company.name}
            onResearchComplete={() => {
              // Reload company data after research (CRM fields may have been updated)
              fetchCompany()
            }}
          />
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

      {/* Select Person Dialog */}
      <Dialog open={selectPersonDialogOpen} onOpenChange={setSelectPersonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bestehende Person auswählen</DialogTitle>
            <DialogDescription>
              Wählen Sie eine Person aus, die dieser Firma zugeordnet werden soll.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Person suchen..."
                value={personSearch}
                onChange={(e) => {
                  setPersonSearch(e.target.value)
                  fetchAvailablePersons(e.target.value)
                }}
                className="pl-9"
              />
            </div>

            {/* Persons List */}
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {loadingPersons ? (
                <div className="p-4 text-center text-muted-foreground">
                  Laden...
                </div>
              ) : availablePersons.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {personSearch
                    ? 'Keine Personen gefunden'
                    : 'Keine verfügbaren Personen'}
                </div>
              ) : (
                <div className="divide-y">
                  {availablePersons.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {person.firstName} {person.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {person.email || 'Keine E-Mail'}
                          {person.companyId && ' • Bereits einer Firma zugeordnet'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignPerson(person.id)}
                        disabled={assigningPerson === person.id}
                      >
                        {assigningPerson === person.id ? 'Wird zugeordnet...' : 'Auswählen'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
