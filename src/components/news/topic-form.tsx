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

export interface TopicFormData {
  name: string
  description: string
  color: string
  keywords: string[]
  sourceType: string
  sourceConfig: { maxResults: number; dateRange: string }
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
  isActive?: boolean | null
  sortOrder?: number | null
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
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0)
  const [error, setError] = useState<string | null>(null)

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
                Hinweis: Google News kennt nur <code>1h</code>, <code>4h</code>, <code>1d</code>, <code>7d</code>, <code>1y</code> nativ. Andere Werte filtern wir per Hard-Cutoff im Adapter (max 48h).
              </p>
            </div>
          </div>
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
