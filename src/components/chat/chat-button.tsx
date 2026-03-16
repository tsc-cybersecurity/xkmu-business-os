'use client'

import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatContext } from './chat-provider'

export function ChatButton() {
  const { context, isOpen, openChat } = useChatContext()

  if (isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {context && (
        <Badge variant="secondary" className="max-w-[180px] truncate shadow-md">
          {context.title}
        </Badge>
      )}
      <Button
        onClick={() => openChat()}
        className="h-14 w-14 rounded-full shadow-lg"
        size="icon-lg"
        aria-label="KI-Chat oeffnen"
      >
        <Brain className="!size-6" />
      </Button>
    </div>
  )
}
