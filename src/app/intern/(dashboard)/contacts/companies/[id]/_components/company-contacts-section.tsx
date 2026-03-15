'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import {
  ChevronDown,
  Plus,
  Search,
  User,
  UserPlus,
} from 'lucide-react'

interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  jobTitle: string | null
  isPrimaryContact: boolean
}

interface AvailablePerson {
  id: string
  firstName: string
  lastName: string
  email: string | null
  companyId: string | null
}

interface CompanyContactsSectionProps {
  companyId: string
  persons: Person[]
  selectPersonDialogOpen: boolean
  onSelectPersonDialogOpenChange: (open: boolean) => void
  onOpenSelectPersonDialog: () => void
  availablePersons: AvailablePerson[]
  personSearch: string
  onPersonSearchChange: (search: string) => void
  onFetchAvailablePersons: (search: string) => void
  loadingPersons: boolean
  assigningPerson: string | null
  onAssignPerson: (personId: string) => void
}

export function CompanyContactsSection({
  companyId,
  persons,
  selectPersonDialogOpen,
  onSelectPersonDialogOpenChange,
  onOpenSelectPersonDialog,
  availablePersons,
  personSearch,
  onPersonSearchChange,
  onFetchAvailablePersons,
  loadingPersons,
  assigningPerson,
  onAssignPerson,
}: CompanyContactsSectionProps) {
  return (
    <>
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
                <Link href={`/intern/contacts/persons/new?companyId=${companyId}`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Neue Person erstellen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSelectPersonDialog}>
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
                        href={`/intern/contacts/persons/${person.id}`}
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

      {/* Select Person Dialog */}
      <Dialog open={selectPersonDialogOpen} onOpenChange={onSelectPersonDialogOpenChange}>
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
                  onPersonSearchChange(e.target.value)
                  onFetchAvailablePersons(e.target.value)
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
                        onClick={() => onAssignPerson(person.id)}
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
    </>
  )
}
