'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Wrench } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Service {
  id: string
  type: string
  name: string
  description: string | null
  sku: string | null
  priceNet: string | null
  vatRate: string
  unit: string
  status: string
  tags: string[]
  category: Category | null
  createdAt: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  draft: 'Entwurf',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  draft: 'bg-yellow-500',
}

function formatPrice(priceNet: string | null): string {
  if (!priceNet) return '-'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(priceNet))
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter])

  useEffect(() => {
    fetchServices()
  }, [search, statusFilter, categoryFilter, page])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/product-categories')
      const data = await response.json()
      if (data.success) setCategories(data.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchServices = async () => {
    try {
      const params = new URLSearchParams()
      params.set('type', 'service')
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      params.set('page', page.toString())

      const response = await fetch(`/api/v1/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setServices(data.data)
        setMeta(data.meta)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dienstleistungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Dienstleistungen
          </p>
        </div>
        <Button asChild>
          <Link href="/intern/catalog/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Neue Dienstleistung
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name oder SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Alle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle Kategorien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Dienstleistungen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihre erste Dienstleistung, um loszulegen.
              </p>
              <Button asChild className="mt-4">
                <Link href="/intern/catalog/services/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Dienstleistung erstellen
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Preis (netto)</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Link
                          href={`/catalog/services/${service.id}`}
                          className="font-medium hover:underline"
                        >
                          {service.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {service.sku || '-'}
                      </TableCell>
                      <TableCell>
                        {service.category ? (
                          <Badge variant="outline">{service.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(service.priceNet)}
                      </TableCell>
                      <TableCell>{service.unit}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[service.status]}
                        >
                          {statusLabels[service.status] || service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {service.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                          {service.tags?.length > 2 && (
                            <Badge variant="outline">
                              +{service.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {meta.total} Dienstleistungen gesamt
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Zurück
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Seite {meta.page} von {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
