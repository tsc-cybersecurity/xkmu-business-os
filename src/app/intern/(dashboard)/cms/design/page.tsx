'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, Loader2, Save, Type, RectangleHorizontal, Sun, Image, MessageSquare, X, Plus, Link as LinkIcon } from 'lucide-react'
import { fontOptions, accentOptions, radiusOptions, themeOptions, type FontId, type AccentId, type RadiusId, type ThemeId } from '@/app/_components/design-provider'
import { logger } from '@/lib/utils/logger'

interface DesignSettings {
  defaultFont: FontId
  defaultAccent: AccentId
  defaultRadius: RadiusId
  defaultTheme: ThemeId
  logoUrl: string
  logoAlt: string
  headerSticky: boolean
  footerText: string
  contactHeadline: string
  contactDescription: string
  contactInterestTags: string[]
  appUrl: string
}

const DEFAULT_TAGS = [
  'KI-Beratung', 'KI-Automatisierung', 'KI-Assistenten & Chatbots',
  'IT-Assessment', 'IT-Architektur & Cloud', 'Systemintegration',
  'Security Quick Check', 'Hardening & Baselines', 'Backup & Recovery',
  'Incident Response', 'Security Awareness', 'Datenschutz & Compliance',
  'NIS-2 Unterstützung', 'Kombinations-Modul', 'Managed Services',
]

const DEFAULTS: DesignSettings = {
  defaultFont: 'ubuntu',
  defaultAccent: 'blue',
  defaultRadius: 'default',
  defaultTheme: 'light',
  logoUrl: '',
  logoAlt: 'xKMU',
  headerSticky: true,
  footerText: '',
  contactHeadline: 'Kontakt',
  contactDescription: 'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!',
  contactInterestTags: DEFAULT_TAGS,
  appUrl: '',
}

export default function CmsDesignPage() {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cms/design')
      if (!res.ok) {
        logger.error('Failed to fetch design settings', undefined, { module: 'CmsDesign', status: res.status })
        return
      }
      const data = await res.json()
      if (data.success && data.data) {
        const s = data.data as Record<string, unknown>
        setSettings({
          defaultFont: (s.defaultFont as FontId) || DEFAULTS.defaultFont,
          defaultAccent: (s.defaultAccent as AccentId) || DEFAULTS.defaultAccent,
          defaultRadius: (s.defaultRadius as RadiusId) || DEFAULTS.defaultRadius,
          defaultTheme: (s.defaultTheme as ThemeId) || DEFAULTS.defaultTheme,
          logoUrl: (s.logoUrl as string) || '',
          logoAlt: (s.logoAlt as string) || 'xKMU',
          headerSticky: s.headerSticky !== false,
          footerText: (s.footerText as string) || '',
          contactHeadline: (s.contactHeadline as string) || DEFAULTS.contactHeadline,
          contactDescription: (s.contactDescription as string) || DEFAULTS.contactDescription,
          contactInterestTags: Array.isArray(s.contactInterestTags) && s.contactInterestTags.length > 0
            ? (s.contactInterestTags as string[])
            : DEFAULT_TAGS,
          appUrl: (s.appUrl as string) || '',
        })
      }
    } catch (error) {
      logger.error('Failed to fetch design settings', error, { module: 'CmsDesign' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const putRes = await fetch('/api/v1/cms/design', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultFont: settings.defaultFont,
          defaultAccent: settings.defaultAccent,
          defaultRadius: settings.defaultRadius,
          defaultTheme: settings.defaultTheme,
          logoUrl: settings.logoUrl || '',
          logoAlt: settings.logoAlt || 'xKMU',
          headerSticky: settings.headerSticky,
          footerText: settings.footerText || '',
          contactHeadline: settings.contactHeadline || '',
          contactDescription: settings.contactDescription || '',
          contactInterestTags: settings.contactInterestTags.filter((t) => t.trim()),
          appUrl: settings.appUrl.trim(),
        }),
      })
      if (!putRes.ok) {
        const errBody = await putRes.text()
        logger.error('Failed to save design settings', undefined, { module: 'CmsDesign', status: putRes.status, body: errBody })
        return
      }
      const putData = await putRes.json()
      if (putData.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      logger.error('Failed to save design settings', error, { module: 'CmsDesign' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Palette className="h-8 w-8" />
            Website Design
          </h1>
          <p className="text-muted-foreground mt-1">
            Standard-Erscheinungsbild der öffentlichen Website konfigurieren
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="self-start sm:self-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? 'Gespeichert!' : 'Speichern'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Farbpalette */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Akzentfarbe
            </CardTitle>
            <CardDescription>Standard-Farbschema für alle Besucher</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {accentOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSettings((s) => ({ ...s, defaultAccent: opt.id }))}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    settings.defaultAccent === opt.id
                      ? 'border-foreground shadow-md scale-[1.02]'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  <span
                    className="h-6 w-6 rounded-full shrink-0 ring-1 ring-black/10"
                    style={{ background: opt.color }}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schriftart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Schriftart
            </CardTitle>
            <CardDescription>Standard-Schrift für die Website</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.defaultFont}
              onValueChange={(v) => setSettings((s) => ({ ...s, defaultFont: v as FontId }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-4 rounded-lg border p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Vorschau:</p>
              <p className="text-lg" style={{ fontFamily: fontOptions.find((f) => f.id === settings.defaultFont)?.variable }}>
                xKMU digital solutions bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ecken-Radius */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RectangleHorizontal className="h-5 w-5" />
              Ecken-Radius
            </CardTitle>
            <CardDescription>Abrundung von Buttons, Karten und Eingabefeldern</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {radiusOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSettings((s) => ({ ...s, defaultRadius: opt.id }))}
                  className={`flex items-center gap-3 border-2 p-3 transition-all ${
                    settings.defaultRadius === opt.id
                      ? 'border-foreground shadow-md'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                  style={{ borderRadius: opt.value }}
                >
                  <span
                    className="h-8 w-12 border-2 border-foreground/40 bg-muted shrink-0"
                    style={{ borderRadius: opt.value }}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Standard-Theme
            </CardTitle>
            <CardDescription>Standard Hell/Dunkel-Modus für neue Besucher</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.defaultTheme}
              onValueChange={(v) => setSettings((s) => ({ ...s, defaultTheme: v as ThemeId }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo &amp; Header
            </CardTitle>
            <CardDescription>Logo-URL und Header-Verhalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo-URL</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo Alt-Text</Label>
                <Input
                  placeholder="Firmenname"
                  value={settings.logoAlt}
                  onChange={(e) => setSettings((s) => ({ ...s, logoAlt: e.target.value }))}
                />
              </div>
            </div>
            {settings.logoUrl && (
              <div className="rounded-lg border p-4 bg-muted/30 flex items-center gap-4">
                <img
                  src={settings.logoUrl}
                  alt={settings.logoAlt}
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
                <span className="text-sm text-muted-foreground">Vorschau</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings((s) => ({ ...s, headerSticky: !s.headerSticky }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.headerSticky ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${
                    settings.headerSticky ? 'translate-x-5' : ''
                  }`}
                />
              </button>
              <Label>Header fixiert (sticky)</Label>
            </div>
          </CardContent>
        </Card>

        {/* App-Basis-URL */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              App-Basis-URL
            </CardTitle>
            <CardDescription>
              Öffentlich erreichbare URL der Anwendung. Wird für Links in E-Mails verwendet (z.B. Portal-Einladungen).
              Leer lassen, um die Umgebungsvariable <code className="text-xs">NEXT_PUBLIC_APP_URL</code> zu verwenden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://bos.example.de"
              value={settings.appUrl}
              onChange={(e) => setSettings((s) => ({ ...s, appUrl: e.target.value }))}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Footer-Text</CardTitle>
            <CardDescription>
              Optionaler Copyright-Text. Leer lassen für Standard.
              Navigation wird unter Website &gt; Navigation verwaltet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="z.B. &copy; 2026 Firma GmbH. Alle Rechte vorbehalten."
              value={settings.footerText}
              onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
            />
          </CardContent>
        </Card>

        {/* Kontaktformular */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Kontaktformular
            </CardTitle>
            <CardDescription>Überschrift, Beschreibung und Themen-Tags für das Kontaktformular</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Überschrift</Label>
                <Input
                  value={settings.contactHeadline}
                  onChange={(e) => setSettings((s) => ({ ...s, contactHeadline: e.target.value }))}
                  placeholder="Kontakt"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={settings.contactDescription}
                  onChange={(e) => setSettings((s) => ({ ...s, contactDescription: e.target.value }))}
                  placeholder="Haben Sie Fragen? Schreiben Sie uns!"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Themen-Tags (Interessen)</Label>
              <p className="text-xs text-muted-foreground">Besucher wählen daraus beim Kontaktformular. Klicken Sie auf X zum Entfernen.</p>
              <div className="flex flex-wrap gap-2">
                {settings.contactInterestTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm bg-muted"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({
                        ...s,
                        contactInterestTags: s.contactInterestTags.filter((_, idx) => idx !== i),
                      }))}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  id="newTag"
                  placeholder="Neues Thema hinzufügen..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const input = e.currentTarget
                      const val = input.value.trim()
                      if (val && !settings.contactInterestTags.includes(val)) {
                        setSettings((s) => ({ ...s, contactInterestTags: [...s.contactInterestTags, val] }))
                        input.value = ''
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const input = document.getElementById('newTag') as HTMLInputElement
                    const val = input?.value.trim()
                    if (val && !settings.contactInterestTags.includes(val)) {
                      setSettings((s) => ({ ...s, contactInterestTags: [...s.contactInterestTags, val] }))
                      input.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
