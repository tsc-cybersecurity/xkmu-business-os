'use client'

import Link from 'next/link'
import { Brain, Mail, CalendarDays, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatContext } from './chat-provider'

const QUICK_ACTIONS = [
  { href: '/intern/emails',              label: 'E-Mail Inbox', icon: Mail },
  { href: '/intern/termine',             label: 'Termine',      icon: CalendarDays },
  { href: '/intern/settings/task-queue', label: 'Task Queue',   icon: ListChecks },
] as const

export function ChatButton() {
  const { context, isOpen, openChat } = useChatContext()

  if (isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2">
      {context && (
        <Badge variant="secondary" className="max-w-[180px] truncate shadow-md hidden sm:inline-flex">
          {context.title}
        </Badge>
      )}
      <div className="flex flex-row items-center gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} title={label}>
            <Button
              variant="secondary"
              size="icon-lg"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
            >
              <Icon className="!size-5 sm:!size-6" />
            </Button>
          </Link>
        ))}
        <Button
          onClick={() => openChat()}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
          size="icon-lg"
          aria-label="KI-Chat öffnen"
          title="KI-Chat"
        >
          <Brain className="!size-5 sm:!size-6" />
        </Button>
      </div>
    </div>
  )
}
