'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus } from 'lucide-react'
import { DocumentList } from './_components/document-list'
import { UploadDialog } from './_components/upload-dialog'

export interface PortalDoc {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  direction: 'admin_to_portal' | 'portal_to_admin'
  categoryId: string
  linkedType: string | null
  linkedId: string | null
  uploadedByUserId: string | null
  uploaderRole: string
  note: string | null
  createdAt: string
}

export default function PortalDocumentsPage() {
  const [room, setRoom] = useState<'admin_to_portal' | 'portal_to_admin'>('admin_to_portal')
  const [docs, setDocs] = useState<PortalDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [portalUserId, setPortalUserId] = useState<string | null>(null)

  const load = useCallback(async (dir: typeof room) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/portal/me/documents?direction=${dir}`)
      const data = await res.json()
      if (data?.success) setDocs(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(room) }, [room, load])

  useEffect(() => {
    fetch('/api/v1/auth/me').then(r => r.json()).then(d => {
      if (d?.success && d.data?.user?.id) setPortalUserId(d.data.user.id)
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dokumente</h1>
          <p className="text-muted-foreground text-sm">Zwischen Ihnen und uns bereitgestellte Dateien</p>
        </div>
      </div>

      <Tabs value={room} onValueChange={v => setRoom(v as 'admin_to_portal' | 'portal_to_admin')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="admin_to_portal">Von uns</TabsTrigger>
            <TabsTrigger value="portal_to_admin">Von Ihnen</TabsTrigger>
          </TabsList>
          {room === 'portal_to_admin' && (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Hochladen
            </Button>
          )}
        </div>

        <TabsContent value="admin_to_portal" className="mt-4">
          <Card><CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <DocumentList docs={docs} ownUserId={portalUserId} onDeleted={() => load(room)} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="portal_to_admin" className="mt-4">
          <Card><CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <DocumentList docs={docs} ownUserId={portalUserId} onDeleted={() => load(room)} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => { load('portal_to_admin'); setRoom('portal_to_admin') }}
      />
    </div>
  )
}
