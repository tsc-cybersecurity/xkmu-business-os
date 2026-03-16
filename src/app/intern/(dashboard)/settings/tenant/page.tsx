'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Building, Database, Loader2, ImageIcon, Trash2, Upload } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Tenant {
  id: string
  name: string
  slug: string
  street: string | null
  houseNumber: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  legalForm: string | null
  managingDirector: string | null
  tradeRegister: string | null
  vatId: string | null
  taxNumber: string | null
  bankName1: string | null
  bankIban1: string | null
  bankBic1: string | null
  bankName2: string | null
  bankIban2: string | null
  bankBic2: string | null
  phone: string | null
  email: string | null
  website: string | null
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
  const [seedingDemo, setSeedingDemo] = useState(false)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: 'DE',
    legalForm: '',
    managingDirector: '',
    tradeRegister: '',
    vatId: '',
    taxNumber: '',
    bankName1: '',
    bankIban1: '',
    bankBic1: '',
    bankName2: '',
    bankIban2: '',
    bankBic2: '',
    phone: '',
    email: '',
    website: '',
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
          name: data.data.name || '',
          slug: data.data.slug || '',
          street: data.data.street || '',
          houseNumber: data.data.houseNumber || '',
          postalCode: data.data.postalCode || '',
          city: data.data.city || '',
          country: data.data.country || 'DE',
          legalForm: data.data.legalForm || '',
          managingDirector: data.data.managingDirector || '',
          tradeRegister: data.data.tradeRegister || '',
          vatId: data.data.vatId || '',
          taxNumber: data.data.taxNumber || '',
          bankName1: data.data.bankName1 || '',
          bankIban1: data.data.bankIban1 || '',
          bankBic1: data.data.bankBic1 || '',
          bankName2: data.data.bankName2 || '',
          bankIban2: data.data.bankIban2 || '',
          bankBic2: data.data.bankBic2 || '',
          phone: data.data.phone || '',
          email: data.data.email || '',
          website: data.data.website || '',
        })
        setLogoUrl((data.data.settings?.logoUrl as string) || null)
      }
    } catch (error) {
      logger.error('Failed to fetch tenant', error, { module: 'SettingsTenantPage' })
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append('file', file)
      const uploadRes = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: uploadForm,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error?.message || 'Upload fehlgeschlagen')
      }

      const newLogoUrl = uploadData.data.path as string
      const settingsRes = await fetch('/api/v1/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { ...tenant?.settings, logoUrl: newLogoUrl },
        }),
      })
      const settingsData = await settingsRes.json()

      if (!settingsRes.ok) {
        throw new Error(settingsData.error?.message || 'Speichern fehlgeschlagen')
      }

      setLogoUrl(newLogoUrl)
      setTenant(settingsData.data)
      toast.success('Logo erfolgreich hochgeladen')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Logo-Upload')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleLogoRemove = async () => {
    setSaving(true)
    try {
      const { logoUrl: _removed, ...restSettings } = (tenant?.settings ?? {}) as Record<string, unknown>
      void _removed
      const res = await fetch('/api/v1/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: restSettings }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Speichern fehlgeschlagen')
      }

      setLogoUrl(null)
      setTenant(data.data)
      toast.success('Logo entfernt – Standard-Logo wird verwendet')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Entfernen')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedDemo = async () => {
    if (!confirm('Moechten Sie Beispieldaten importieren? Bereits vorhandene Daten werden nicht ueberschrieben.')) {
      return
    }

    setSeedingDemo(true)
    try {
      const response = await fetch('/api/v1/tenant/seed-demo', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        const d = data.data
        const parts = []
        if (d.cmsPages > 0) parts.push(`${d.cmsPages} CMS-Seiten`)
        if (d.navigation > 0) parts.push(`${d.navigation} Navigationseintraege`)
        if (d.blogPosts > 0) parts.push(`${d.blogPosts} Blog-Posts`)
        if (d.companies > 0) parts.push(`${d.companies} Firmen`)
        if (d.persons > 0) parts.push(`${d.persons} Personen`)
        if (d.leads > 0) parts.push(`${d.leads} Leads`)
        if (d.products > 0) parts.push(`${d.products} Produkte`)
        if (d.activities > 0) parts.push(`${d.activities} Aktivitaeten`)

        if (parts.length > 0) {
          toast.success(`Demo-Daten importiert: ${parts.join(', ')}`)
        } else {
          toast.info('Alle Demo-Daten sind bereits vorhanden')
        }
      } else {
        throw new Error(data.error?.message || 'Import fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Importieren der Demo-Daten')
    } finally {
      setSeedingDemo(false)
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
          <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
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

      <div className="grid gap-6">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalForm">Rechtsform</Label>
                <Input id="legalForm" value={formData.legalForm} onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })} placeholder="z.B. GmbH, UG, e.K." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managingDirector">Geschaeftsfuehrer</Label>
                <Input id="managingDirector" value={formData.managingDirector} onChange={(e) => setFormData({ ...formData, managingDirector: e.target.value })} placeholder="Max Mustermann" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
            <CardDescription>Firmenanschrift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="street">Strasse</Label>
                <Input id="street" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Musterstrasse" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseNumber">Hausnummer</Label>
                <Input id="houseNumber" value={formData.houseNumber} onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })} placeholder="42" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">PLZ</Label>
                <Input id="postalCode" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} placeholder="12345" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Berlin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="DE" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontakt</CardTitle>
            <CardDescription>Erreichbarkeit der Organisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgPhone">Telefon</Label>
                <Input id="orgPhone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+49 30 12345678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmail">E-Mail</Label>
                <Input id="orgEmail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="info@firma.de" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgWebsite">Website</Label>
              <Input id="orgWebsite" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.firma.de" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rechtliche Angaben</CardTitle>
            <CardDescription>Handelsregister, Steuernummern</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tradeRegister">Handelsregister</Label>
              <Input id="tradeRegister" value={formData.tradeRegister} onChange={(e) => setFormData({ ...formData, tradeRegister: e.target.value })} placeholder="HRB 12345, Amtsgericht Berlin-Charlottenburg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatId">Umsatzsteuer-ID</Label>
                <Input id="vatId" value={formData.vatId} onChange={(e) => setFormData({ ...formData, vatId: e.target.value })} placeholder="DE123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Steuernummer</Label>
                <Input id="taxNumber" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} placeholder="27/123/12345" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bankverbindung 1</CardTitle>
            <CardDescription>Primaere Bankverbindung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName1">Bank</Label>
              <Input id="bankName1" value={formData.bankName1} onChange={(e) => setFormData({ ...formData, bankName1: e.target.value })} placeholder="Deutsche Bank" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankIban1">IBAN</Label>
                <Input id="bankIban1" value={formData.bankIban1} onChange={(e) => setFormData({ ...formData, bankIban1: e.target.value })} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBic1">BIC</Label>
                <Input id="bankBic1" value={formData.bankBic1} onChange={(e) => setFormData({ ...formData, bankBic1: e.target.value })} placeholder="COBADEFFXXX" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bankverbindung 2</CardTitle>
            <CardDescription>Optionale zweite Bankverbindung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName2">Bank</Label>
              <Input id="bankName2" value={formData.bankName2} onChange={(e) => setFormData({ ...formData, bankName2: e.target.value })} placeholder="Sparkasse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankIban2">IBAN</Label>
                <Input id="bankIban2" value={formData.bankIban2} onChange={(e) => setFormData({ ...formData, bankIban2: e.target.value })} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBic2">BIC</Label>
                <Input id="bankBic2" value={formData.bankBic2} onChange={(e) => setFormData({ ...formData, bankBic2: e.target.value })} placeholder="COBADEFFXXX" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Logo fuer die oeffentliche Webseite. Wird in der Navigationsleiste angezeigt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <div className="shrink-0 w-48 h-24 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" width={192} height={96} className="max-h-full max-w-full object-contain" unoptimized />
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-40" />
                  Standard-Logo
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" asChild disabled={uploadingLogo}>
                    <span>
                      {uploadingLogo ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird hochgeladen...</>
                      ) : (
                        <><Upload className="mr-2 h-4 w-4" />Logo hochladen</>
                      )}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </div>
              {logoUrl && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleLogoRemove}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Logo entfernen
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP oder GIF. Max. 5 MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Demo-Daten
          </CardTitle>
          <CardDescription>
            Importieren Sie Beispieldaten um das System kennenzulernen.
            Es werden CMS-Seiten, Blog-Posts, Firmen, Personen, Leads,
            Produkte und Aktivitaeten angelegt. Bereits vorhandene Daten
            werden nicht ueberschrieben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSeedDemo} disabled={seedingDemo} variant="outline">
            {seedingDemo ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird importiert...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Demo-Daten importieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
