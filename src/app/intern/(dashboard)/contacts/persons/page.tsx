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
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  jobTitle: string | null
  companyId: string | null
  company: { id: string; name: string } | null
  status: string
  tags: string[]
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  do_not_contact: 'Nicht kontaktieren',
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPersons()
  }, [search])

  const fetchPersons = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/v1/persons?${params}`)
      const data = await response.json()

      if (data.success) {
        setPersons(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch persons', error, { module: 'ContactsPersonsPage' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (person: Person) => {
    const label = `${person.firstName} ${person.lastName}`.trim() || 'diese Person'
    if (!confirm(`"${label}" wirklich löschen?`)) return
    try {
      const res = await fetch(`/api/v1/persons/${person.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Person gelöscht')
        setPersons(prev => prev.filter(p => p.id !== person.id))
      } else {
        toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to delete person', error, { module: 'ContactsPersonsPage' })
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Personenkontakte
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/intern/contacts/persons/new">
            <Plus className="mr-2 h-4 w-4" />
            Neue Person
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : persons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Personen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihren ersten Kontakt, um loszulegen.
              </p>
              <Button asChild className="mt-4">
                <Link href="/intern/contacts/persons/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Neue Person erstellen
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-24 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persons.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Link
                        href={`/intern/contacts/persons/${person.id}`}
                        className="font-medium hover:underline"
                      >
                        {person.firstName} {person.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {person.company ? (
                        <Link
                          href={`/intern/contacts/companies/${person.company.id}`}
                          className="text-primary hover:underline"
                        >
                          {person.company.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{person.email || '-'}</TableCell>
                    <TableCell>{person.jobTitle || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {statusLabels[person.status] || person.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {person.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {person.tags?.length > 3 && (
                          <Badge variant="outline">
                            +{person.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Bearbeiten">
                          <Link href={`/intern/contacts/persons/${person.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Löschen"
                          onClick={() => handleDelete(person)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
