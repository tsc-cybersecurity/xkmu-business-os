'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Save, Search, Plus } from 'lucide-react'
import { QuickCreateCompanyDialog, QuickCreatePersonDialog } from '@/components/shared'
import { logger } from '@/lib/utils/logger'

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

interface User {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

export default function NewLeadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [personSearch, setPersonSearch] = useState('')
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showCreatePerson, setShowCreatePerson] = useState(false)

  const [formData, setFormData] = useState({
    companyId: searchParams.get('companyId') || '',
    personId: searchParams.get('personId') || '',
    source: 'manual',
    sourceDetail: '',
    status: 'new',
    score: '',
    assignedTo: '',
    notes: '',
  })

  useEffect(() => {
    fetchCompanies()
    fetchPersons()
    fetchUsers()
  }, [])

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
      logger.error('Failed to fetch companies', error, { module: 'LeadsNewPage' })
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
      logger.error('Failed to fetch persons', error, { module: 'LeadsNewPage' })
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
      logger.error('Failed to fetch users', error, { module: 'LeadsNewPage' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: formData.source,
          sourceDetail: formData.sourceDetail || undefined,
          status: formData.status,
          companyId: formData.companyId || null,
          personId: formData.personId || null,
          assignedTo: formData.assignedTo || null,
          score: formData.score ? parseInt(formData.score) : 0,
          rawData: formData.notes ? { notes: formData.notes } : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Lead erfolgreich erstellt')
        router.push(`/intern/leads/${data.data.id}`)
      } else {
        throw new Error(data.error?.message || 'Fehler beim Erstellen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
          <Link href="/intern/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Neuer Lead</h1>
          <p className="text-muted-foreground">
            Erstellen Sie einen neuen Lead
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source">Quelle *</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuell</SelectItem>
                    <SelectItem value="form">Formular</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceDetail">Quellen-Details</Label>
                <Input
                  id="sourceDetail"
                  value={formData.sourceDetail}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceDetail: e.target.value })
                  }
                  placeholder="z.B. Kontaktformular Homepage, Messe XY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData({ ...formData, score: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Zugewiesen an</Label>
                <Select
                  value={formData.assignedTo || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedTo: value === 'none' ? '' : value })
                  }
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verknupfungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyId">Firma</Label>
                <Select
                  value={formData.companyId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, companyId: value === 'none' ? '' : value })
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
                    <div className="p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); setShowCreateCompany(true) }}
                      >
                        <Plus className="h-4 w-4" />
                        Neue Firma anlegen
                      </button>
                    </div>
                    <SelectItem value="none">Keine Firma</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personId">Person</Label>
                <Select
                  value={formData.personId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, personId: value === 'none' ? '' : value })
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
                    <div className="p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); setShowCreatePerson(true) }}
                      >
                        <Plus className="h-4 w-4" />
                        Neue Person anlegen
                      </button>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Zusätzliche Informationen zum Lead..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" asChild>
            <Link href="/intern/leads">Abbrechen</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Wird erstellt...' : 'Lead erstellen'}
          </Button>
        </div>
      </form>

      <QuickCreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onCreated={(company) => {
          setCompanies((prev) => [company, ...prev])
          setFormData((prev) => ({ ...prev, companyId: company.id }))
        }}
      />
      <QuickCreatePersonDialog
        open={showCreatePerson}
        onOpenChange={setShowCreatePerson}
        companies={companies}
        preselectedCompanyId={formData.companyId}
        onCreated={(person) => {
          setPersons((prev) => [person, ...prev])
          setFormData((prev) => ({ ...prev, personId: person.id }))
        }}
      />
    </div>
  )
}
