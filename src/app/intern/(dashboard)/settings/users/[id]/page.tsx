'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared'
import { toast } from 'sonner'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
}

const roleLabels: Record<string, string> = {
  owner: 'Inhaber',
  admin: 'Administrator',
  member: 'Mitarbeiter',
  viewer: 'Betrachter',
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  pending: 'Ausstehend',
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    status: '',
  })

  useEffect(() => {
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/v1/users/${userId}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.data)
        setFormData({
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          email: data.data.email,
          role: data.data.role,
          status: data.data.status,
        })
      } else {
        toast.error('Benutzer nicht gefunden')
        router.push('/intern/settings/users')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      toast.error('Fehler beim Laden des Benutzers')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Benutzer erfolgreich aktualisiert')
        setUser(data.data)
      } else {
        throw new Error(data.error?.message || 'Aktualisierung fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Speichern'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Benutzer erfolgreich geloscht')
        router.push('/intern/settings/users')
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Loschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Loschen'
      )
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isOwner = user.role === 'owner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/settings/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {user.firstName || user.lastName
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : user.email}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {roleLabels[user.role] || user.role}
              </Badge>
              <Badge
                className={
                  user.status === 'active'
                    ? 'bg-green-500'
                    : user.status === 'pending'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                }
              >
                {statusLabels[user.status] || user.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
          {!isOwner && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Loschen
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personliche Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zugriffsrechte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rolle</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner" disabled>
                    Inhaber
                  </SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="member">Mitarbeiter</SelectItem>
                  <SelectItem value="viewer">Betrachter</SelectItem>
                </SelectContent>
              </Select>
              {isOwner && (
                <p className="text-sm text-muted-foreground">
                  Die Inhaber-Rolle kann nicht geandert werden.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                disabled={isOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Aktivitat</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Erstellt am</dt>
                <dd className="font-medium">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Letzter Login
                </dt>
                <dd className="font-medium">
                  {formatDate(user.lastLoginAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Benutzer loschen"
        description={`Mochten Sie "${user.email}" wirklich loschen? Diese Aktion kann nicht ruckgangig gemacht werden.`}
        confirmLabel="Loschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
