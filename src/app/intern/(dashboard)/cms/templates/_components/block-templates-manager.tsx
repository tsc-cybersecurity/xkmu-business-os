'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  LayoutTemplate,
  Type,
  Heading,
  ImageIcon,
  SquareStack,
  MousePointerClick,
  Star,
  Box,
  MessageSquareQuote,
  CreditCard,
  HelpCircle,
  BarChart3,
  Users,
  GitBranch,
  Building2,
  Play,
  GalleryHorizontalEnd,
  Megaphone,
  Minus,
  Table2,
  Search,
} from 'lucide-react'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'

interface BlockTemplate {
  id: string
  name: string
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
  isSystem: boolean | null
  createdAt: string | null
}

interface BlockTypeDefinition {
  slug: string
  name: string
  icon: string | null
}

const iconMap: Record<string, LucideIcon> = {
  LayoutTemplate,
  Type,
  Heading,
  ImageIcon,
  SquareStack,
  MousePointerClick,
  Star,
  Box,
  MessageSquareQuote,
  CreditCard,
  HelpCircle,
  BarChart3,
  Users,
  GitBranch,
  Building2,
  Play,
  GalleryHorizontalEnd,
  Megaphone,
  Minus,
  Table2,
}

// Map blockType slugs to icon names
const blockTypeIconMap: Record<string, string> = {
  hero: 'LayoutTemplate',
  features: 'Star',
  cta: 'MousePointerClick',
  text: 'Type',
  heading: 'Heading',
  image: 'ImageIcon',
  cards: 'SquareStack',
  testimonials: 'MessageSquareQuote',
  pricing: 'CreditCard',
  faq: 'HelpCircle',
  stats: 'BarChart3',
  team: 'Users',
  timeline: 'GitBranch',
  logocloud: 'Building2',
  video: 'Play',
  gallery: 'GalleryHorizontalEnd',
  banner: 'Megaphone',
  divider: 'Minus',
  comparison: 'Table2',
  placeholder: 'Box',
}

export function BlockTemplatesManager() {
  const [templates, setTemplates] = useState<BlockTemplate[]>([])
  const [blockTypes, setBlockTypes] = useState<BlockTypeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<BlockTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formBlockType, setFormBlockType] = useState('')
  const [formContent, setFormContent] = useState('{}')
  const [formSettings, setFormSettings] = useState('{}')

  const fetchTemplates = useCallback(async () => {
    try {
      const url = filterType && filterType !== 'all'
        ? `/api/v1/cms/templates?blockType=${filterType}`
        : '/api/v1/cms/templates'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) setTemplates(data.data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast.error('Fehler beim Laden der Vorlagen')
    } finally {
      setLoading(false)
    }
  }, [filterType])

  const fetchBlockTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cms/block-types')
      const data = await response.json()
      if (data.success) setBlockTypes(data.data)
    } catch (error) {
      console.error('Failed to fetch block types:', error)
    }
  }, [])

  useEffect(() => {
    fetchBlockTypes()
  }, [fetchBlockTypes])

  useEffect(() => {
    setLoading(true)
    fetchTemplates()
  }, [fetchTemplates])

  const getBlockTypeIcon = (blockType: string): LucideIcon => {
    const iconName = blockTypeIconMap[blockType]
    return (iconName ? iconMap[iconName] : null) ?? Box
  }

  const getBlockTypeName = (slug: string): string => {
    const bt = blockTypes.find((b) => b.slug === slug)
    return bt?.name ?? slug
  }

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.blockType.toLowerCase().includes(q)
    }
    return true
  })

  const resetForm = () => {
    setFormName('')
    setFormBlockType('')
    setFormContent('{}')
    setFormSettings('{}')
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formBlockType) return
    let content: Record<string, unknown>
    let settings: Record<string, unknown>
    try {
      content = JSON.parse(formContent)
      settings = JSON.parse(formSettings)
    } catch {
      toast.error('Ungültiges JSON in Content oder Settings')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/v1/cms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, blockType: formBlockType, content, settings }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Vorlage erstellt')
        setShowCreateDialog(false)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error?.message || 'Fehler beim Erstellen')
      }
    } catch {
      toast.error('Fehler beim Erstellen der Vorlage')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTemplate || !formName.trim()) return
    let content: Record<string, unknown>
    let settings: Record<string, unknown>
    try {
      content = JSON.parse(formContent)
      settings = JSON.parse(formSettings)
    } catch {
      toast.error('Ungültiges JSON in Content oder Settings')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/v1/cms/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, blockType: formBlockType, content, settings }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Vorlage aktualisiert')
        setShowEditDialog(false)
        resetForm()
        fetchTemplates()
      } else {
        toast.error(data.error?.message || 'Fehler beim Aktualisieren')
      }
    } catch {
      toast.error('Fehler beim Aktualisieren der Vorlage')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template: BlockTemplate) => {
    if (!confirm(`Vorlage "${template.name}" wirklich loeschen?`)) return
    try {
      const response = await fetch(`/api/v1/cms/templates/${template.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        toast.success('Vorlage geloescht')
        fetchTemplates()
      } else {
        toast.error(data.error?.message || 'Fehler beim Loeschen')
      }
    } catch {
      toast.error('Fehler beim Loeschen der Vorlage')
    }
  }

  const handleCopyContent = (template: BlockTemplate) => {
    const json = JSON.stringify({ blockType: template.blockType, content: template.content, settings: template.settings }, null, 2)
    navigator.clipboard.writeText(json)
    toast.success('Template-Inhalt in Zwischenablage kopiert')
  }

  const openEditDialog = (template: BlockTemplate) => {
    setSelectedTemplate(template)
    setFormName(template.name)
    setFormBlockType(template.blockType)
    setFormContent(JSON.stringify(template.content, null, 2))
    setFormSettings(JSON.stringify(template.settings, null, 2))
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Blocktypen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Blocktypen</SelectItem>
            {blockTypes.map((bt) => (
              <SelectItem key={bt.slug} value={bt.slug}>
                {bt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Vorlagen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Keine Vorlagen gefunden
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTemplates.map((template) => {
            const Icon = getBlockTypeIcon(template.blockType)
            return (
              <div
                key={template.id}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm leading-tight">{template.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-xs">
                          {getBlockTypeName(template.blockType)}
                        </Badge>
                        {template.isSystem && (
                          <Badge variant="outline" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Inhalt kopieren"
                      onClick={() => handleCopyContent(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Bearbeiten"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!template.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Loeschen"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Inline Preview */}
                <div className="bg-background">
                  <CmsBlockRenderer
                    blockType={template.blockType}
                    content={template.content}
                    settings={template.settings}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Vorlage erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Meine Vorlage"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Blocktyp</Label>
              <Select value={formBlockType} onValueChange={setFormBlockType}>
                <SelectTrigger>
                  <SelectValue placeholder="Blocktyp waehlen..." />
                </SelectTrigger>
                <SelectContent>
                  {blockTypes.map((bt) => (
                    <SelectItem key={bt.slug} value={bt.slug}>
                      {bt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content (JSON)</Label>
              <Textarea
                placeholder="{}"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Settings (JSON)</Label>
              <Textarea
                placeholder="{}"
                value={formSettings}
                onChange={(e) => setFormSettings(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim() || !formBlockType}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vorlage bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Blocktyp</Label>
              <Select value={formBlockType} onValueChange={setFormBlockType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {blockTypes.map((bt) => (
                    <SelectItem key={bt.slug} value={bt.slug}>
                      {bt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content (JSON)</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Settings (JSON)</Label>
              <Textarea
                value={formSettings}
                onChange={(e) => setFormSettings(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
