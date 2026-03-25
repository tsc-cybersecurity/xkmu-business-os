'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  Bot,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

// ─── Types ──────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  providerId: string | null
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

interface ProviderInfo {
  id: string
  name: string
  providerType: string
  model: string
  available: boolean
}

// ─── Helpers ────────────────────────────────────────────
function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 15)
}

function truncate(str: string, len: number) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Persist conversations to localStorage
const STORAGE_KEY = 'xkmu-chat-conversations'

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveConversations(conversations: Conversation[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // quota exceeded - silently ignore
  }
}

// ─── Markdown-like rendering (simple) ───────────────────
function renderMessageContent(content: string) {
  // Simple markdown: bold, italic, code blocks, inline code, line breaks
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeContent: string[] = []
  let codeLang = ''

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.slice(3).trim()
        codeContent = []
      } else {
        inCodeBlock = false
        elements.push(
          <pre key={`code-${idx}`} className="my-2 rounded-md bg-muted p-3 text-sm overflow-x-auto">
            <code>{codeContent.join('\n')}</code>
          </pre>
        )
      }
      return
    }

    if (inCodeBlock) {
      codeContent.push(line)
      return
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={idx} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>)
      return
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h2>)
      return
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={idx} className="text-xl font-bold mt-3 mb-1">{line.slice(2)}</h1>)
      return
    }

    // List items
    if (line.match(/^[-*] /)) {
      elements.push(
        <div key={idx} className="flex gap-2 ml-2">
          <span className="text-muted-foreground select-none">&#8226;</span>
          <span>{renderInlineFormatting(line.slice(2))}</span>
        </div>
      )
      return
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s/)
    if (numMatch) {
      elements.push(
        <div key={idx} className="flex gap-2 ml-2">
          <span className="text-muted-foreground select-none">{numMatch[1]}.</span>
          <span>{renderInlineFormatting(line.slice(numMatch[0].length))}</span>
        </div>
      )
      return
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<div key={idx} className="h-2" />)
      return
    }

    // Regular line
    elements.push(<p key={idx} className="leading-relaxed">{renderInlineFormatting(line)}</p>)
  })

  // Close unclosed code block
  if (inCodeBlock && codeContent.length > 0) {
    elements.push(
      <pre key="code-end" className="my-2 rounded-md bg-muted p-3 text-sm overflow-x-auto">
        <code>{codeContent.join('\n')}</code>
      </pre>
    )
  }

  return <div className="space-y-0.5">{elements}</div>
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle inline code, bold, italic
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/)
    // Bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    // Italic
    const italicMatch = remaining.match(/\*([^*]+)\*/)

    // Find earliest match
    const matches = [
      codeMatch ? { match: codeMatch, type: 'code' } : null,
      boldMatch ? { match: boldMatch, type: 'bold' } : null,
      italicMatch ? { match: italicMatch, type: 'italic' } : null,
    ].filter(Boolean).sort((a, b) => (a!.match.index ?? 0) - (b!.match.index ?? 0))

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    const first = matches[0]!
    const idx = first.match.index ?? 0

    if (idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>)
    }

    if (first.type === 'code') {
      parts.push(<code key={key++} className="rounded bg-muted px-1 py-0.5 text-sm font-mono">{first.match[1]}</code>)
    } else if (first.type === 'bold') {
      parts.push(<strong key={key++}>{first.match[1]}</strong>)
    } else {
      parts.push(<em key={key++}>{first.match[1]}</em>)
    }

    remaining = remaining.slice(idx + first.match[0].length)
  }

  return <>{parts}</>
}

// ─── Main Page Component ────────────────────────────────
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  // ─── Load conversations from localStorage ──────
  useEffect(() => {
    const loaded = loadConversations()
    setConversations(loaded)
    if (loaded.length > 0) {
      setActiveId(loaded[0].id)
    }
  }, [])

  // ─── Persist whenever conversations change ─────
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations)
    }
  }, [conversations])

  // ─── Load available providers ──────────────────
  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/v1/ai/status')
      const data = await response.json()
      const providerList = data.data?.providers || (Array.isArray(data.data) ? data.data : [])
      if (data.success && providerList.length > 0) {
        const available = providerList.filter((p: ProviderInfo) => p.available && !['firecrawl', 'kie', 'serpapi', 'linkedin', 'twitter', 'facebook', 'instagram', 'wordpress'].includes(p.providerType))
        setProviders(available)
        if (available.length > 0 && !selectedProvider) {
          setSelectedProvider(available[0].id)
        }
      }
    } catch (error) {
      logger.error('Failed to fetch AI providers', error, { module: 'ChatPage' })
    }
  }

  // ─── Scroll to bottom ─────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages, streamingContent, scrollToBottom])

  // ─── Create new conversation ──────────────────
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: generateId(),
      title: 'Neuer Chat',
      providerId: selectedProvider || null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
    setInput('')
    setStreamingContent('')
    textareaRef.current?.focus()
  }

  // ─── Delete conversation ──────────────────────
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      if (activeId === id) {
        setActiveId(updated.length > 0 ? updated[0].id : null)
      }
      if (updated.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      }
      return updated
    })
  }

  // ─── Send message ─────────────────────────────
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    // Auto-create conversation if none
    let convId = activeId
    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: truncate(trimmed, 40),
        providerId: selectedProvider || null,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setConversations((prev) => [newConv, ...prev])
      convId = newConv.id
      setActiveId(convId)
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    // Add user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const updated = {
          ...c,
          messages: [...c.messages, userMessage],
          updatedAt: new Date().toISOString(),
          // Update title from first message
          title: c.messages.length === 0 ? truncate(trimmed, 40) : c.title,
        }
        return updated
      })
    )

    setInput('')
    setSending(true)
    setStreamingContent('')

    try {
      // Build conversation history for context
      const currentConv = conversations.find((c) => c.id === convId)
      const history = currentConv?.messages ?? []
      const contextMessages = [...history, userMessage]

      // Build prompt with conversation context
      const systemPrompt = 'Du bist ein hilfreicher KI-Assistent fuer ein Business-Management-System. Antworte immer auf Deutsch, es sei denn, der Nutzer schreibt auf einer anderen Sprache. Sei praezise, professionell und hilfreich.'

      const conversationPrompt = contextMessages
        .map((m) => `${m.role === 'user' ? 'Benutzer' : 'Assistent'}: ${m.content}`)
        .join('\n\n')

      const fullPrompt = `${conversationPrompt}\n\nAssistent:`

      const response = await fetch('/api/v1/ai/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          systemPrompt,
          maxTokens: 4000,
          temperature: 0.7,
          ...(selectedProvider ? { providerId: selectedProvider } : {}),
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'KI-Anfrage fehlgeschlagen')
      }

      const assistantText = data.data?.text || 'Keine Antwort erhalten.'

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: new Date().toISOString(),
          }
        })
      )
    } catch (error) {
      logger.error('Chat completion failed', error, { module: 'ChatPage' })
      toast.error(error instanceof Error ? error.message : 'KI-Anfrage fehlgeschlagen')
    } finally {
      setSending(false)
      setStreamingContent('')
    }
  }

  // ─── Handle keyboard shortcut ─────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Render ───────────────────────────────────
  return (
    <div className="flex flex-col sm:flex-row h-[calc(100vh-4rem)]">
      {/* Left: Conversation List */}
      <div className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r flex flex-col bg-card max-h-[30vh] sm:max-h-none">
        <div className="p-4 border-b">
          <Button className="w-full" onClick={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Unterhaltungen
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-start gap-2 px-4 py-3 cursor-pointer border-b transition-colors group',
                  activeId === conv.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
                onClick={() => {
                  setActiveId(conv.id)
                  setStreamingContent('')
                }}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.messages.length > 0
                      ? truncate(conv.messages[conv.messages.length - 1].content, 50)
                      : 'Keine Nachrichten'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(conv.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  aria-label="Unterhaltung löschen"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold truncate">
              {activeConversation?.title || 'KI-Chat'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0 hidden sm:inline">Provider:</span>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Provider wählen..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.model})
                  </SelectItem>
                ))}
                {providers.length === 0 && (
                  <SelectItem value="none" disabled>
                    Keine Provider verfügbar
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">KI-Chat</h2>
              <p className="text-muted-foreground max-w-md">
                Stellen Sie Fragen, lassen Sie sich bei Aufgaben helfen oder fuehren Sie
                ein Gespraech mit der KI. Ihre Unterhaltungen werden lokal gespeichert.
              </p>
            </div>
          ) : (
            activeConversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-3xl',
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <Card
                  className={cn(
                    'px-4 py-3 max-w-[80%]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  )}
                >
                  <div className="text-sm">
                    {msg.role === 'assistant'
                      ? renderMessageContent(msg.content)
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>
                  <p
                    className={cn(
                      'text-xs mt-2',
                      msg.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatDate(msg.createdAt)}
                  </p>
                </Card>
              </div>
            ))
          )}

          {/* Streaming indicator */}
          {sending && (
            <div className="flex gap-3 max-w-3xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <Card className="px-4 py-3 bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Antwort wird generiert...</span>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-card">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben... (Enter = Senden, Shift+Enter = Neue Zeile)"
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              size="icon"
              className="h-[44px] w-[44px] shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
