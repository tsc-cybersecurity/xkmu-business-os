'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Copy, Pencil, Trash2, Loader2, BookTemplate, Shield } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const categoryLabels: Record<string, string> = {
  it_service: 'IT-Dienstleistung',
  consulting: 'Beratung',
  software_dev: 'Softwareentwicklung',
  hosting_saas: 'Hosting/SaaS',
}

const categories = ['all', 'it_service', 'consulting', 'software_dev', 'hosting_saas'] as const

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/v1/contract-templates?${params}`)
      const json = await res.json()
      if (json.success) {
        setTemplates(json.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleDuplicate = async (template: any) => {
    setDuplicating(template.id)
    try {
      const res = await fetch('/api/v1/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Kopie)`,
          description: template.description,
          category: template.category,
          body_html: template.body_html || template.bodyHtml,
          placeholders: template.placeholders,
          is_system: false,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchTemplates()
      }
    } catch {
      // ignore
    } finally {
      setDuplicating(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Template wirklich loeschen?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/v1/contract-templates/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id))
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookTemplate className="h-6 w-6" />
            Vertragsvorlagen
          </h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} Vorlagen
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/finance/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurueck
            </Button>
          </Link>
          <Link href="/intern/finance/contracts/templates/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Neues Template
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(cat)}
          >
            {cat === 'all' ? 'Alle' : categoryLabels[cat] || cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Keine Vorlagen gefunden.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{t.name}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    {t.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        System
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[t.category] || t.category}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                  {t.description || 'Keine Beschreibung'}
                </p>

                <div className="flex gap-2 pt-2">
                  {t.is_system ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={duplicating === t.id}
                      onClick={() => handleDuplicate(t)}
                    >
                      {duplicating === t.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-1 h-4 w-4" />
                      )}
                      Duplizieren
                    </Button>
                  ) : (
                    <>
                      <Link href={`/intern/finance/contracts/templates/${t.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Pencil className="mr-1 h-4 w-4" />
                          Bearbeiten
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting === t.id}
                        onClick={() => handleDelete(t.id)}
                      >
                        {deleting === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
