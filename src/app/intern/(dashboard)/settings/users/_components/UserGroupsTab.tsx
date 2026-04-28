'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Users, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface UserGroup {
  id: string
  name: string
  description: string | null
  memberCount: number
  createdAt: string
}

interface UserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

interface GroupMember {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string | null
  addedAt: string
}

export function UserGroupsTab() {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editGroup, setEditGroup] = useState<UserGroup | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [memberGroup, setMemberGroup] = useState<UserGroup | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/user-groups').then((r) => r.json())
      if (res.success) setGroups(res.data)
    } catch (err) {
      logger.error('User groups load failed', err, { module: 'UserGroupsTab' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function deleteGroup(g: UserGroup) {
    if (!confirm(`Gruppe „${g.name}" löschen? Die Mitgliederzuordnungen werden entfernt.`)) return
    const res = await fetch(`/api/v1/user-groups/${g.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Gruppe gelöscht')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Gruppe
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benutzergruppen</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch keine Benutzergruppen"
              description="Lege eine Gruppe an, um Berechtigungen — z. B. für Onlinekurse — gemeinsam zu pflegen."
            />
          ) : (
            <ul className="divide-y">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-3">
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{g.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {g.memberCount} Mitglied{g.memberCount === 1 ? '' : 'er'}
                      </Badge>
                    </div>
                    {g.description && (
                      <div className="text-xs text-muted-foreground truncate">{g.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setMemberGroup(g)}>
                      <UserPlus className="mr-1 h-4 w-4" />
                      Mitglieder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditGroup(g)}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Gruppe löschen"
                      onClick={() => deleteGroup(g)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <GroupFormDialog
        open={createOpen}
        group={null}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => { setCreateOpen(false); await load() }}
      />
      <GroupFormDialog
        open={!!editGroup}
        group={editGroup}
        onClose={() => setEditGroup(null)}
        onSaved={async () => { setEditGroup(null); await load() }}
      />
      <GroupMembersDialog
        group={memberGroup}
        onClose={() => { setMemberGroup(null); void load() }}
      />
    </div>
  )
}

function GroupFormDialog({
  open,
  group,
  onClose,
  onSaved,
}: {
  open: boolean
  group: UserGroup | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setDescription(group?.description ?? '')
  }, [open, group])

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const url = group ? `/api/v1/user-groups/${group.id}` : '/api/v1/user-groups'
      const method = group ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(group ? 'Gruppe aktualisiert' : 'Gruppe angelegt')
        await onSaved()
      } else {
        toast.error(json.error?.message ?? 'Speichern fehlgeschlagen')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Beschreibung</Label>
            <Textarea id="group-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupMembersDialog({
  group,
  onClose,
}: {
  group: UserGroup | null
  onClose: () => void
}) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (groupId: string) => {
    setLoading(true)
    try {
      const [mRes, uRes] = await Promise.all([
        fetch(`/api/v1/user-groups/${groupId}/members`).then((r) => r.json()),
        fetch('/api/v1/users?limit=500').then((r) => r.json()),
      ])
      if (mRes.success) setMembers(mRes.data)
      if (uRes.success) setUsers(uRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!group) return
    void load(group.id)
  }, [group, load])

  if (!group) return null

  const memberIds = new Set(members.map((m) => m.userId))
  const candidates = users
    .filter((u) => !memberIds.has(u.id))
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase()
      return u.email.toLowerCase().includes(q) || name.includes(q)
    })
    .slice(0, 50)

  async function add(userId: string) {
    if (!group) return
    const res = await fetch(`/api/v1/user-groups/${group.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Mitglied hinzugefügt')
      await load(group.id)
    } else {
      toast.error(json.error?.message ?? 'Hinzufügen fehlgeschlagen')
    }
  }

  async function remove(userId: string) {
    if (!group) return
    const res = await fetch(`/api/v1/user-groups/${group.id}/members/${userId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Mitglied entfernt')
      await load(group.id)
    } else {
      toast.error(json.error?.message ?? 'Entfernen fehlgeschlagen')
    }
  }

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{`Mitglieder von „${group.name}"`}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h3 className="text-sm font-medium mb-2">Aktuelle Mitglieder ({members.length})</h3>
            {loading ? (
              <LoadingSpinner />
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Mitglieder.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {members.map((m) => {
                  const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                  return (
                    <li key={m.userId} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fullName || m.email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {fullName ? m.email : (m.role ?? '')}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" aria-label="Entfernen" onClick={() => remove(m.userId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Mitglied hinzufügen</h3>
            <Input
              placeholder="Name oder E-Mail suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <div className="rounded-md border max-h-72 overflow-y-auto divide-y">
              {candidates.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {search ? 'Keine passenden Benutzer.' : 'Tippe oben, um Benutzer zu suchen.'}
                </p>
              ) : (
                candidates.map((u) => {
                  const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fullName || u.email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {fullName ? u.email : u.role}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => add(u.id)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Hinzufügen
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
