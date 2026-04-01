'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Blocks, Plus, ArrowLeft, Pencil, Trash2, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORIES = [
  { value: 'all', label: 'Alle' },
  { value: 'general', label: 'Allgemein' },
  { value: 'liability', label: 'Haftung' },
  { value: 'termination', label: 'Kuendigung' },
  { value: 'payment', label: 'Zahlung' },
  { value: 'confidentiality', label: 'Geheimhaltung' },
  { value: 'data_protection', label: 'Datenschutz' },
  { value: 'sla', label: 'SLA' },
  { value: 'ip_rights', label: 'IP/Urheberrecht' },
] as const

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter((c) => c.value !== 'all').map((c) => [c.value, c.label])
)

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

export default function ClausesPage() {
  const [clauses, setClauses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formBody, setFormBody] = useState('')

  const fetchClauses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }
      const res = await fetch(`/api/v1/contract-clauses?${params}`)
      const json = await res.json()
      if (json.success) {
        setClauses(json.data || [])
      }
    } catch {
      toast.error('Fehler beim Laden der Bausteine')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchClauses()
  }, [fetchClauses])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormCategory('general')
    setFormBody('')
    setDialogOpen(true)
  }

  const openEdit = (clause: any) => {
    setEditing(clause)
    setFormName(clause.name || '')
    setFormCategory(clause.category || 'general')
    setFormBody(clause.body_html || clause.bodyHtml || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formCategory) {
      toast.error('Name und Kategorie sind erforderlich')
      return
    }
    setSaving(true)
    try {
      const payload = { name: formName, category: formCategory, body_html: formBody }
      const url = editing
        ? `/api/v1/contract-clauses/${editing.id}`
        : '/api/v1/contract-clauses'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(editing ? 'Baustein aktualisiert' : 'Baustein erstellt')
        setDialogOpen(false)
        fetchClauses()
      } else {
        toast.error(json.error?.message || 'Fehler beim Speichern')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (clause: any) => {
    if (!confirm(`Baustein "${clause.name}" wirklich loeschen?`)) return
    try {
      const res = await fetch(`/api/v1/contract-clauses/${clause.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Baustein geloescht')
        fetchClauses()
      } else {
        toast.error(json.error?.message || 'Fehler beim Loeschen')
      }
    } catch {
      toast.error('Fehler beim Loeschen')
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Blocks className="h-6 w-6" />
            Vertrags-Bausteine
          </h1>
          <p className="text-sm text-muted-foreground">
            Klausel-Bibliothek fuer Vertragsvorlagen
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/finance/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurueck
            </Button>
          </Link>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Neuer Baustein
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={categoryFilter === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Clauses list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clauses.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Keine Bausteine gefunden.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clauses.map((clause: any) => {
            const isSystem = clause.is_system || clause.isSystem
            const bodyHtml = clause.body_html || clause.bodyHtml || ''
            const preview = stripHtml(bodyHtml).slice(0, 150)
            return (
              <Card key={clause.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{clause.name}</CardTitle>
                    <div className="flex shrink-0 gap-1">
                      {isSystem && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          System
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {CATEGORY_LABELS[clause.category] || clause.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                    {preview || 'Kein Inhalt'}
                    {stripHtml(bodyHtml).length > 150 && '...'}
                  </p>
                  {!isSystem && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(clause)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Bearbeiten
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(clause)}>
                        <Trash2 className="mr-1 h-3 w-3" />
                        Loeschen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Baustein bearbeiten' : 'Neuer Baustein'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="clause-name">Name</Label>
              <Input
                id="clause-name"
                placeholder="z.B. Standard-Haftungsklausel"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clause-category">Kategorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="clause-category">
                  <SelectValue placeholder="Kategorie waehlen" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clause-body">Inhalt (HTML)</Label>
              <Textarea
                id="clause-body"
                placeholder="<p>Klauseltext hier eingeben...</p>"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
