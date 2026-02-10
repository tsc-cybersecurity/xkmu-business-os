'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Building } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  settings: Record<string, unknown>
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  trial: 'Testphase',
  suspended: 'Gesperrt',
  cancelled: 'Gekundigt',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  trial: 'bg-blue-500',
  suspended: 'bg-red-500',
  cancelled: 'bg-gray-500',
}

export default function TenantSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })

  useEffect(() => {
    fetchTenant()
  }, [])

  const fetchTenant = async () => {
    try {
      const response = await fetch('/api/v1/tenant')
      const data = await response.json()

      if (data.success) {
        setTenant(data.data)
        setFormData({
          name: data.data.name,
          slug: data.data.slug,
        })
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error)
      toast.error('Fehler beim Laden der Organisation')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Organisationsname ist erforderlich')
      return
    }

    if (!formData.slug.trim()) {
      toast.error('Slug ist erforderlich')
      return
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/v1/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Einstellungen erfolgreich gespeichert')
        setTenant(data.data)
      } else {
        throw new Error(data.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Organisation</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Organisationseinstellungen
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Allgemeine Einstellungen
            </CardTitle>
            <CardDescription>
              Grundlegende Informationen zu Ihrer Organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organisationsname *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Meine Firma GmbH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL-Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
                placeholder="meine-firma"
              />
              <p className="text-sm text-muted-foreground">
                Wird fur interne URLs verwendet. Nur Kleinbuchstaben, Zahlen und
                Bindestriche erlaubt.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Abonnement</CardTitle>
            <CardDescription>
              Informationen zu Ihrem aktuellen Plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={statusColors[tenant?.status || 'active']}>
                {statusLabels[tenant?.status || 'active'] || tenant?.status}
              </Badge>
            </div>

            {tenant?.trialEndsAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Testphase endet am
                </span>
                <span className="font-medium">
                  {formatDate(tenant.trialEndsAt)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Erstellt am</span>
              <span className="font-medium">
                {formatDate(tenant?.createdAt || null)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tenant-ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {tenant?.id}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
          <CardDescription>
            Diese Aktionen konnen nicht ruckgangig gemacht werden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium">Organisation loschen</p>
              <p className="text-sm text-muted-foreground">
                Alle Daten werden unwiderruflich geloscht.
              </p>
            </div>
            <Button variant="destructive" disabled>
              Organisation loschen
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Das Loschen der Organisation ist derzeit deaktiviert. Kontaktieren Sie
            den Support, wenn Sie Ihre Organisation loschen mochten.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
