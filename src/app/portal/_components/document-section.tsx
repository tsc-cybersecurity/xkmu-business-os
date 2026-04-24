'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Plus, Loader2 } from 'lucide-react'
import { UploadDialog } from '../documents/_components/upload-dialog'

interface Doc {
  id: string
  fileName: string
  sizeBytes: number
  direction: 'admin_to_portal' | 'portal_to_admin'
  createdAt: string
}

export function DocumentSection({ linkedType, linkedId }: {
  linkedType: 'contract' | 'project' | 'order'
  linkedId: string
}) {
  const [adminDocs, setAdminDocs] = useState<Doc[]>([])
  const [portalDocs, setPortalDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const base = `/api/v1/portal/me/documents?linkedType=${linkedType}&linkedId=${linkedId}`
      const [a, p] = await Promise.all([
        fetch(`${base}&direction=admin_to_portal`).then(r => r.json()),
        fetch(`${base}&direction=portal_to_admin`).then(r => r.json()),
      ])
      setAdminDocs(a?.success ? a.data : [])
      setPortalDocs(p?.success ? p.data : [])
    } finally {
      setLoading(false)
    }
  }, [linkedType, linkedId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`

  const renderList = (items: Doc[]) => (
    items.length === 0
      ? <p className="text-sm text-muted-foreground">Keine Dokumente</p>
      : <ul className="divide-y text-sm">
          {items.map(d => (
            <li key={d.id} className="py-2 flex items-center gap-3">
              <span className="flex-1 truncate">{d.fileName}</span>
              <span className="text-xs text-muted-foreground">{fmt(d.sizeBytes)}</span>
              <a href={`/api/v1/portal/me/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
              </a>
            </li>
          ))}
        </ul>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Dokumente</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Hochladen
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Von uns</h4>
              {renderList(adminDocs)}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Von Ihnen</h4>
              {renderList(portalDocs)}
            </div>
          </div>
        )}
      </CardContent>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={load}
        prefillLinked={{ linkedType, linkedId }}
      />
    </Card>
  )
}
