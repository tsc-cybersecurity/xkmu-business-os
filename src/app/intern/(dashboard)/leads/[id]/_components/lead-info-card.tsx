'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2,
  User,
  Mail,
  Phone,
  TrendingUp,
  Calendar,
  UserCircle,
  Search,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Lead {
  id: string
  title: string | null
  source: string
  sourceDetail: string | null
  status: string
  score: number | null
  tags: string[] | null
  notes: string | null
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

const sourceLabels: Record<string, string> = {
  api: 'API',
  form: 'Formular',
  import: 'Import',
  manual: 'Manuell',
  idea: 'Idee',
  website: 'Website',
}

interface LeadInfoCardProps {
  lead: Lead
  users: UserData[]
  companies: Company[]
  persons: Person[]
  editing: boolean
  editData: {
    title: string
    sourceDetail: string
    score: string
    notes: string
    tags: string[]
    companyId: string
    personId: string
  }
  onEditDataChange: (data: LeadInfoCardProps['editData']) => void
  companySearch: string
  onCompanySearchChange: (search: string) => void
  personSearch: string
  onPersonSearchChange: (search: string) => void
  rawDataExpanded: boolean
  onRawDataExpandedChange: (expanded: boolean) => void
  onStatusChange: (status: string) => void
  onAssigneeChange: (userId: string) => void
  formatDate: (dateString: string) => string
}

export function LeadInfoCard({
  lead,
  users,
  companies,
  persons,
  editing,
  editData,
  onEditDataChange,
  companySearch,
  onCompanySearchChange,
  personSearch,
  onPersonSearchChange,
  rawDataExpanded,
  onRawDataExpandedChange,
  onStatusChange,
  onAssigneeChange,
  formatDate,
}: LeadInfoCardProps) {
  return (
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
                <Select value={lead.status} onValueChange={onStatusChange}>
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
                  onValueChange={(value) => onAssigneeChange(value === 'none' ? '' : value)}
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
                onChange={(e) => onEditDataChange({ ...editData, notes: e.target.value })}
                placeholder="Worum geht es bei diesem Lead? Zusätzliche Informationen..."
                rows={6}
                className="min-h-[150px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap min-h-[80px]">
                {lead.notes || (
                  <span className="text-muted-foreground">Keine Beschreibung vorhanden. Klicken Sie auf &quot;Bearbeiten&quot; um eine Beschreibung hinzuzufügen.</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Raw Data */}
        {lead.rawData && Object.keys(lead.rawData).length > 0 && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => onRawDataExpandedChange(!rawDataExpanded)}>
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
                  onEditDataChange({ ...editData, companyId: value === 'none' ? '' : value })
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
                        onChange={(e) => onCompanySearchChange(e.target.value)}
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
                  onEditDataChange({ ...editData, personId: value === 'none' ? '' : value })
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
                        onChange={(e) => onPersonSearchChange(e.target.value)}
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
  )
}
