'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { Mail, Loader2, Plus, Send, Trash2, Users, Megaphone, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface Subscriber {
  id: string; email: string; name: string | null; tags: string[]; status: string; subscribedAt: string
}

interface Campaign {
  id: string; name: string; subject: string | null; status: string; sentAt: string | null
  stats: { sent?: number; failed?: number; total?: number } | null; createdAt: string
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  // New campaign dialog
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [creating, setCreating] = useState(false)

  // New subscriber dialog
  const [showNewSub, setShowNewSub] = useState(false)
  const [newSubEmail, setNewSubEmail] = useState('')
  const [newSubName, setNewSubName] = useState('')

  const fetchData = useCallback(async () => {
    const [subRes, campRes] = await Promise.all([
      fetch('/api/v1/newsletter/subscribers?limit=100'),
      fetch('/api/v1/newsletter/campaigns'),
    ])
    const [subData, campData] = await Promise.all([subRes.json(), campRes.json()])
    if (subData.success) setSubscribers(subData.data)
    if (campData.success) setCampaigns(campData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createCampaign = async () => {
    if (!newCampaignName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCampaignName }),
      })
      const data = await res.json()
      if (data.success) {
        setShowNewCampaign(false)
        setNewCampaignName('')
        toast.success('Kampagne erstellt')
        fetchData()
      }
    } catch { toast.error('Fehler beim Erstellen') }
    finally { setCreating(false) }
  }

  const addSubscriber = async () => {
    if (!newSubEmail.trim()) return
    try {
      const res = await fetch('/api/v1/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newSubEmail, name: newSubName || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setShowNewSub(false)
        setNewSubEmail('')
        setNewSubName('')
        toast.success('Abonnent hinzugefuegt')
        fetchData()
      }
    } catch { toast.error('Fehler') }
  }

  const sendCampaign = async (id: string) => {
    if (!confirm('Kampagne jetzt an alle Abonnenten versenden?')) return
    try {
      const res = await fetch(`/api/v1/newsletter/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.data.sent} E-Mails versendet, ${data.data.failed} fehlgeschlagen`)
        fetchData()
      } else {
        toast.error(data.error?.message || 'Versand fehlgeschlagen')
      }
    } catch { toast.error('Versand fehlgeschlagen') }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Entwurf</Badge>
      case 'sending': return <Badge className="bg-blue-100 text-blue-800">Wird versendet</Badge>
      case 'sent': return <Badge className="bg-green-100 text-green-800">Versendet</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Mail className="h-8 w-8" />Newsletter</h1>
        <p className="text-muted-foreground mt-1">Abonnenten verwalten und Kampagnen versenden</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <div className="text-2xl font-bold">{subscribers.filter(s => s.status === 'active').length}</div>
          <div className="text-xs text-muted-foreground">Aktive Abonnenten</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <Megaphone className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <div className="text-2xl font-bold">{campaigns.length}</div>
          <div className="text-xs text-muted-foreground">Kampagnen</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <Send className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</div>
          <div className="text-xs text-muted-foreground">Versendet</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList><TabsTrigger value="campaigns">Kampagnen</TabsTrigger><TabsTrigger value="subscribers">Abonnenten</TabsTrigger></TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewCampaign(true)}><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Betreff</TableHead><TableHead>Status</TableHead><TableHead>Statistik</TableHead><TableHead>Datum</TableHead><TableHead className="w-24">Aktionen</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Noch keine Kampagnen</TableCell></TableRow>
                ) : campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium"><Link href={`/intern/marketing/newsletter/${c.id}`} className="hover:underline">{c.name}</Link></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.subject || '—'}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.stats && (c.stats as { sent?: number }).sent !== undefined
                        ? `${(c.stats as { sent: number }).sent} versendet`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{c.sentAt ? new Date(c.sentAt).toLocaleDateString('de-DE') : new Date(c.createdAt).toLocaleDateString('de-DE')}</TableCell>
                    <TableCell>
                      {c.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => sendCampaign(c.id)}><Send className="h-3.5 w-3.5 mr-1" />Senden</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewSub(true)}><Plus className="h-4 w-4 mr-2" />Abonnent hinzufuegen</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>E-Mail</TableHead><TableHead>Name</TableHead><TableHead>Tags</TableHead><TableHead>Status</TableHead><TableHead>Seit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {subscribers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Noch keine Abonnenten</TableCell></TableRow>
                ) : subscribers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell>{s.name || '—'}</TableCell>
                    <TableCell>{(s.tags || []).map((t, i) => <Badge key={i} variant="secondary" className="text-xs mr-1">{t}</Badge>)}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status === 'active' ? 'Aktiv' : s.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(s.subscribedAt).toLocaleDateString('de-DE')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
        <DialogContent><DialogHeader><DialogTitle>Neue Kampagne</DialogTitle></DialogHeader>
          <Input placeholder="Kampagnenname" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCampaign()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaign(false)}>Abbrechen</Button>
            <Button onClick={createCampaign} disabled={creating || !newCampaignName.trim()}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Subscriber Dialog */}
      <Dialog open={showNewSub} onOpenChange={setShowNewSub}>
        <DialogContent><DialogHeader><DialogTitle>Abonnent hinzufuegen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="E-Mail" value={newSubEmail} onChange={e => setNewSubEmail(e.target.value)} />
            <Input placeholder="Name (optional)" value={newSubName} onChange={e => setNewSubName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSub(false)}>Abbrechen</Button>
            <Button onClick={addSubscriber} disabled={!newSubEmail.trim()}>Hinzufuegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
