'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Send, Check, CheckCheck, MessageCircle } from 'lucide-react'

interface PortalMessage {
  id: string
  senderId: string | null
  senderRole: string
  bodyText: string
  readByPortalAt: string | null
  readByAdminAt: string | null
  createdAt: string
}

export default function PortalChatPage() {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastCreatedAt = useRef<string | null>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }

  const markRead = useCallback(async () => {
    try {
      await fetch('/api/v1/portal/me/chat/mark-read', { method: 'PATCH' })
    } catch {
      // ignore - next poll retries
    }
  }, [])

  const load = useCallback(async (initial: boolean) => {
    try {
      const url = initial
        ? '/api/v1/portal/me/chat/messages'
        : `/api/v1/portal/me/chat/messages?since=${encodeURIComponent(lastCreatedAt.current ?? '')}`
      const res = await fetch(url)
      const data = await res.json()
      if (!data?.success) return
      const rows = data.data as PortalMessage[]

      if (initial) {
        setMessages(rows)
      } else if (rows.length > 0) {
        setMessages(prev => [...prev, ...rows])
      }

      if (rows.length > 0) {
        lastCreatedAt.current = rows[rows.length - 1].createdAt
        scrollToBottom()
        await markRead()
      } else if (initial) {
        // even on empty initial load, mark read (no-op DB-side)
        await markRead()
      }
    } catch {
      // silent - next poll retries
    } finally {
      if (initial) setLoading(false)
    }
  }, [markRead])

  useEffect(() => {
    load(true)
    const interval = setInterval(() => {
      if (!document.hidden) load(false)
    }, 15_000)
    return () => clearInterval(interval)
  }, [load])

  const send = async () => {
    const trimmed = draft.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/v1/portal/me/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyText: trimmed }),
      })
      const data = await res.json()
      if (data?.success) {
        setDraft('')
        // append own message optimistically via reload-delta
        await load(false)
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

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Chat
        </h1>
        <p className="text-muted-foreground">Direkte Kommunikation mit unserem Team</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Noch keine Nachrichten — schreiben Sie uns eine erste Nachricht.
            </p>
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
            placeholder="Ihre Nachricht... (Enter zum Senden, Shift+Enter für neue Zeile)"
            rows={2}
            maxLength={5000}
            className="resize-none"
          />
          <Button onClick={send} disabled={sending || !draft.trim()} size="icon" className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function MessageBubble({ msg }: { msg: PortalMessage }) {
  const isOwn = msg.senderRole === 'portal_user'
  const readByOther = isOwn
    ? !!msg.readByAdminAt   // own portal-message read by admin
    : !!msg.readByPortalAt  // admin-message read by portal (less relevant visually)

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
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
