'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getIcon, getIconNames } from '@/lib/utils/icon-map'
import { Search } from 'lucide-react'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  label?: string
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const allIcons = useMemo(() => getIconNames(), [])

  const filtered = useMemo(() => {
    if (!search.trim()) return allIcons
    const q = search.toLowerCase()
    return allIcons.filter((name) => name.toLowerCase().includes(q))
  }, [allIcons, search])

  const SelectedIcon = value ? getIcon(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 h-9 font-normal">
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{label || 'Icon waehlen...'}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {filtered.map((name) => {
            const Icon = getIcon(name)
            if (!Icon) return null
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                className={`h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors ${
                  value === name ? 'bg-primary/10 ring-1 ring-primary' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-8 py-4 text-center text-xs text-muted-foreground">
              Kein Icon gefunden
            </div>
          )}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onClick={() => { onChange(''); setOpen(false) }}
          >
            Icon entfernen
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
