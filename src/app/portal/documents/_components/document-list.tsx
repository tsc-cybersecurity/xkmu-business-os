'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PortalDoc } from '../page'

interface Category { id: string; name: string }

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function DocumentList({ docs, ownUserId, onDeleted }: {
  docs: PortalDoc[]
  ownUserId: string | null
  onDeleted: () => void
}) {
  const [cats, setCats] = useState<Category[]>([])

  useEffect(() => {
    fetch('/api/v1/portal/document-categories').then(r => r.json())
      .then(data => {
        const all = data?.data ?? []
        setCats(all.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }).catch(() => {})
  }, [])

  const catName = (id: string) => cats.find(c => c.id === id)?.name || '—'

  const del = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return
    const res = await fetch(`/api/v1/portal/me/documents/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data?.success) { toast.success('Gelöscht'); onDeleted() }
    else toast.error(data?.error?.message || 'Löschen fehlgeschlagen')
  }

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Dokumente vorhanden.</p>
  }

  const grouped = new Map<string, PortalDoc[]>()
  for (const d of docs) {
    const arr = grouped.get(d.categoryId) || []
    arr.push(d)
    grouped.set(d.categoryId, arr)
  }

  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([catId, items]) => (
        <section key={catId}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{catName(catId)}</h3>
          <ul className="divide-y">
            {items.map(d => {
              const canDelete = d.direction === 'portal_to_admin' && d.uploadedByUserId && d.uploadedByUserId === ownUserId
              return (
                <li key={d.id} className="py-2 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(d.sizeBytes)} · {new Date(d.createdAt).toLocaleString('de-DE')}
                      {d.note && <> · {d.note}</>}
                    </div>
                  </div>
                  <a href={`/api/v1/portal/me/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                  </a>
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => del(d.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
