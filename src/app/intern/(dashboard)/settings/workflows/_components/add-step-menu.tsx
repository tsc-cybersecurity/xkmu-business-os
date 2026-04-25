'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, GitBranch, Layers, Repeat } from 'lucide-react'
import type { ActionDefinition } from './types'

const CATEGORY_LABELS: Record<string, string> = {
  data: 'Daten',
  ai: 'KI',
  communication: 'Kommunikation',
  logic: 'Logik',
}

interface Props {
  actions: ActionDefinition[]
  onAddAction: (name: string) => void
  onAddBranch: () => void
  onAddParallel: () => void
  onAddForEach: () => void
}

export function AddStepMenu({ actions, onAddAction, onAddBranch, onAddParallel, onAddForEach }: Props) {
  const categories = [...new Set(actions.map(a => a.category))]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Schritt hinzufügen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-auto">
        {categories.map(cat => {
          const catActions = actions.filter(a => a.category === cat)
          if (catActions.length === 0) return null
          return (
            <div key={cat}>
              <DropdownMenuLabel>{CATEGORY_LABELS[cat] || cat}</DropdownMenuLabel>
              {catActions.map(a => (
                <DropdownMenuItem key={a.name} onClick={() => onAddAction(a.name)}>
                  {a.label || a.name}
                </DropdownMenuItem>
              ))}
            </div>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Steuerung</DropdownMenuLabel>
        <DropdownMenuItem onClick={onAddBranch}>
          <GitBranch className="h-4 w-4 mr-2" /> Verzweigung (if/else)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddParallel}>
          <Layers className="h-4 w-4 mr-2" /> Parallel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddForEach}>
          <Repeat className="h-4 w-4 mr-2" /> Schleife (for-each)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
