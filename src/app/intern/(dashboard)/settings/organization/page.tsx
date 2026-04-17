'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Save, Building, Database, Loader2, ImageIcon, Trash2, Upload, Bot, Sparkles } from 'lucide-react'
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

export default function OrganizationSettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [analyzingAi, setAnalyzingAi] = useState(false)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [companyDescription, setCompanyDescription] = useState('')
  const [companyKnowledge, setCompanyKnowledge] = useState('')

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
        setCompanyDescription((data.data.settings?.companyDescription as string) || '')
        setCompanyKnowledge((data.data.settings?.companyKnowledge as string) || '')
      }
    } catch (error) {
      logger.error('Failed to fetch tenant', error, { module: 'SettingsOrganizationPage' })
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
        body: JSON.stringify({
          ...formData,
          settings: {
            ...tenant?.settings,
            companyDescription,
            companyKnowledge,
          },
        }),
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

  const handleAiAnalyze = async () => {
    setAnalyzingAi(true)
    toast.info('KI-Analyse wird gestartet – das kann bis zu 30 Sekunden dauern...')
    try {
      const res = await fetch('/api/v1/tenant/analyze', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.knowledge) {
        setCompanyKnowledge(data.data.knowledge)
        const s = data.data.stats
        toast.success(`Analyse abgeschlossen: ${s.products} Produkte, ${s.services} Dienstleistungen, ${s.leads} Leads ausgewertet`)
      } else {
        toast.error(data.error?.message || 'KI-Analyse fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler bei der KI-Analyse')
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleSeedDemo = async () => {
    if (!confirm('Möchten Sie Beispieldaten importieren? Bereits vorhandene Daten werden nicht ueberschrieben.')) {
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
        if (d.activities > 0) parts.push(`${d.activities} Aktivitäten`)

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

  const f = (field: keyof typeof formData) => ({
    id: field,
    value: formData[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData({ ...formData, [field]: e.target.value }),
    className: 'text-sm h-9',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
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

      {/* 2-Column Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Row 1 Left: Allgemeine Einstellungen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Allgemeine Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-sm">Organisationsname *</Label>
              <Input {...f('name')} placeholder="Meine Firma GmbH" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slug" className="text-sm">URL-Slug *</Label>
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
                className="text-sm h-9"
              />
              <p className="text-xs text-muted-foreground">
                Nur Kleinbuchstaben, Zahlen und Bindestriche.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="legalForm" className="text-sm">Rechtsform</Label>
                <Input {...f('legalForm')} placeholder="z.B. GmbH, UG" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="managingDirector" className="text-sm">Geschäftsfuehrer</Label>
                <Input {...f('managingDirector')} placeholder="Max Mustermann" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 1 Right: Rechtliche Angaben */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rechtliche Angaben</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tradeRegister" className="text-sm">Handelsregister</Label>
              <Input {...f('tradeRegister')} placeholder="HRB 12345, AG Berlin-Charlottenburg" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vatId" className="text-sm">USt-IdNr.</Label>
              <Input {...f('vatId')} placeholder="DE123456789" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taxNumber" className="text-sm">Steuernummer</Label>
              <Input {...f('taxNumber')} placeholder="27/123/12345" />
            </div>
          </CardContent>
        </Card>

        {/* Row 2 Left: Adresse */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="street" className="text-sm">Strasse</Label>
                <Input {...f('street')} placeholder="Musterstrasse" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="houseNumber" className="text-sm">Hausnr.</Label>
                <Input {...f('houseNumber')} placeholder="42" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="postalCode" className="text-sm">PLZ</Label>
                <Input {...f('postalCode')} placeholder="12345" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city" className="text-sm">Ort</Label>
                <Input {...f('city')} placeholder="Berlin" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country" className="text-sm">Land</Label>
                <Input {...f('country')} placeholder="DE" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2 Right: Kontakt */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm">Telefon</Label>
              <Input {...f('phone')} placeholder="+49 30 12345678" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">E-Mail</Label>
              <Input {...f('email')} type="email" placeholder="info@firma.de" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="website" className="text-sm">Website</Label>
              <Input {...f('website')} placeholder="https://www.firma.de" />
            </div>
          </CardContent>
        </Card>

        {/* Row 3 Left: Bankverbindung 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bankverbindung 1</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="bankName1" className="text-sm">Bank</Label>
              <Input {...f('bankName1')} placeholder="Deutsche Bank" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bankIban1" className="text-sm">IBAN</Label>
                <Input {...f('bankIban1')} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankBic1" className="text-sm">BIC</Label>
                <Input {...f('bankBic1')} placeholder="COBADEFFXXX" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 3 Right: Bankverbindung 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bankverbindung 2</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="bankName2" className="text-sm">Bank</Label>
              <Input {...f('bankName2')} placeholder="Sparkasse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bankIban2" className="text-sm">IBAN</Label>
                <Input {...f('bankIban2')} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankBic2" className="text-sm">BIC</Label>
                <Input {...f('bankBic2')} placeholder="COBADEFFXXX" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 4 Left: Status & Abo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status & Abo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={statusColors[tenant?.status || 'active']}>
                {statusLabels[tenant?.status || 'active'] || tenant?.status}
              </Badge>
            </div>
            {tenant?.trialEndsAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trial-Ende</span>
                <span className="text-sm font-medium">{formatDate(tenant.trialEndsAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Erstellt am</span>
              <span className="text-sm font-medium">{formatDate(tenant?.createdAt || null)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Row 4 Right: Branding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-36 h-20 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo" width={144} height={80} className="max-h-full max-w-full object-contain" unoptimized />
                ) : (
                  <div className="text-center text-muted-foreground text-xs">
                    <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    Standard-Logo
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                    <span>
                      {uploadingLogo ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Hochladen...</>
                      ) : (
                        <><Upload className="mr-1.5 h-3.5 w-3.5" />Logo hochladen</>
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
                {logoUrl && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 text-xs" onClick={handleLogoRemove}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Entfernen
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF. Max 5 MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 5: Firmenwissen & KI-Analyse (full width) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Firmenwissen & KI-Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="companyDescription" className="text-sm">Unternehmensbeschreibung</Label>
                <Textarea
                  id="companyDescription"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Was macht Ihr Unternehmen? Beschreiben Sie Ihre Produkte, Dienstleistungen und Zielgruppe..."
                  className="text-sm min-h-[160px] resize-y"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyKnowledge" className="text-sm">Unternehmenskonzept (KI-generiert)</Label>
                <Textarea
                  id="companyKnowledge"
                  value={companyKnowledge}
                  onChange={(e) => setCompanyKnowledge(e.target.value)}
                  placeholder="Wird automatisch durch die KI-Analyse generiert..."
                  className="text-sm min-h-[160px] resize-y"
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleAiAnalyze} disabled={analyzingAi}>
              {analyzingAi ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyse läuft...</>
              ) : (
                <><Bot className="mr-2 h-4 w-4" />KI-Analyse starten</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Demo-Daten (full width) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Demo-Daten
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <Button onClick={handleSeedDemo} disabled={seedingDemo} variant="outline" size="sm">
                {seedingDemo ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird importiert...</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" />Demo-Daten importieren</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                CMS-Seiten, Blog-Posts, Firmen, Personen, Leads, Produkte und Aktivitäten. Vorhandene Daten werden nicht ueberschrieben.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gefahrenzone (full width) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Gefahrenzone</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg">
              <div>
                <p className="text-sm font-medium">Organisation loschen</p>
                <p className="text-xs text-muted-foreground">
                  Alle Daten werden unwiderruflich geloscht. Kontaktieren Sie den Support.
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Organisation loschen
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
