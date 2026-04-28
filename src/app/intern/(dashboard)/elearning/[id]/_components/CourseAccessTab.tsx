'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-states'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Users, User } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ResolvedGrant {
  id: string
  subjectKind: 'user' | 'group'
  subjectId: string
  label: string
  sublabel: string | null
  createdAt: string
}

interface UserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

interface GroupOption {
  id: string
  name: string
  description: string | null
  memberCount: number
}

export function CourseAccessTab({ courseId }: { courseId: string }) {
  const [grants, setGrants] = useState<ResolvedGrant[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerKind, setPickerKind] = useState<'user' | 'group'>('group')
  const [pickerSearch, setPickerSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [grantsRes, usersRes, groupsRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/access`).then((r) => r.json()),
        fetch('/api/v1/users?limit=500').then((r) => r.json()),
        fetch('/api/v1/user-groups').then((r) => r.json()),
      ])
      if (grantsRes.success) setGrants(grantsRes.data)
      if (usersRes.success) setUsers(usersRes.data)
      if (groupsRes.success) setGroups(groupsRes.data)
    } catch (err) {
      logger.error('Course access load failed', err, { module: 'CourseAccessTab' })
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { void load() }, [load])

  async function addGrant(subjectKind: 'user' | 'group', subjectId: string) {
    setAdding(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectKind, subjectId }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Zugriff erteilt')
        await load()
      } else {
        toast.error(json.error?.message ?? 'Hinzufügen fehlgeschlagen')
      }
    } finally {
      setAdding(false)
    }
  }

  async function removeGrant(grantId: string) {
    if (!confirm('Zugriff entziehen?')) return
    const res = await fetch(`/api/v1/courses/${courseId}/access/${grantId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Zugriff entzogen')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Entfernen fehlgeschlagen')
    }
  }

  if (loading) return <LoadingSpinner />

  const grantedUserIds = new Set(grants.filter((g) => g.subjectKind === 'user').map((g) => g.subjectId))
  const grantedGroupIds = new Set(grants.filter((g) => g.subjectKind === 'group').map((g) => g.subjectId))

  const filteredUsers = users
    .filter((u) => !grantedUserIds.has(u.id))
    .filter((u) => {
      if (!pickerSearch) return true
      const q = pickerSearch.toLowerCase()
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase()
      return u.email.toLowerCase().includes(q) || name.includes(q)
    })
    .slice(0, 50)

  const filteredGroups = groups
    .filter((g) => !grantedGroupIds.has(g.id))
    .filter((g) => !pickerSearch || g.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    .slice(0, 50)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Berechtigte Benutzer & Gruppen</CardTitle>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Einschränkung gesetzt — der Kurs ist für <strong>alle Portal-Nutzer</strong> sichtbar
              (sofern die Sichtbarkeit auf Portal/Beides steht). Sobald du hier mindestens einen Eintrag
              hinzufügst, gilt eine Allowlist.
            </p>
          ) : (
            <ul className="space-y-2">
              {grants.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  {g.subjectKind === 'group' ? (
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{g.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {g.subjectKind === 'group' ? 'Gruppe' : 'Benutzer'}
                      </Badge>
                    </div>
                    {g.sublabel && (
                      <div className="text-xs text-muted-foreground truncate">{g.sublabel}</div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Zugriff entziehen"
                    onClick={() => removeGrant(g.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={pickerKind} onValueChange={(v) => setPickerKind(v as 'user' | 'group')}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Gruppe</SelectItem>
                <SelectItem value="user">Einzelner Benutzer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={pickerKind === 'group' ? 'Gruppen suchen…' : 'Benutzer suchen (Name oder E-Mail)…'}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="rounded-md border max-h-72 overflow-y-auto divide-y">
            {pickerKind === 'group' ? (
              filteredGroups.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Keine passenden Gruppen.</p>
              ) : (
                filteredGroups.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 p-3">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.memberCount} Mitglied{g.memberCount === 1 ? '' : 'er'}
                        {g.description ? ` — ${g.description}` : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={adding}
                      onClick={() => addGrant('group', g.id)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Hinzufügen
                    </Button>
                  </div>
                ))
              )
            ) : (
              filteredUsers.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Keine passenden Benutzer.</p>
              ) : (
                filteredUsers.map((u) => {
                  const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fullName || u.email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {fullName ? u.email : u.role}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={adding}
                        onClick={() => addGrant('user', u.id)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Hinzufügen
                      </Button>
                    </div>
                  )
                })
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
