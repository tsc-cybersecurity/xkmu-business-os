'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { Brain, Plus, Send, X, Building2, User, FileText, Target, Lightbulb, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/app/_components/markdown-renderer'
import { useChatContext } from './chat-provider'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiProvider {
  id: string | null
  name: string
  providerType: string
  model: string
  available: boolean
}

const contextIcons: Record<string, typeof Building2> = {
  company: Building2,
  person: User,
  lead: Target,
  opportunity: Target,
  document: FileText,
  idea: Lightbulb,
}

export function ChatPanel() {
  const {
    context,
    setContext,
    isOpen,
    closeChat,
    conversationId,
    setConversationId,
  } = useChatContext()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch available providers
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/v1/ai/status')
      .then((res) => res.json())
      .then((json) => {
        const providerList: AiProvider[] = json.data?.providers ?? []
        const available = providerList.filter((p) => p.available)
        setProviders(available)
        if (available.length > 0 && !selectedProviderId) {
          setSelectedProviderId(available[0].id ?? available[0].providerType)
        }
      })
      .catch(() => {
        // Silently fail - providers list stays empty
      })
  }, [isOpen, selectedProviderId])

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [])

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          providerId: selectedProviderId || undefined,
          conversationId,
          context: context
            ? { type: context.type, title: context.title, data: context.data }
            : undefined,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        const errMsg = errData?.error?.message || `Fehler: ${response.status}`
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `**Fehler:** ${errMsg}` },
        ])
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: '**Fehler:** Keine Stream-Antwort erhalten.' },
        ])
        setIsLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        // Keep last incomplete chunk in buffer
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const data = JSON.parse(part.slice(6))
            if (data.type === 'meta' && data.conversationId) {
              setConversationId(data.conversationId)
            }
            if (data.type === 'text') {
              assistantContent += data.content
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: assistantContent },
              ])
            }
            if (data.type === 'error') {
              assistantContent += `\n\n**Fehler:** ${data.message || 'Unbekannter Fehler'}`
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: assistantContent },
              ])
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      // If no content was streamed, try parsing as regular JSON
      if (!assistantContent) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: 'Keine Antwort erhalten.' },
        ])
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `**Fehler:** ${errorMsg}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const ContextIcon = context ? contextIcons[context.type] ?? Brain : Brain

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[500px] sm:max-w-[500px] max-w-[calc(100vw-2rem)] flex flex-col p-0 gap-0"
      >
        {/* Hidden accessible description */}
        <SheetDescription className="sr-only">
          KI-Chat-Panel fuer kontextbezogene Konversationen
        </SheetDescription>

        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Brain className="h-5 w-5 text-primary shrink-0" />
          <SheetTitle className="text-base font-semibold flex-1">KI-Chat</SheetTitle>

          {/* Provider Select */}
          {providers.length > 0 && (
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs max-w-[140px] truncate focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="KI-Provider wählen"
            >
              {providers.map((p) => (
                <option key={p.id ?? p.providerType} value={p.id ?? p.providerType}>
                  {p.name} ({p.model})
                </option>
              ))}
            </select>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            aria-label="Neuer Chat"
            title="Neuer Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeChat}
            aria-label="Chat schliessen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Context Banner */}
        {context && (
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
            <Badge variant="secondary" className="gap-1.5">
              <ContextIcon className="h-3 w-3" />
              <span className="max-w-[300px] truncate">{context.title}</span>
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setContext(null)}
              aria-label="Kontext entfernen"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <Brain className="h-10 w-10 opacity-30" />
              <p>Stellen Sie eine Frage an den KI-Assistenten.</p>
              {context && (
                <p className="text-xs">
                  Kontext: <span className="font-medium">{context.title}</span>
                </p>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.content ? (
                    <MarkdownRenderer content={msg.content} className="text-sm [&_p]:mb-2 [&_p:last-child]:mb-0" />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t px-4 py-3 space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustTextarea()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben..."
              rows={1}
              className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Nachricht senden"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter = Senden, Shift+Enter = Neue Zeile
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
