'use client'

import { useEffect, useState } from 'react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface BlockType {
  id: string
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  category?: string | null
}

interface Template {
  id: string
  name: string
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

interface Props {
  onSelect: (input:
    | { kind: 'markdown' }
    | { kind: 'cms_block'; blockType: string; content?: Record<string, unknown>; settings?: Record<string, unknown> }
  ) => void
}

export function LessonBlockTypePicker({ onSelect }: Props) {
  const [types, setTypes] = useState<BlockType[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    void Promise.all([
      fetch('/api/v1/cms/block-types?available_in_lessons=true').then((r) => r.json()),
      fetch('/api/v1/cms/block-templates?is_system=true').then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([typesRes, templatesRes]) => {
      if (typesRes.success) setTypes(typesRes.data)
      if (templatesRes?.success) setTemplates(templatesRes.data)
    })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Block hinzufügen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Text</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSelect({ kind: 'markdown' })}>
          Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {types.map((t) => {
          const matchingTemplates = templates.filter((tpl) => tpl.blockType === t.slug)
          return (
            <div key={t.id}>
              <DropdownMenuItem
                onClick={() => onSelect({ kind: 'cms_block', blockType: t.slug })}
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  )}
                </div>
              </DropdownMenuItem>
              {matchingTemplates.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  className="pl-8 text-sm"
                  onClick={() => onSelect({
                    kind: 'cms_block',
                    blockType: t.slug,
                    content: tpl.content,
                    settings: tpl.settings,
                  })}
                >
                  ↪ {tpl.name}
                </DropdownMenuItem>
              ))}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
