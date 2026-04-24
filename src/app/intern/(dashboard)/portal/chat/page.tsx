'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Send, Check, CheckCheck, MessageCircle, ExternalLink, Search } from 'lucide-react'

interface CompanyChat {
  companyId: string
  companyName: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
}

interface PortalMessage {
  id: string
  senderId: string | null
  senderRole: string
  bodyText: string
  readByPortalAt: string | null
  readByAdminAt: string | null
  createdAt: string
}

function ChatPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedCompanyId = searchParams.get('company')

  const [companies, setCompanies] = useState<CompanyChat[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [search, setSearch] = useState('')

  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastCreatedAt = useRef<string | null>(null)

  const loadCompanies = useCallback(async () => {
    try {
      const url = onlyUnread
        ? '/api/v1/chat/companies?hasUnread=true'
        : '/api/v1/chat/companies'
      const res = await fetch(url)
      const data = await res.json()
      if (data?.success) setCompanies(data.data || [])
    } catch {
      // silent
    } finally {
      setCompaniesLoading(false)
    }
  }, [onlyUnread])

  useEffect(() => {
    loadCompanies()
    const interval = setInterval(() => {
      if (!document.hidden) loadCompanies()
    }, 20_000)
    return () => clearInterval(interval)
  }, [loadCompanies])

  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }

  const markRead = useCallback(async (companyId: string) => {
    try {
      await fetch(`/api/v1/chat/companies/${companyId}/mark-read`, { method: 'PATCH' })
      // Optimistic: zero out the unreadCount in the companies list
      setCompanies(prev => prev.map(c => c.companyId === companyId ? { ...c, unreadCount: 0 } : c))
    } catch {
      // silent
    }
  }, [])

  const loadMessages = useCallback(async (companyId: string, initial: boolean) => {
    try {
      const url = initial
        ? `/api/v1/chat/companies/${companyId}/messages`
        : `/api/v1/chat/companies/${companyId}/messages?since=${encodeURIComponent(lastCreatedAt.current ?? '')}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data?.success) return
      const rows = data.data as PortalMessage[]

      if (initial) {
        setMessages(rows)
      } else if (rows.length > 0) {
        // Dedupe by ID: PG timestamp has µs precision, JS Date only ms,
        // so `?since=<iso>` can return the boundary message again.
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id))
          const fresh = rows.filter(r => !existing.has(r.id))
          return fresh.length === 0 ? prev : [...prev, ...fresh]
        })
      }

      if (rows.length > 0) {
        lastCreatedAt.current = rows[rows.length - 1].createdAt
        scrollToBottom()
        await markRead(companyId)
      } else if (initial) {
        await markRead(companyId)
      }
    } catch {
      // silent
    } finally {
      if (initial) setMessagesLoading(false)
    }
  }, [markRead])

  // Load messages when selected company changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setMessages([])
      lastCreatedAt.current = null
      return
    }
    setMessagesLoading(true)
    lastCreatedAt.current = null
    loadMessages(selectedCompanyId, true)
    const interval = setInterval(() => {
      if (!document.hidden) loadMessages(selectedCompanyId, false)
    }, 15_000)
    return () => clearInterval(interval)
  }, [selectedCompanyId, loadMessages])

  const selectCompany = (id: string) => {
    router.push(`/intern/portal/chat?company=${id}`)
  }

  const send = async () => {
    const trimmed = draft.trim()
    if (!trimmed || sending || !selectedCompanyId) return
    setSending(true)
    try {
      const res = await fetch(`/api/v1/chat/companies/${selectedCompanyId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyText: trimmed }),
      })
      const data = await res.json()
      if (data?.success) {
        setDraft('')
        await loadMessages(selectedCompanyId, false)
        loadCompanies()  // refresh lastMessageAt / lastMessagePreview in left panel
      } else {
        toast.error(data?.error?.message || 'Senden fehlgeschlagen')
      }
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const filteredCompanies = search.trim()
    ? companies.filter(c => (c.companyName || '').toLowerCase().includes(search.toLowerCase()))
    : companies

  const activeCompany = companies.find(c => c.companyId === selectedCompanyId)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Kunden-Chat
        </h1>
        <p className="text-muted-foreground">Kommunikation mit den Portal-Nutzern Ihrer Firmen</p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: company list */}
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Firma suchen..."
                className="pl-8 h-8"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUnread}
                  onChange={e => setOnlyUnread(e.target.checked)}
                  className="h-3 w-3"
                />
                <span className="text-muted-foreground">Nur ungelesen</span>
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {companiesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : filteredCompanies.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Keine Firmen</p>
            ) : (
              filteredCompanies.map(c => {
                const active = c.companyId === selectedCompanyId
                return (
                  <button
                    key={c.companyId}
                    onClick={() => selectCompany(c.companyId)}
                    className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors ${active ? 'bg-muted' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{c.companyName || 'Unbenannte Firma'}</div>
                        {c.lastMessagePreview && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessagePreview}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-[1.25rem] px-1 text-xs">
                            {c.unreadCount}
                          </Badge>
                        )}
                        {c.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.lastMessageAt).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {/* Right: messages */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {!selectedCompanyId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Firma aus der Liste wählen, um Chat zu öffnen.
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{activeCompany?.companyName || 'Firma'}</div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/intern/contacts/companies/${selectedCompanyId}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />Firma
                  </Link>
                </Button>
              </div>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Noch keine Nachrichten.</p>
                ) : (
                  messages.map(m => <MessageBubble key={m.id} msg={m} />)
                )}
                <div ref={bottomRef} />
              </CardContent>
              <div className="border-t p-3 flex gap-2 items-end bg-muted/30">
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Nachricht... (Enter zum Senden, Shift+Enter = neue Zeile)"
                  rows={2}
                  maxLength={5000}
                  className="resize-none"
                />
                <Button onClick={send} disabled={sending || !draft.trim()} size="icon" className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: PortalMessage }) {
  // In admin view: admin/owner/member messages = OWN (right, blue); portal_user = OTHER (left, gray)
  const isOwn = msg.senderRole !== 'portal_user'
  const readByOther = isOwn
    ? !!msg.readByPortalAt   // admin's own message → read by portal
    : !!msg.readByAdminAt    // portal's message → read by admin (less visual value)

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm">{msg.bodyText}</div>
        <div className={`flex items-center gap-1 text-xs mt-1 ${isOwn ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'}`}>
          <span>
            {new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            readByOther
              ? <CheckCheck className="h-3 w-3" />
              : <Check className="h-3 w-3" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ChatPageInner />
    </Suspense>
  )
}
