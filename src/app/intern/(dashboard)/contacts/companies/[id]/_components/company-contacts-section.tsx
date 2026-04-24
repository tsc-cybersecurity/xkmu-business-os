'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Ban,
  CheckCircle2,
  ChevronDown,
  Dice6,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
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

interface PortalUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string | null
  firstLoginAt: string | null
  hasPendingInvite: boolean
  linkedPersonId: string | null
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
  const router = useRouter()

  // Portal users state
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([])

  // Create portal dialog state
  const [createPortalFor, setCreatePortalFor] = useState<{ personId: string; personName: string } | null>(null)

  // Claim-as-contact dialog state
  const [claimUser, setClaimUser] = useState<{
    id: string; email: string; firstName: string | null; lastName: string | null
  } | null>(null)
  const [claimForm, setClaimForm] = useState({ firstName: '', lastName: '', jobTitle: '' })
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [createTab, setCreateTab] = useState<'invite' | 'password'>('invite')
  const [createPassword, setCreatePassword] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fetchPortalUsers = async () => {
    try {
      const res = await fetch(`/api/v1/companies/${companyId}/portal-users`)
      const data = await res.json()
      if (data?.success) setPortalUsers(data.data || [])
    } catch {
      // silently ignore — portal column stays empty
    }
  }

  useEffect(() => {
    fetchPortalUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  // Helper map: linkedPersonId -> PortalUser
  const portalByPersonId = new Map(
    portalUsers.filter(u => u.linkedPersonId).map(u => [u.linkedPersonId!, u])
  )

  function renderPortalBadge(personId: string): React.ReactNode {
    const u = portalByPersonId.get(personId)
    if (!u) return <span className="text-muted-foreground">—</span>
    if (u.status === 'inactive') return <Badge variant="secondary">Deaktiviert</Badge>
    if (u.hasPendingInvite && !u.firstLoginAt) return <Badge variant="outline">Eingeladen</Badge>
    return <Badge>Aktiv</Badge>
  }

  // Portal password generator
  const genPortalPassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    let pw = ''
    for (const n of arr) pw += charset[n % charset.length]
    setCreatePassword(pw)
  }

  // Submit create portal access
  const submitCreatePortal = async () => {
    if (!createPortalFor) return
    if (createTab === 'password' && createPassword.length < 10) {
      toast.error('Passwort mindestens 10 Zeichen')
      return
    }
    setCreateSubmitting(true)
    try {
      const body = createTab === 'password'
        ? { method: 'password', password: createPassword }
        : { method: 'invite' }
      const res = await fetch(`/api/v1/persons/${createPortalFor.personId}/portal-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data?.success) {
        toast.success(createTab === 'invite' ? 'Einladung gesendet' : 'Portal-Zugang angelegt')
        setCreatePortalFor(null)
        setCreatePassword('')
        setCreateTab('invite')
        fetchPortalUsers()
      } else {
        toast.error(data?.error?.message || 'Fehler')
      }
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Portal inline actions (resend / deactivate / reactivate)
  const portalAction = async (userId: string, action: 'resend_invite' | 'deactivate' | 'reactivate') => {
    const res = await fetch(`/api/v1/users/${userId}/portal-access`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (data?.success) {
      toast.success('Aktion erfolgreich')
      fetchPortalUsers()
    } else {
      toast.error(data?.error?.message || 'Fehler')
    }
  }

  // Claim orphan portal-user as a new contact person
  const openClaim = (u: { id: string; email: string; firstName: string | null; lastName: string | null }) => {
    setClaimUser(u)
    setClaimForm({ firstName: u.firstName || '', lastName: u.lastName || '', jobTitle: '' })
  }

  const submitClaim = async () => {
    if (!claimUser) return
    if (!claimForm.firstName || !claimForm.lastName) {
      toast.error('Vor- und Nachname sind Pflicht')
      return
    }
    setClaimSubmitting(true)
    try {
      const res = await fetch('/api/v1/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          firstName: claimForm.firstName,
          lastName: claimForm.lastName,
          email: claimUser.email,
          jobTitle: claimForm.jobTitle || undefined,
          portalUserId: claimUser.id,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        toast.success('Als Ansprechpartner übernommen')
        setClaimUser(null)
        // Refresh portal-user list (removes from orphan block)
        await fetchPortalUsers()
        // Trigger server-component revalidation so persons list re-loads from parent
        router.refresh()
      } else {
        toast.error(data?.error?.message || 'Übernahme fehlgeschlagen')
      }
    } finally {
      setClaimSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ansprechpartner
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="self-start sm:self-auto">
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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead className="w-10" />
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
                    <TableCell>{renderPortalBadge(person.id)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Aktionen</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(() => {
                            const u = portalByPersonId.get(person.id)
                            if (!u) {
                              return (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setCreatePortalFor({
                                      personId: person.id,
                                      personName: `${person.firstName} ${person.lastName}`,
                                    })
                                  }
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Als Portal-User anlegen
                                </DropdownMenuItem>
                              )
                            }
                            return (
                              <>
                                {u.hasPendingInvite && !u.firstLoginAt && (
                                  <DropdownMenuItem onClick={() => portalAction(u.id, 'resend_invite')}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Invite erneut senden
                                  </DropdownMenuItem>
                                )}
                                {u.status === 'active' ? (
                                  <DropdownMenuItem onClick={() => portalAction(u.id, 'deactivate')}>
                                    <Ban className="h-4 w-4 mr-2 text-red-500" />
                                    Portal-Zugang deaktivieren
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => portalAction(u.id, 'reactivate')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                    Portal-Zugang reaktivieren
                                  </DropdownMenuItem>
                                )}
                              </>
                            )
                          })()}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/intern/contacts/persons/${person.id}`}>
                              Person öffnen
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orphan Portal-Users Block */}
      {(() => {
        const orphans = portalUsers.filter(u => !u.linkedPersonId)
        if (orphans.length === 0) return null
        return (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Verwaiste Portal-Zugänge</CardTitle>
              <p className="text-sm text-muted-foreground">Diese Portal-Zugänge sind keiner Person zugeordnet.</p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {orphans.map(u => (
                  <li key={u.id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email} · {u.status === 'active' ? 'aktiv' : u.status}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openClaim(u)}>
                      Als Ansprechpartner übernehmen
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })()}

      {/* Select Person Dialog */}
      <Dialog open={selectPersonDialogOpen} onOpenChange={onSelectPersonDialogOpenChange}>
        <DialogContent className="max-w-lg max-w-[calc(100vw-2rem)]">
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

      {/* Create Portal Access Dialog */}
      <Dialog open={!!createPortalFor} onOpenChange={(open) => !open && setCreatePortalFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal-Zugang für {createPortalFor?.personName}</DialogTitle>
          </DialogHeader>
          <Tabs
            value={createTab}
            onValueChange={(v) => setCreateTab(v as 'invite' | 'password')}
            className="py-2"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Invite-Link (empfohlen)</TabsTrigger>
              <TabsTrigger value="password">Passwort direkt</TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="space-y-1 mt-3">
              <Label>Passwort (mind. 10 Zeichen)</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={genPortalPassword}
                  title="Zufallspasswort"
                >
                  <Dice6 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Passwort wird dem Kunden manuell mitgeteilt.</p>
            </TabsContent>
            <TabsContent value="invite" className="mt-3">
              <p className="text-xs text-muted-foreground">Eine E-Mail mit einem 7 Tage gültigen Link geht raus. Der User setzt sein eigenes Passwort.</p>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatePortalFor(null)}>Abbrechen</Button>
            <Button onClick={submitCreatePortal} disabled={createSubmitting}>
              {createSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Claim Portal-User as Contact Dialog */}
      <Dialog open={!!claimUser} onOpenChange={(open) => !open && setClaimUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal-User als Ansprechpartner übernehmen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>E-Mail</Label>
              <Input value={claimUser?.email || ''} disabled />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vorname</Label>
                <Input value={claimForm.firstName} onChange={e => setClaimForm({ ...claimForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Nachname</Label>
                <Input value={claimForm.lastName} onChange={e => setClaimForm({ ...claimForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Position (optional)</Label>
              <Input value={claimForm.jobTitle} onChange={e => setClaimForm({ ...claimForm, jobTitle: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClaimUser(null)}>Abbrechen</Button>
            <Button onClick={submitClaim} disabled={claimSubmitting}>
              {claimSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
