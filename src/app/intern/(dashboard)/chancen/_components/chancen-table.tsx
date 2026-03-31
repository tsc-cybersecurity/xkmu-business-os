import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Telescope, Search, ExternalLink, Phone, Trash2, ArrowRightLeft,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

interface Opportunity {
  id: string
  name: string
  industry: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
  status: string
  source: string | null
  searchQuery: string | null
  searchLocation: string | null
  notes: string | null
  placeId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const statusLabels: Record<string, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  rejected: 'Abgelehnt',
  converted: 'Konvertiert',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-green-500',
  rejected: 'bg-red-500',
  converted: 'bg-purple-500',
}

interface ChancenTableProps {
  opportunities: Opportunity[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  total: number
  page: number
  totalPages: number
  setPage: (fn: (p: number) => number) => void
  onOpenDetail: (opp: Opportunity) => void
  onStatusChange: (id: string, status: string) => void
  onConvert: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
  onOpenCreate: () => void
}

function renderRating(rating: number | null, reviewCount: number | null) {
  if (rating === null) return <span className="text-muted-foreground">-</span>
  return (
    <span className="whitespace-nowrap">
      {rating.toFixed(1)}{' '}
      <span className="text-yellow-500">&#9733;</span>
      {reviewCount !== null && (
        <span className="text-muted-foreground text-xs ml-1">({reviewCount})</span>
      )}
    </span>
  )
}

export function ChancenTable({
  opportunities,
  loading,
  search,
  setSearch,
  total,
  page,
  totalPages,
  setPage,
  onOpenDetail,
  onStatusChange,
  onConvert,
  onDelete,
  onOpenCreate,
}: ChancenTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nach Name oder Stadt suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {total} Ergebnis{total !== 1 ? 'se' : ''}
          </span>
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
                <div className="h-10 w-20 rounded bg-muted" />
                <div className="h-10 flex-1 rounded bg-muted" />
                <div className="h-10 flex-1 rounded bg-muted" />
                <div className="h-10 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Telescope className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Keine Chancen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Starten Sie eine Suche, um potenzielle Kunden zu finden.
            </p>
            <Button className="mt-4" onClick={onOpenCreate}>
              <Telescope className="mr-2 h-4 w-4" />
              Neue Suche
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Branche</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Bewertung</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell
                        className="font-medium max-w-[200px] truncate cursor-pointer hover:text-primary"
                        onClick={() => onOpenDetail(opp)}
                      >
                        {opp.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {opp.industry || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                        <div>{opp.address || ''}</div>
                        <div>{[opp.postalCode, opp.city].filter(Boolean).join(' ') || '-'}</div>
                      </TableCell>
                      <TableCell>
                        {renderRating(opp.rating, opp.reviewCount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {opp.phone && (
                            <a href={`tel:${opp.phone}`} className="inline-flex items-center gap-1 text-xs hover:underline" title={opp.phone}>
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{opp.phone}</span>
                            </a>
                          )}
                          {opp.website && (
                            <a href={opp.website.startsWith('http') ? opp.website : `https://${opp.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{opp.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            </a>
                          )}
                          {!opp.phone && !opp.website && <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[opp.status]}>
                          {statusLabels[opp.status] || opp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {opp.status !== 'converted' && (
                            <Select value="" onValueChange={(val) => onStatusChange(opp.id, val)}>
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue placeholder="Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contacted">Kontaktiert</SelectItem>
                                <SelectItem value="qualified">Qualifiziert</SelectItem>
                                <SelectItem value="rejected">Abgelehnt</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {opp.status !== 'converted' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Zu Firma + Lead konvertieren"
                              onClick={() => onConvert(opp.id, opp.name)}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Löschen"
                            onClick={() => onDelete(opp.id, opp.name)}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Seite {page} von {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
