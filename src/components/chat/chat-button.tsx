'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatContext } from './chat-provider'
import { navigation, type NavItem } from '@/components/layout/sidebar'
import { usePermissions } from '@/hooks/use-permissions'

const STORAGE_KEY = 'xkmu_fab_state_v2'
const EDGE_PADDING = 8
const MAX_ICONS = 10

// Default-Auswahl: drei Standalone-Items aus der Sidebar — bewusst gleich
// dem alten QUICK_ACTIONS-Verhalten, damit Bestandsnutzer nichts merken.
const DEFAULT_KEYS = ['E-Mail Inbox', 'Termine', 'Task-Queue']

type Pos = { right: number; bottom: number }
type Persisted = { pos: Pos; collapsed: boolean; keys: string[] }

function loadState(): Persisted {
  if (typeof window === 'undefined') {
    return { pos: { right: 24, bottom: 24 }, collapsed: false, keys: DEFAULT_KEYS }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pos: { right: 24, bottom: 24 }, collapsed: false, keys: DEFAULT_KEYS }
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      pos: {
        right: typeof parsed.pos?.right === 'number' ? parsed.pos.right : 24,
        bottom: typeof parsed.pos?.bottom === 'number' ? parsed.pos.bottom : 24,
      },
      collapsed: !!parsed.collapsed,
      keys: Array.isArray(parsed.keys) && parsed.keys.every((k) => typeof k === 'string')
        ? parsed.keys.slice(0, MAX_ICONS)
        : DEFAULT_KEYS,
    }
  } catch {
    return { pos: { right: 24, bottom: 24 }, collapsed: false, keys: DEFAULT_KEYS }
  }
}

export function ChatButton() {
  const { context, isOpen, openChat } = useChatContext()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<Pos>({ right: 24, bottom: 24 })
  const [collapsed, setCollapsed] = useState(false)
  const [keys, setKeys] = useState<string[]>(DEFAULT_KEYS)
  const [dragging, setDragging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reorderDragKey, setReorderDragKey] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{
    pointerX: number
    pointerY: number
    right: number
    bottom: number
    moved: boolean
  } | null>(null)

  // Hydrate aus localStorage erst clientseitig — verhindert Hydration-Mismatch.
  useEffect(() => {
    const s = loadState()
    setPos(s.pos)
    setCollapsed(s.collapsed)
    setKeys(s.keys)
    setMounted(true)
  }, [])

  // Persistieren bei jeder Aenderung (nach Hydration).
  useEffect(() => {
    if (!mounted) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pos, collapsed, keys })
      )
    } catch {
      // ignore quota errors
    }
  }, [pos, collapsed, keys, mounted])

  // Nur Top-Level-Nav-Items mit href, die der User per Permission erreichen
  // darf. Items ohne Modulanforderung sind fuer alle sichtbar.
  const availableItems = useMemo<NavItem[]>(() => {
    return navigation.filter((item) => {
      if (!item.href) return false
      if (!item.requiredModule) return true
      if (permissionsLoading) return true
      return hasPermission(item.requiredModule, 'read')
    })
  }, [hasPermission, permissionsLoading])

  // Items, die gerade im Cluster angezeigt werden — in der Reihenfolge aus
  // `keys`, gefiltert auf tatsaechlich verfuegbare/berechtigte Eintraege.
  const selectedItems = useMemo<NavItem[]>(() => {
    const byName = new Map(availableItems.map((i) => [i.name, i]))
    return keys
      .map((k) => byName.get(k))
      .filter((i): i is NavItem => !!i)
      .slice(0, MAX_ICONS)
  }, [keys, availableItems])

  const clampToViewport = useCallback((next: Pos): Pos => {
    if (typeof window === 'undefined') return next
    const rect = containerRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 0
    const h = rect?.height ?? 0
    const maxRight = Math.max(EDGE_PADDING, window.innerWidth - w - EDGE_PADDING)
    const maxBottom = Math.max(EDGE_PADDING, window.innerHeight - h - EDGE_PADDING)
    return {
      right: Math.min(Math.max(EDGE_PADDING, next.right), maxRight),
      bottom: Math.min(Math.max(EDGE_PADDING, next.bottom), maxBottom),
    }
  }, [])

  // Bei Viewport-Resize Cluster im Sichtbereich halten.
  useEffect(() => {
    if (!mounted) return
    const onResize = () => setPos((p) => clampToViewport(p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mounted, clampToViewport])

  // Position-Drag (Pointer-Events am Grip-Handle) ───────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      right: pos.right,
      bottom: pos.bottom,
      moved: false,
    }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!start) return
    const dx = e.clientX - start.pointerX
    const dy = e.clientY - start.pointerY
    const next = clampToViewport({
      right: start.right - dx,
      bottom: start.bottom - dy,
    })
    if (!start.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      start.moved = true
    }
    setPos(next)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragStartRef.current = null
    setDragging(false)
  }

  // Toggle/Reorder im Settings-Popover ─────────────────────────────────────
  const toggleKey = (name: string) => {
    setKeys((prev) => {
      if (prev.includes(name)) return prev.filter((k) => k !== name)
      if (prev.length >= MAX_ICONS) return prev // Cap durchsetzen
      return [...prev, name]
    })
  }

  const moveKeyTo = (from: string, to: string) => {
    if (from === to) return
    setKeys((prev) => {
      const without = prev.filter((k) => k !== from)
      const idx = without.indexOf(to)
      if (idx === -1) return prev
      const next = [...without]
      next.splice(idx, 0, from)
      return next
    })
  }

  if (isOpen) return null

  const style = mounted ? { right: `${pos.right}px`, bottom: `${pos.bottom}px` } : undefined

  return (
    <div
      ref={containerRef}
      className={
        mounted
          ? 'fixed z-40 flex flex-col items-end gap-2'
          : 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2'
      }
      style={style}
    >
      {context && !collapsed && (
        <Badge variant="secondary" className="max-w-[180px] truncate shadow-md hidden sm:inline-flex">
          {context.title}
        </Badge>
      )}

      {settingsOpen && (
        <SettingsPopover
          availableItems={availableItems}
          selectedKeys={keys}
          onToggle={toggleKey}
          onReorder={moveKeyTo}
          onClose={() => setSettingsOpen(false)}
          maxIcons={MAX_ICONS}
        />
      )}

      <div
        className={[
          'flex flex-row items-center gap-1 p-1.5 rounded-full',
          'border border-border/60 shadow-lg',
          'bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/50',
          dragging ? 'cursor-grabbing select-none' : '',
        ].join(' ')}
      >
        {/* Drag-Griff — Pointer-Events nur hier, sonst gehen Button-Klicks verloren. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={[
            'flex items-center justify-center h-10 w-6 sm:h-12 rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
            'touch-none',
          ].join(' ')}
          title="Ziehen zum Verschieben"
          aria-label="Quick-Actions verschieben"
          role="button"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {!collapsed &&
          selectedItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href!}
                aria-label={item.name}
                title={item.name}
              >
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-foreground/10"
                >
                  <Icon className="!size-5" />
                </Button>
              </Link>
            )
          })}

        <Button
          onClick={() => openChat()}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-md"
          size="icon-lg"
          aria-label="KI-Chat öffnen"
          title="KI-Chat"
        >
          <Brain className="!size-5" />
        </Button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setSettingsOpen((s) => !s)}
            className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            title="Quick-Actions konfigurieren"
            aria-label="Quick-Actions konfigurieren"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center h-8 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          title={collapsed ? 'Erweitern' : 'Einklappen'}
          aria-label={collapsed ? 'Quick-Actions erweitern' : 'Quick-Actions einklappen'}
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )

  // Hilfs-Renderer fuer Popover — geschachtelt, damit Closure-Zugriff auf
  // reorderDragKey/setReorderDragKey ohne Prop-Drilling.
  function SettingsPopover({
    availableItems,
    selectedKeys,
    onToggle,
    onReorder,
    onClose,
    maxIcons,
  }: {
    availableItems: NavItem[]
    selectedKeys: string[]
    onToggle: (name: string) => void
    onReorder: (from: string, to: string) => void
    onClose: () => void
    maxIcons: number
  }) {
    const selectedSet = new Set(selectedKeys)
    const orderedSelected = selectedKeys
      .map((k) => availableItems.find((i) => i.name === k))
      .filter((i): i is NavItem => !!i)
    const remaining = availableItems.filter((i) => !selectedSet.has(i.name))
    const capReached = selectedKeys.length >= maxIcons

    return (
      <div
        className={[
          'w-72 max-h-[420px] overflow-y-auto rounded-xl shadow-xl border border-border/60',
          'bg-background/95 backdrop-blur-md p-3 space-y-3',
        ].join(' ')}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Quick-Actions</div>
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            title="Schliessen"
            aria-label="Schliessen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground">
          {selectedKeys.length} / {maxIcons} ausgewaehlt · Ziehen zum Sortieren
        </div>

        {orderedSelected.length > 0 && (
          <ul className="space-y-1">
            {orderedSelected.map((item) => {
              const Icon = item.icon
              const isDraggingThis = reorderDragKey === item.name
              return (
                <li
                  key={item.name}
                  draggable
                  onDragStart={(e) => {
                    setReorderDragKey(item.name)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', item.name)
                  }}
                  onDragEnd={() => setReorderDragKey(null)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const from = e.dataTransfer.getData('text/plain') || reorderDragKey
                    if (from && from !== item.name) onReorder(from, item.name)
                    setReorderDragKey(null)
                  }}
                  className={[
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    'bg-foreground/[0.03] border border-border/40',
                    isDraggingThis ? 'opacity-50' : '',
                    'cursor-grab active:cursor-grabbing',
                  ].join(' ')}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggle(item.name)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    title="Entfernen"
                    aria-label={`${item.name} entfernen`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {remaining.length > 0 && (
          <>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              Hinzufuegen
              {capReached && <span className="ml-1 text-amber-600">· Limit erreicht</span>}
            </div>
            <ul className="space-y-1">
              {remaining.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      disabled={capReached}
                      onClick={() => onToggle(item.name)}
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                        'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                        capReached ? 'opacity-40 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      <Check className="h-4 w-4 opacity-0 shrink-0" />
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-left">{item.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    )
  }
}
