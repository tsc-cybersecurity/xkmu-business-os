'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Save, Lock, Eye, EyeOff } from 'lucide-react'

interface UserProfile {
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

export default function ProfilePage() {
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Profile form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/auth/me')
      const data = await response.json()

      if (data.success) {
        const userId = data.data.user.id
        const userResponse = await fetch(`/api/v1/users/${userId}`)
        const userData = await userResponse.json()

        if (userData.success) {
          setProfile(userData.data)
          setFormData({
            firstName: userData.data.firstName || '',
            lastName: userData.data.lastName || '',
            email: userData.data.email,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Fehler beim Laden des Profils')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Profil erfolgreich aktualisiert')
        setProfile(data.data)
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

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Das neue Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Passwort erfolgreich geändert')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setShowCurrentPassword(false)
        setShowNewPassword(false)
      } else {
        throw new Error(data.error?.message || 'Passwortänderung fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Ändern des Passworts'
      )
    } finally {
      setChangingPassword(false)
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

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mein Profil</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {roleLabels[profile.role] || profile.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle>Persönliche Daten</CardTitle>
            <CardDescription>
              Aktualisieren Sie Ihren Namen und Ihre E-Mail-Adresse
            </CardDescription>
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

            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Wird gespeichert...' : 'Profil speichern'}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Passwort ändern
            </CardTitle>
            <CardDescription>
              Ändern Sie Ihr Anmeldepasswort
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mindestens 8 Zeichen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                changingPassword ||
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword
              }
              variant="outline"
            >
              <Lock className="mr-2 h-4 w-4" />
              {changingPassword ? 'Wird geändert...' : 'Passwort ändern'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Kontoinformationen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-4">
              <div>
                <dt className="text-sm text-muted-foreground">Rolle</dt>
                <dd className="font-medium">
                  {roleLabels[profile.role] || profile.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{profile.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Erstellt am</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Letzter Login</dt>
                <dd className="font-medium">
                  {formatDate(profile.lastLoginAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
