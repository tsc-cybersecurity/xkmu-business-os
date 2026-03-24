'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Campaign {
  id: string; name: string; subject: string | null; bodyHtml: string | null
  status: string; sentAt: string | null; stats: Record<string, number> | null
}

export default function CampaignEditPage() {
  const params = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/newsletter/campaigns/${params.id}`)
      const data = await res.json()
      if (data.success && data.data) {
        const found = data.data as Campaign
        setCampaign(found)
        setName(found.name)
        setSubject(found.subject || '')
        setBodyHtml(found.bodyHtml || '')
      }
    } catch { toast.error('Kampagne nicht gefunden') }
    finally { setLoading(false) }
  }, [params.id])

  useEffect(() => { fetchCampaign() }, [fetchCampaign])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/newsletter/campaigns/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, bodyHtml }),
      })
      const data = await res.json()
      if (data.success) toast.success('Gespeichert')
      else toast.error('Speichern fehlgeschlagen')
    } catch { toast.error('Fehler') }
    finally { setSaving(false) }
  }

  const send = async () => {
    if (!confirm('Kampagne jetzt versenden?')) return
    try {
      const res = await fetch(`/api/v1/newsletter/campaigns/${params.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.data.sent} E-Mails versendet`)
        router.push('/intern/marketing/newsletter')
      } else {
        toast.error(data.error?.message || 'Versand fehlgeschlagen')
      }
    } catch { toast.error('Versand fehlgeschlagen') }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!campaign) return <div className="text-center py-16 text-muted-foreground">Kampagne nicht gefunden</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/intern/marketing/newsletter"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Kampagne: {campaign.name}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Inhalt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Betreff</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="z.B. Unser Newsletter fuer {{name}}" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">HTML-Body</label>
            <Textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={15} className="font-mono text-sm" placeholder="<p>Hallo {{name}},</p>" />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Speichern
            </Button>
            {campaign.status === 'draft' && (
              <Button variant="default" onClick={send}><Send className="h-4 w-4 mr-2" />Jetzt versenden</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {campaign.stats && (
        <Card>
          <CardHeader><CardTitle>Statistik</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{campaign.stats.sent || 0}</div><div className="text-xs text-muted-foreground">Versendet</div></div>
              <div><div className="text-2xl font-bold">{campaign.stats.failed || 0}</div><div className="text-xs text-muted-foreground">Fehlgeschlagen</div></div>
              <div><div className="text-2xl font-bold">{campaign.stats.total || 0}</div><div className="text-xs text-muted-foreground">Gesamt</div></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
