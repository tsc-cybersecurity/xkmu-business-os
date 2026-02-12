'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog, AIResearchCard } from '@/components/shared'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  Brain,
  Edit,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react'

interface Person {
  id: string
  salutation: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  jobTitle: string | null
  department: string | null
  companyId: string | null
  street: string | null
  houseNumber: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  status: string
  isPrimaryContact: boolean
  tags: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  do_not_contact: 'Nicht kontaktieren',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  do_not_contact: 'bg-red-500',
}

export default function PersonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [person, setPerson] = useState<Person | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const personId = params.id as string

  useEffect(() => {
    fetchPerson()
  }, [personId])

  const fetchPerson = async () => {
    try {
      const response = await fetch(`/api/v1/persons/${personId}`)
      const data = await response.json()

      if (data.success) {
        setPerson(data.data)
        if (data.data.companyId) {
          fetchCompany(data.data.companyId)
        }
      } else {
        toast.error('Person nicht gefunden')
        router.push('/intern/contacts/persons')
      }
    } catch (error) {
      console.error('Failed to fetch person:', error)
      toast.error('Fehler beim Laden der Person')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`)
      const data = await response.json()
      if (data.success) {
        setCompany(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch company:', error)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/persons/${personId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Person erfolgreich gelöscht')
        router.push('/intern/contacts/persons')
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

  if (!person) {
    return null
  }

  const fullName = [person.salutation, person.firstName, person.lastName]
    .filter(Boolean)
    .join(' ')

  const formatAddress = () => {
    const parts = []
    if (person.street) {
      parts.push(`${person.street} ${person.houseNumber || ''}`.trim())
    }
    if (person.postalCode || person.city) {
      parts.push(`${person.postalCode || ''} ${person.city || ''}`.trim())
    }
    return parts.join(', ') || null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/contacts/persons">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{fullName}</h1>
              {person.isPrimaryContact && (
                <Badge variant="secondary">Hauptkontakt</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[person.status]}>
                {statusLabels[person.status] || person.status}
              </Badge>
              {person.jobTitle && (
                <span className="text-muted-foreground">{person.jobTitle}</span>
              )}
              {person.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/intern/contacts/persons/${personId}/edit`}>
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
                  <User className="h-5 w-5" />
                  Kontaktdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {person.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-Mail</p>
                      <a
                        href={`mailto:${person.email}`}
                        className="hover:underline"
                      >
                        {person.email}
                      </a>
                    </div>
                  </div>
                )}

                {person.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a
                        href={`tel:${person.phone}`}
                        className="hover:underline"
                      >
                        {person.phone}
                      </a>
                    </div>
                  </div>
                )}

                {person.mobile && (
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mobil</p>
                      <a
                        href={`tel:${person.mobile}`}
                        className="hover:underline"
                      >
                        {person.mobile}
                      </a>
                    </div>
                  </div>
                )}

                {formatAddress() && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Privatadresse
                      </p>
                      <p>{formatAddress()}</p>
                    </div>
                  </div>
                )}

                {!person.email &&
                  !person.phone &&
                  !person.mobile &&
                  !formatAddress() && (
                    <p className="text-muted-foreground">
                      Keine Kontaktdaten vorhanden
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Firma & Position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Firma & Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Firma</dt>
                    <dd>
                      {company ? (
                        <Link
                          href={`/intern/contacts/companies/${company.id}`}
                          className="hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Position</dt>
                    <dd>{person.jobTitle || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Abteilung</dt>
                    <dd>{person.department || '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Notizen */}
          {person.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{person.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-research" className="space-y-6">
          <AIResearchCard
            entityType="person"
            entityId={personId}
            entityLabel={`${person.firstName} ${person.lastName}`}
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Aktivitäten-Tracking wird in einer späteren Version verfügbar
                sein.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Person löschen"
        description={`Möchten Sie "${fullName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
