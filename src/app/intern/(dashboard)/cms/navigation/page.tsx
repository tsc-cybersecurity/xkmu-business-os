'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Navigation,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface NavItem {
  id: string
  location: string
  label: string
  href: string
  pageId: string | null
  sortOrder: number
  openInNewTab: boolean
  isVisible: boolean
}

interface CmsPage {
  id: string
  slug: string
  title: string
  status: string | null
}

type LinkType = 'page' | 'external'

export default function CmsNavigationPage() {
  const [items, setItems] = useState<NavItem[]>([])
  const [pages, setPages] = useState<CmsPage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('header')

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<NavItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formLabel, setFormLabel] = useState('')
  const [formLinkType, setFormLinkType] = useState<LinkType>('external')
  const [formHref, setFormHref] = useState('')
  const [formPageId, setFormPageId] = useState('')
  const [formOpenInNewTab, setFormOpenInNewTab] = useState(false)

  const fetchItems = useCallback(async (trySeed = false) => {
    try {
      const response = await fetch('/api/v1/cms/navigation')
      const data = await response.json()
      if (data.success) {
        if (data.data.length === 0 && trySeed) {
          // No items exist yet - seed defaults
          await fetch('/api/v1/cms/navigation/seed', { method: 'POST' })
          const retry = await fetch('/api/v1/cms/navigation')
          const retryData = await retry.json()
          if (retryData.success) setItems(retryData.data)
        } else {
          setItems(data.data)
        }
      }
    } catch (error) {
      logger.error('Failed to fetch navigation items', error, { module: 'CmsNavigationPage' })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPages = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cms/pages?limit=200')
      const data = await response.json()
      if (data.success) setPages(data.data.filter((p: CmsPage) => p.status === 'published'))
    } catch (error) {
      logger.error('Failed to fetch CMS pages', error, { module: 'CmsNavigationPage' })
    }
  }, [])

  useEffect(() => {
    fetchItems(true)
    fetchPages()
  }, [fetchItems, fetchPages])

  const filteredItems = items
    .filter((item) => item.location === activeTab)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormLabel('')
    setFormLinkType('external')
    setFormHref('')
    setFormPageId('')
    setFormOpenInNewTab(false)
    setShowDialog(true)
  }

  const openEditDialog = (item: NavItem) => {
    setEditingItem(item)
    setFormLabel(item.label)
    if (item.pageId) {
      setFormLinkType('page')
      setFormPageId(item.pageId)
      setFormHref('')
    } else {
      setFormLinkType('external')
      setFormHref(item.href)
      setFormPageId('')
    }
    setFormOpenInNewTab(item.openInNewTab)
    setShowDialog(true)
  }

  const handleSave = async () => {
    const href = formLinkType === 'page'
      ? pages.find((p) => p.id === formPageId)?.slug || ''
      : formHref

    if (!formLabel.trim() || !href.trim()) return

    setSaving(true)
    try {
      const body = {
        location: activeTab,
        label: formLabel,
        href,
        pageId: formLinkType === 'page' ? formPageId : null,
        openInNewTab: formOpenInNewTab,
        sortOrder: editingItem ? editingItem.sortOrder : filteredItems.length,
      }

      if (editingItem) {
        await fetch(`/api/v1/cms/navigation/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/v1/cms/navigation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      setShowDialog(false)
      fetchItems()
    } catch (error) {
      logger.error('Failed to save navigation item', error, { module: 'CmsNavigationPage' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Navigations-Item wirklich loeschen?')) return
    try {
      await fetch(`/api/v1/cms/navigation/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch (error) {
      logger.error('Failed to delete navigation item', error, { module: 'CmsNavigationPage' })
    }
  }

  const handleToggleVisibility = async (item: NavItem) => {
    try {
      await fetch(`/api/v1/cms/navigation/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      })
      fetchItems()
    } catch (error) {
      logger.error('Failed to toggle visibility', error, { module: 'CmsNavigationPage' })
    }
  }

  const handleMove = async (item: NavItem, direction: 'up' | 'down') => {
    const sorted = [...filteredItems]
    const idx = sorted.findIndex((i) => i.id === item.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const newOrder = sorted.map((i) => i.id)
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]

    try {
      await fetch('/api/v1/cms/navigation/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: newOrder }),
      })
      fetchItems()
    } catch (error) {
      logger.error('Failed to reorder', error, { module: 'CmsNavigationPage' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Navigation className="h-8 w-8" />
            Navigation
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie die Navigations-Links Ihrer Webseite</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Item hinzufuegen
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="header">Header-Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer-Navigation</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="mt-4">
          <NavigationList
            items={filteredItems}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
            onMove={handleMove}
          />
        </TabsContent>

        <TabsContent value="footer" className="mt-4">
          <NavigationList
            items={filteredItems}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
            onMove={handleMove}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Item bearbeiten' : 'Neues Item hinzufuegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="z.B. Ueber uns"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={formLinkType} onValueChange={(v) => setFormLinkType(v as LinkType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CMS-Seite
                    </span>
                  </SelectItem>
                  <SelectItem value="external">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Externer Link
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formLinkType === 'page' ? (
              <div className="space-y-2">
                <Label>CMS-Seite</Label>
                <Select value={formPageId} onValueChange={setFormPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seite auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title} ({page.slug})
                      </SelectItem>
                    ))}
                    {pages.length === 0 && (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Keine veroeffentlichten Seiten vorhanden
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>URL / Pfad</Label>
                <Input
                  placeholder="https://... oder /pfad"
                  value={formHref}
                  onChange={(e) => setFormHref(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="openInNewTab"
                checked={formOpenInNewTab}
                onChange={(e) => setFormOpenInNewTab(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="openInNewTab" className="cursor-pointer">In neuem Tab oeffnen</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formLabel.trim() || (formLinkType === 'page' ? !formPageId : !formHref.trim())}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Speichern' : 'Hinzufuegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NavigationList({
  items,
  onEdit,
  onDelete,
  onToggleVisibility,
  onMove,
}: {
  items: NavItem[]
  onEdit: (item: NavItem) => void
  onDelete: (id: string) => void
  onToggleVisibility: (item: NavItem) => void
  onMove: (item: NavItem, direction: 'up' | 'down') => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Noch keine Navigations-Items vorhanden
      </div>
    )
  }

  return (
    <div className="rounded-md border divide-y">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-center gap-4 px-4 py-3 ${!item.isVisible ? 'opacity-50' : ''}`}
        >
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === 0}
              onClick={() => onMove(item, 'up')}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === items.length - 1}
              onClick={() => onMove(item, 'down')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
              {item.pageId ? <FileText className="h-3 w-3 shrink-0" /> : <ExternalLink className="h-3 w-3 shrink-0" />}
              {item.href}
              {item.openInNewTab && <span className="text-xs">(neuer Tab)</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              title={item.isVisible ? 'Ausblenden' : 'Einblenden'}
              onClick={() => onToggleVisibility(item)}
            >
              {item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" title="Bearbeiten" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Loeschen" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
