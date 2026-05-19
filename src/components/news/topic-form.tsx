'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'

export type SocialPlatform = 'x' | 'facebook' | 'instagram' | 'linkedin'

export interface TopicSocialConfig {
  platforms: SocialPlatform[]
  includeImage: boolean
}

export interface TopicFormData {
  name: string
  description: string
  color: string
  keywords: string[]
  sourceType: string
  sourceConfig: { maxResults: number; dateRange: string }
  socialConfig: TopicSocialConfig
  isActive: boolean
  sortOrder: number
}

export interface TopicFormInitial {
  name?: string
  description?: string | null
  color?: string | null
  keywords?: string[] | null
  sourceType?: string
  sourceConfig?: Record<string, unknown> | null
  socialConfig?: Record<string, unknown> | null
  isActive?: boolean | null
  sortOrder?: number | null
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  x: 'X (Twitter)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
}

const PLATFORM_ORDER: SocialPlatform[] = ['x', 'facebook', 'instagram', 'linkedin']

const DEFAULT_SOCIAL_PLATFORMS: SocialPlatform[] = ['x', 'facebook', 'instagram']

function readSocialPlatforms(cfg: Record<string, unknown> | null | undefined): SocialPlatform[] {
  const raw = cfg?.platforms
  if (!Array.isArray(raw)) return DEFAULT_SOCIAL_PLATFORMS
  const filtered = raw
    .map((p) => String(p).toLowerCase())
    .filter((p): p is SocialPlatform => PLATFORM_ORDER.includes(p as SocialPlatform))
  return filtered.length > 0 ? filtered : DEFAULT_SOCIAL_PLATFORMS
}

function readIncludeImage(cfg: Record<string, unknown> | null | undefined): boolean {
  const v = cfg?.includeImage
  if (typeof v === 'boolean') return v
  return true
}

interface TopicFormProps {
  initial?: TopicFormInitial
  onSubmit: (data: TopicFormData) => Promise<void>
  saving: boolean
  submitLabel: string
}

function readMaxResults(cfg: Record<string, unknown> | null | undefined): number {
  const v = cfg?.maxResults
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 10
}

function readDateRange(cfg: Record<string, unknown> | null | undefined): string {
  const v = cfg?.dateRange
  if (typeof v === 'string' && v.length > 0) return v
  return '7d'
}

export function TopicForm({ initial, onSubmit, saving, submitLabel }: TopicFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')
  const [keywordsText, setKeywordsText] = useState(
    (initial?.keywords ?? []).join('\n'),
  )
  const [sourceType, setSourceType] = useState(initial?.sourceType ?? 'serpapi_news')
  const [maxResults, setMaxResults] = useState<number>(readMaxResults(initial?.sourceConfig))
  const [dateRange, setDateRange] = useState<string>(readDateRange(initial?.sourceConfig))
  const [socialPlatforms, setSocialPlatforms] = useState<SocialPlatform[]>(
    readSocialPlatforms(initial?.socialConfig),
  )
  const [socialIncludeImage, setSocialIncludeImage] = useState<boolean>(
    readIncludeImage(initial?.socialConfig),
  )
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0)
  const [error, setError] = useState<string | null>(null)

  const togglePlatform = (platform: SocialPlatform, checked: boolean) => {
    setSocialPlatforms((prev) => {
      if (checked) {
        if (prev.includes(platform)) return prev
        return [...prev, platform]
      }
      return prev.filter((p) => p !== platform)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name ist erforderlich')
      return
    }

    const keywords = keywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (keywords.length === 0) {
      setError('Mindestens ein Keyword ist erforderlich')
      return
    }

    const payload: TopicFormData = {
      name: trimmedName,
      description: description.trim(),
      color,
      keywords,
      sourceType,
      sourceConfig: {
        maxResults: Number.isFinite(maxResults) ? maxResults : 10,
        dateRange: dateRange || '7d',
      },
      socialConfig: {
        platforms: socialPlatforms,
        includeImage: socialIncludeImage,
      },
      isActive,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    }

    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Themendaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Name *</Label>
            <Input
              id="topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. KI im Mittelstand"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-description">Beschreibung</Label>
            <Textarea
              id="topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-color">Farbe</Label>
            <div className="flex items-center gap-3">
              <input
                id="topic-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
                className="w-32 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-keywords">Keywords (ein Keyword pro Zeile)</Label>
            <Textarea
              id="topic-keywords"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder={'KI im Mittelstand\nDigitalisierung KMU\nFörderung KI'}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Jede Zeile wird als einzelnes Keyword interpretiert.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quellen-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic-source-type">Quelltyp</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger id="topic-source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serpapi_news">SerpAPI News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic-max-results">Max. Ergebnisse</Label>
              <Input
                id="topic-max-results"
                type="number"
                min={1}
                max={100}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-date-range">Zeitraum</Label>
              <select
                id="topic-date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="1h">Letzte Stunde</option>
                <option value="4h">Letzte 4 Stunden</option>
                <option value="1d">Letzter Tag</option>
                <option value="2d">Letzte 2 Tage</option>
                <option value="7d">Letzte 7 Tage</option>
                <option value="1m">Letzter Monat</option>
                <option value="1y">Letztes Jahr</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Google News kennt nur <code>1h</code>, <code>4h</code>, <code>1d</code>, <code>7d</code>, <code>1y</code> nativ — andere Werte werden gemappt. Der zeitliche Cutoff im Adapter wird aus diesem Setting abgeleitet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social-Media-Generierung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plattformen</Label>
            <p className="text-xs text-muted-foreground">
              Für welche Plattformen aus jedem generierten Blog-Beitrag ein Social-Media-Entwurf erzeugt wird. Keine Auswahl → Stufe 3 wird übersprungen.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLATFORM_ORDER.map((platform) => {
                const id = `topic-social-${platform}`
                const checked = socialPlatforms.includes(platform)
                return (
                  <div key={platform} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(c) => togglePlatform(platform, c === true)}
                    />
                    <Label htmlFor={id} className="cursor-pointer text-sm">
                      {PLATFORM_LABELS[platform]}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Checkbox
              id="topic-social-image"
              checked={socialIncludeImage}
              onCheckedChange={(checked) => setSocialIncludeImage(checked === true)}
            />
            <Label htmlFor="topic-social-image" className="cursor-pointer">
              Hero-Bild des Blog-Beitrags an Social-Posts anhängen
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-7 -mt-2">
            Wenn aktiv und ein Bild via KI generiert werden konnte, wird es als imageUrl an jeden Plattform-Post angehängt.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anzeige &amp; Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="topic-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="topic-active" className="cursor-pointer">
              Thema aktiv (für automatische Recherche)
            </Label>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="topic-sort-order">Sortierreihenfolge</Label>
            <Input
              id="topic-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Niedrigere Werte erscheinen zuerst.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
