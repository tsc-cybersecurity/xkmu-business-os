'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-states'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CalendarClock, Plus, Trash2, User, Users, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ResolvedAssignment {
  id: string
  subjectKind: 'user' | 'group'
  subjectId: string
  label: string
  sublabel: string | null
  dueDate: string | null
  assignedAt: string
  lastReminderAt: string | null
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

export function CourseAssignmentsTab({ courseId }: { courseId: string }) {
  const [assignments, setAssignments] = useState<ResolvedAssignment[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerKind, setPickerKind] = useState<'user' | 'group'>('group')
  const [pickerSearch, setPickerSearch] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, uRes, gRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/assignments`).then((r) => r.json()),
        fetch('/api/v1/users?limit=500').then((r) => r.json()),
        fetch('/api/v1/user-groups').then((r) => r.json()),
      ])
      if (aRes.success) setAssignments(aRes.data)
      if (uRes.success) setUsers(uRes.data)
      if (gRes.success) setGroups(gRes.data)
    } catch (err) {
      logger.error('Course assignments load failed', err, { module: 'CourseAssignmentsTab' })
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { void load() }, [load])

  async function add(subjectKind: 'user' | 'group', subjectId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectKind,
          subjectId,
          dueDate: dueDate || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Zuweisung erstellt')
        await load()
      } else {
        toast.error(json.error?.message ?? 'Hinzufügen fehlgeschlagen')
      }
    } finally {
      setBusy(false)
    }
  }

  async function remove(assignmentId: string) {
    if (!confirm('Zuweisung entfernen? Erinnerungen für diese Zielgruppe werden gestoppt.')) return
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Zuweisung entfernt')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Entfernen fehlgeschlagen')
    }
  }

  if (loading) return <LoadingSpinner />

  const assignedUserIds = new Set(assignments.filter((a) => a.subjectKind === 'user').map((a) => a.subjectId))
  const assignedGroupIds = new Set(assignments.filter((a) => a.subjectKind === 'group').map((a) => a.subjectId))

  const filteredUsers = users
    .filter((u) => !assignedUserIds.has(u.id))
    .filter((u) => {
      if (!pickerSearch) return true
      const q = pickerSearch.toLowerCase()
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase()
      return u.email.toLowerCase().includes(q) || name.includes(q)
    })
    .slice(0, 50)

  const filteredGroups = groups
    .filter((g) => !assignedGroupIds.has(g.id))
    .filter((g) => !pickerSearch || g.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    .slice(0, 50)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zugewiesene Benutzer & Gruppen</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {`Keine Pflichtzuweisungen — der Kurs wird nicht in „Meine Pflichtkurse" angezeigt. Eine Zuweisung impliziert automatisch Zugriff (zusätzlich zu Berechtigungen).`}
            </p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => {
                const dueDate = a.dueDate ? new Date(a.dueDate) : null
                const isOverdue = !!dueDate && dueDate < today
                return (
                  <li key={a.id} className="flex items-start gap-3 rounded-md border p-3">
                    {a.subjectKind === 'group' ? (
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    ) : (
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{a.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {a.subjectKind === 'group' ? 'Gruppe' : 'Benutzer'}
                        </Badge>
                        {dueDate && (
                          <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                            <CalendarClock className="mr-1 h-3 w-3" />
                            Fällig {dueDate.toLocaleDateString('de-DE')}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Überfällig
                          </Badge>
                        )}
                      </div>
                      {a.sublabel && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{a.sublabel}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Zugewiesen am {new Date(a.assignedAt).toLocaleDateString('de-DE')}
                        {a.lastReminderAt && (
                          <> · Letzte Erinnerung {new Date(a.lastReminderAt).toLocaleDateString('de-DE')}</>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Zuweisung entfernen"
                      onClick={() => remove(a.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zuweisung anlegen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr_180px]">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={pickerKind} onValueChange={(v) => setPickerKind(v as 'user' | 'group')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Gruppe</SelectItem>
                  <SelectItem value="user">Einzelner Benutzer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Suchen</Label>
              <Input
                placeholder={pickerKind === 'group' ? 'Gruppen suchen…' : 'Benutzer suchen…'}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Fällig am (optional)</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
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
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => add('group', g.id)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Zuweisen
                    </Button>
                  </div>
                ))
              )
            ) : filteredUsers.length === 0 ? (
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
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => add('user', u.id)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Zuweisen
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
