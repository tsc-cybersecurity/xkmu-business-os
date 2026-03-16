'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ChatContextData {
  type: string // 'company', 'lead', 'person', 'opportunity', 'document'
  title: string // Display name e.g. "TechVision GmbH"
  data: Record<string, unknown>
}

interface ChatContextValue {
  context: ChatContextData | null
  setContext: (ctx: ChatContextData | null) => void
  isOpen: boolean
  openChat: (ctx?: ChatContextData) => void
  closeChat: () => void
  conversationId: string | null
  setConversationId: (id: string | null) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<ChatContextData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const openChat = useCallback((ctx?: ChatContextData) => {
    if (ctx) setContext(ctx)
    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => setIsOpen(false), [])

  return (
    <ChatContext.Provider value={{ context, setContext, isOpen, openChat, closeChat, conversationId, setConversationId }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

export type { ChatContextData }
