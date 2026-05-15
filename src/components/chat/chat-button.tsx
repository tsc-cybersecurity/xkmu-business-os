'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatContext } from './chat-provider'
import { navigation, type NavItem } from '@/components/layout/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import type { Module } from '@/lib/types/permissions'

const STORAGE_KEY = 'xkmu_fab_state_v3'
const EDGE_PADDING = 8
const MAX_ICONS = 20

// Default-Auswahl: drei Standalone-Hrefs aus der Sidebar — gleiches Verhalten
// wie das alte QUICK_ACTIONS-Set, jetzt aber per href adressiert.
const DEFAULT_KEYS = [
  '/intern/emails',
  '/intern/termine',
  '/intern/settings/task-queue',
]

type Pos = { right: number; bottom: number }
type BgStyle =
  | 'transparent'
  | 'subtle'
  | 'glass'
  | 'solid'
  | 'blue'
  | 'violet'
  | 'pink'
  | 'emerald'
  | 'amber'
  | 'cyan'
type Persisted = { pos: Pos; collapsed: boolean; keys: string[]; bgStyle: BgStyle }

// Pastell-Praesets — helle Toene in Light-Mode, gedaempfte tiefe Toene in
// Dark-Mode, beide mit leicht getoentem Border + Backdrop-Blur.
const BG_STYLES: Record<BgStyle, { label: string; className: string }> = {
  transparent: {
    label: 'Klar',
    className: '',
  },
  subtle: {
    label: 'Dezent',
    className:
      'border border-border/40 shadow-md bg-background/50 backdrop-blur-md supports-[backdrop-filter]:bg-background/40',
  },
  glass: {
    label: 'Glas',
    className:
      'border border-border/60 shadow-lg bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
  },
  solid: {
    label: 'Solide',
    className: 'border border-border shadow-lg bg-background',
  },
  blue: {
    label: 'Blau',
    className:
      'border border-blue-200/70 dark:border-blue-900/60 shadow-lg bg-blue-100/85 dark:bg-blue-950/60 backdrop-blur-md',
  },
  violet: {
    label: 'Lila',
    className:
      'border border-violet-200/70 dark:border-violet-900/60 shadow-lg bg-violet-100/85 dark:bg-violet-950/60 backdrop-blur-md',
  },
  pink: {
    label: 'Rosa',
    className:
      'border border-pink-200/70 dark:border-pink-900/60 shadow-lg bg-pink-100/85 dark:bg-pink-950/60 backdrop-blur-md',
  },
  emerald: {
    label: 'Grün',
    className:
      'border border-emerald-200/70 dark:border-emerald-900/60 shadow-lg bg-emerald-100/85 dark:bg-emerald-950/60 backdrop-blur-md',
  },
  amber: {
    label: 'Gelb',
    className:
      'border border-amber-200/70 dark:border-amber-900/60 shadow-lg bg-amber-100/85 dark:bg-amber-950/60 backdrop-blur-md',
  },
  cyan: {
    label: 'Türkis',
    className:
      'border border-cyan-200/70 dark:border-cyan-900/60 shadow-lg bg-cyan-100/85 dark:bg-cyan-950/60 backdrop-blur-md',
  },
}

const DEFAULT_BG_STYLE: BgStyle = 'glass'

// Flacher Eintrag — Top-Level oder Sub-Nav. `key` ist der href und damit
// eindeutig (mehrere Sub-Navs koennen denselben Namen tragen, aber nicht
// dieselbe Route).
type FlatItem = {
  key: string
  name: string
  icon: NavItem['icon']
  href: string
}

function loadState(): Persisted {
  const fallback: Persisted = {
    pos: { right: 24, bottom: 24 },
    collapsed: false,
    keys: DEFAULT_KEYS,
    bgStyle: DEFAULT_BG_STYLE,
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const bgStyle: BgStyle =
      parsed.bgStyle && parsed.bgStyle in BG_STYLES ? parsed.bgStyle : DEFAULT_BG_STYLE
    return {
      pos: {
        right: typeof parsed.pos?.right === 'number' ? parsed.pos.right : 24,
        bottom: typeof parsed.pos?.bottom === 'number' ? parsed.pos.bottom : 24,
      },
      collapsed: !!parsed.collapsed,
      keys: Array.isArray(parsed.keys) && parsed.keys.every((k) => typeof k === 'string')
        ? parsed.keys.slice(0, MAX_ICONS)
        : DEFAULT_KEYS,
      bgStyle,
    }
  } catch {
    return fallback
  }
}

export function ChatButton() {
  const { context, isOpen, openChat } = useChatContext()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const [mounted, setMounted] = useState(false)
  const [hydratedFromServer, setHydratedFromServer] = useState(false)
  const [pos, setPos] = useState<Pos>({ right: 24, bottom: 24 })
  const [collapsed, setCollapsed] = useState(false)
  const [keys, setKeys] = useState<string[]>(DEFAULT_KEYS)
  const [bgStyle, setBgStyle] = useState<BgStyle>(DEFAULT_BG_STYLE)
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

  // Hydration: erst localStorage (instant first paint), dann im Hintergrund
  // pro-User Prefs vom Server holen und ggf. ueberschreiben. So bleibt das
  // Verhalten offline-tauglich, syncht aber zwischen Geraeten desselben Users.
  useEffect(() => {
    const s = loadState()
    setPos(s.pos)
    setCollapsed(s.collapsed)
    setKeys(s.keys)
    setBgStyle(s.bgStyle)
    setMounted(true)

    let cancelled = false
    fetch('/api/v1/user-ui-prefs')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled || !res?.success) return
        const fab = res.data?.fab as Partial<Persisted> | undefined
        if (!fab) return
        // Server-Werte gewinnen, falls vorhanden — sonst lokale beibehalten.
        if (fab.pos && typeof fab.pos.right === 'number' && typeof fab.pos.bottom === 'number') {
          setPos({ right: fab.pos.right, bottom: fab.pos.bottom })
        }
        if (typeof fab.collapsed === 'boolean') setCollapsed(fab.collapsed)
        if (Array.isArray(fab.keys) && fab.keys.every((k) => typeof k === 'string')) {
          setKeys(fab.keys.slice(0, MAX_ICONS))
        }
        if (fab.bgStyle && (fab.bgStyle as string) in BG_STYLES) {
          setBgStyle(fab.bgStyle as BgStyle)
        }
        setHydratedFromServer(true)
      })
      .catch(() => {
        // Offline / nicht eingeloggt — localStorage bleibt Quelle der Wahrheit.
      })
    return () => { cancelled = true }
  }, [])

  // Persistieren: localStorage sofort + debounced PUT zum Server.
  // Erst nach dem Server-Hydrate schreiben, sonst ueberschreiben wir die
  // gerade gefetchten Server-Werte mit dem lokalen Stand.
  useEffect(() => {
    if (!mounted) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pos, collapsed, keys, bgStyle })
      )
    } catch {
      // ignore quota errors
    }
    if (!hydratedFromServer) return
    const handle = window.setTimeout(() => {
      fetch('/api/v1/user-ui-prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'fab', value: { pos, collapsed, keys, bgStyle } }),
      }).catch(() => {
        // Ignore — beim naechsten Change versuchen wir es wieder.
      })
    }, 500)
    return () => window.clearTimeout(handle)
  }, [pos, collapsed, keys, bgStyle, mounted, hydratedFromServer])

  // Berechtigungs-Check — waehrend des Ladens optimistisch true, damit der
  // Cluster nicht erst leer auftaucht und dann ploetzlich Items dazukommen.
  const canSee = useCallback(
    (mod?: Module): boolean => {
      if (!mod) return true
      if (permissionsLoading) return true
      return hasPermission(mod, 'read')
    },
    [hasPermission, permissionsLoading]
  )

  // Flacht navigation in Top-Level + Sub-Navs ab. Sub-Navs erben das Icon
  // des Eltern-Eintrags; im Anzeigenamen steht "Parent · Child" damit
  // gleichnamige Eintraege unterscheidbar bleiben.
  const availableItems = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = []
    for (const item of navigation) {
      if (item.href && canSee(item.requiredModule)) {
        out.push({ key: item.href, name: item.name, icon: item.icon, href: item.href })
      }
      if (item.children) {
        for (const child of item.children) {
          if (!canSee(child.requiredModule)) continue
          out.push({
            key: child.href,
            name: `${item.name} · ${child.name}`,
            icon: child.icon ?? item.icon,
            href: child.href,
          })
        }
      }
    }
    return out
  }, [canSee])

  const selectedItems = useMemo<FlatItem[]>(() => {
    const byKey = new Map(availableItems.map((i) => [i.key, i]))
    return keys
      .map((k) => byKey.get(k))
      .filter((i): i is FlatItem => !!i)
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

  useEffect(() => {
    if (!mounted) return
    const onResize = () => setPos((p) => clampToViewport(p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mounted, clampToViewport])

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

  const toggleKey = (key: string) => {
    setKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= MAX_ICONS) return prev
      return [...prev, key]
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
          reorderDragKey={reorderDragKey}
          setReorderDragKey={setReorderDragKey}
          bgStyle={bgStyle}
          onBgStyleChange={setBgStyle}
        />
      )}

      {/* Mobile = 1.5x groessere Tap-Targets (h-9 = 36px), Desktop bleibt
          kompakt (h-6 = 24px). Touch-Bedienung braucht ~44px Minimum laut
          WCAG; 36px + Padding kommt nah dran ohne den Cluster zu fluten. */}
      <div
        className={[
          'flex flex-row items-center gap-1 sm:gap-0.5 p-1.5 sm:p-1 rounded-full',
          BG_STYLES[bgStyle].className,
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
            'flex items-center justify-center h-9 w-6 sm:h-6 sm:w-4 rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
            'touch-none',
          ].join(' ')}
          title="Ziehen zum Verschieben"
          aria-label="Quick-Actions verschieben"
          role="button"
        >
          <GripVertical className="h-4 w-4 sm:h-3 sm:w-3" />
        </div>

        {!collapsed &&
          selectedItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.name}
                title={item.name}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-6 sm:w-6 rounded-full hover:bg-foreground/10"
                >
                  <Icon className="!size-5 sm:!size-3.5" />
                </Button>
              </Link>
            )
          })}

        <Button
          onClick={() => openChat()}
          className="h-9 w-9 sm:h-6 sm:w-6 rounded-full shadow-md"
          size="icon"
          aria-label="KI-Chat öffnen"
          title="KI-Chat"
        >
          <Brain className="!size-5 sm:!size-3.5" />
        </Button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setSettingsOpen((s) => !s)}
            className="flex items-center justify-center h-8 w-8 sm:h-5 sm:w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            title="Quick-Actions konfigurieren"
            aria-label="Quick-Actions konfigurieren"
          >
            <Settings2 className="h-4 w-4 sm:h-3 sm:w-3" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center h-8 w-6 sm:h-5 sm:w-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          title={collapsed ? 'Erweitern' : 'Einklappen'}
          aria-label={collapsed ? 'Quick-Actions erweitern' : 'Quick-Actions einklappen'}
        >
          {collapsed ? <ChevronLeft className="h-4 w-4 sm:h-3 sm:w-3" /> : <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />}
        </button>
      </div>
    </div>
  )
}

function SettingsPopover({
  availableItems,
  selectedKeys,
  onToggle,
  onReorder,
  onClose,
  maxIcons,
  reorderDragKey,
  setReorderDragKey,
  bgStyle,
  onBgStyleChange,
}: {
  availableItems: FlatItem[]
  selectedKeys: string[]
  onToggle: (key: string) => void
  onReorder: (from: string, to: string) => void
  onClose: () => void
  maxIcons: number
  reorderDragKey: string | null
  setReorderDragKey: (k: string | null) => void
  bgStyle: BgStyle
  onBgStyleChange: (s: BgStyle) => void
}) {
  const selectedSet = new Set(selectedKeys)
  const byKey = new Map(availableItems.map((i) => [i.key, i]))
  const orderedSelected = selectedKeys
    .map((k) => byKey.get(k))
    .filter((i): i is FlatItem => !!i)
  const remaining = availableItems.filter((i) => !selectedSet.has(i.key))
  const capReached = selectedKeys.length >= maxIcons

  return (
    <div
      className={[
        'w-80 max-h-[520px] overflow-y-auto rounded-xl shadow-xl border border-border/60',
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

      <div className="space-y-1.5 pb-2 border-b border-border/40">
        <div className="text-[11px] text-muted-foreground">Hintergrund</div>
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(BG_STYLES) as BgStyle[]).map((s) => {
            const active = bgStyle === s
            // Buttons zeigen den jeweiligen Hintergrund als Live-Vorschau —
            // statt eines neutralen Pill-Buttons bekommt der User direkt das
            // Preset-Aussehen zu sehen.
            return (
              <button
                key={s}
                type="button"
                onClick={() => onBgStyleChange(s)}
                className={[
                  'rounded-md px-1 py-1.5 text-[10px] transition-all',
                  BG_STYLES[s].className || 'border border-dashed border-border/60 bg-background/30',
                  active
                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                    : 'opacity-80 hover:opacity-100',
                ].join(' ')}
                title={BG_STYLES[s].label}
              >
                {BG_STYLES[s].label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        {selectedKeys.length} / {maxIcons} ausgewaehlt · Ziehen zum Sortieren
      </div>

      {orderedSelected.length > 0 && (
        <ul className="space-y-1">
          {orderedSelected.map((item) => {
            const Icon = item.icon
            const isDraggingThis = reorderDragKey === item.key
            return (
              <li
                key={item.key}
                draggable
                onDragStart={(e) => {
                  setReorderDragKey(item.key)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', item.key)
                }}
                onDragEnd={() => setReorderDragKey(null)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = e.dataTransfer.getData('text/plain') || reorderDragKey
                  if (from && from !== item.key) onReorder(from, item.key)
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
                <span className="flex-1 truncate" title={item.name}>{item.name}</span>
                <button
                  type="button"
                  onClick={() => onToggle(item.key)}
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
                <li key={item.key}>
                  <button
                    type="button"
                    disabled={capReached}
                    onClick={() => onToggle(item.key)}
                    className={[
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                      'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                      capReached ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left" title={item.name}>{item.name}</span>
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
