'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Company {
  id: string
  name: string
  city: string | null
  status: string
  email: string | null
  phone: string | null
  tags: string[]
  createdAt: string
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [search])

  const fetchCompanies = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/v1/companies?${params}`)
      const data = await response.json()

      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch companies', error, { module: 'ContactsCompaniesPage' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (company: Company) => {
    if (!confirm(`Firma "${company.name}" wirklich löschen?`)) return
    try {
      const res = await fetch(`/api/v1/companies/${company.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Firma gelöscht')
        setCompanies(prev => prev.filter(c => c.id !== company.id))
      } else {
        toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      logger.error('Failed to delete company', error, { module: 'ContactsCompaniesPage' })
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Firmen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Firmenkontakte
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/intern/contacts/companies/new">
            <Plus className="mr-2 h-4 w-4" />
            Neue Firma
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
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Firmen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihre erste Firma, um loszulegen.
              </p>
              <Button asChild className="mt-4">
                <Link href="/intern/contacts/companies/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Neue Firma erstellen
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stadt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-24 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        href={`/intern/contacts/companies/${company.id}`}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell>{company.city || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[company.status]}
                      >
                        {statusLabels[company.status] || company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {company.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {company.tags?.length > 3 && (
                          <Badge variant="outline">
                            +{company.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Bearbeiten">
                          <Link href={`/intern/contacts/companies/${company.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Löschen"
                          onClick={() => handleDelete(company)}
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
