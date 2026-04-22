'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw, Ban, CheckCircle2, Dice6 } from 'lucide-react'

interface PortalUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string | null
  firstLoginAt: string | null
  hasPendingInvite: boolean
}

interface Props {
  companyId: string
}

export function PortalUsersTab({ companyId }: Props) {
  const [users, setUsers] = useState<PortalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState<'password' | 'invite'>('invite')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/companies/${companyId}/portal-users`)
      const data = await res.json()
      if (data?.success) setUsers(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  const reset = () => setForm({ firstName: '', lastName: '', email: '', password: '' })

  const generatePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let pw = ''
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    for (const n of arr) pw += charset[n % charset.length]
    setForm(f => ({ ...f, password: pw }))
  }

  const submit = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Alle Felder ausfüllen')
      return
    }
    if (tab === 'password' && form.password.length < 10) {
      toast.error('Passwort mindestens 10 Zeichen')
      return
    }
    setSaving(true)
    try {
      const body = tab === 'password'
        ? {
            method: 'password',
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
          }
        : {
            method: 'invite',
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
          }
      const res = await fetch(`/api/v1/companies/${companyId}/portal-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data?.success) {
        toast.success(tab === 'invite' ? 'Einladung gesendet' : 'Portal-User angelegt')
        setDialogOpen(false)
        reset()
        load()
      } else {
        toast.error(data?.error?.message || 'Anlegen fehlgeschlagen')
      }
    } finally {
      setSaving(false)
    }
  }

  const act = async (userId: string, action: 'deactivate' | 'reactivate' | 'resend_invite') => {
    const res = await fetch(`/api/v1/users/${userId}/portal-access`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (data?.success) {
      toast.success('Aktion erfolgreich')
      load()
    } else {
      toast.error(data?.error?.message || 'Fehler')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portal-Zugänge</CardTitle>
        <Button onClick={() => { reset(); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Portal-User anlegen
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Portal-Zugänge für diese Firma.
          </p>
        ) : (
          <div className="divide-y">
            {users.map((u) => {
              const active = u.status === 'active'
              const pending = u.hasPendingInvite
              return (
                <div key={u.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pending && <Badge variant="outline">Eingeladen</Badge>}
                    {!active && <Badge variant="secondary">Deaktiviert</Badge>}
                    {active && !pending && <Badge>Aktiv</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {pending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => act(u.id, 'resend_invite')}
                        title="Invite erneut senden"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => act(u.id, 'deactivate')}
                        title="Deaktivieren"
                      >
                        <Ban className="h-4 w-4 text-red-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => act(u.id, 'reactivate')}
                        title="Aktivieren"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal-User anlegen</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'password' | 'invite')} className="py-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Invite-Link (empfohlen)</TabsTrigger>
              <TabsTrigger value="password">Passwort direkt</TabsTrigger>
            </TabsList>
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vorname</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nachname</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <TabsContent value="password" className="space-y-1 mt-0">
                <Label>Passwort (mind. 10 Zeichen)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generatePassword}
                    title="Zufallspasswort"
                  >
                    <Dice6 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Passwort wird dem Kunden manuell mitgeteilt.
                </p>
              </TabsContent>
              <TabsContent value="invite" className="mt-0">
                <p className="text-xs text-muted-foreground">
                  Eine E-Mail mit einem 7 Tage gültigen Link geht raus. Der User setzt sein eigenes Passwort.
                </p>
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
