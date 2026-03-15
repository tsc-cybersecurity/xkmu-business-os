'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  level?: number
  createdAt: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [flatCategories, setFlatCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formParentId, setFormParentId] = useState<string>('')
  const [formSortOrder, setFormSortOrder] = useState(0)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const [treeRes, flatRes] = await Promise.all([
        fetch('/api/v1/product-categories?tree=true'),
        fetch('/api/v1/product-categories'),
      ])
      const treeData = await treeRes.json()
      const flatData = await flatRes.json()

      if (treeData.success) setCategories(treeData.data)
      if (flatData.success) setFlatCategories(flatData.data)
    } catch (error) {
      logger.error('Failed to fetch categories', error, { module: 'CatalogCategoriesPage' })
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingCategory(null)
    setFormName('')
    setFormDescription('')
    setFormParentId('')
    setFormSortOrder(0)
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormName(category.name)
    setFormDescription(category.description || '')
    setFormParentId(category.parentId || '')
    setFormSortOrder(category.sortOrder)
    setDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setDeletingCategory(category)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: formName,
        description: formDescription || undefined,
        parentId: formParentId || null,
        sortOrder: formSortOrder,
      }

      const url = editingCategory
        ? `/api/v1/product-categories/${editingCategory.id}`
        : '/api/v1/product-categories'

      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setDialogOpen(false)
        fetchCategories()
      }
    } catch (error) {
      logger.error('Failed to save category', error, { module: 'CatalogCategoriesPage' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    try {
      const response = await fetch(
        `/api/v1/product-categories/${deletingCategory.id}`,
        { method: 'DELETE' }
      )
      const data = await response.json()

      if (data.success) {
        setDeleteDialogOpen(false)
        fetchCategories()
      } else {
        setDeleteError(data.error?.message || 'Fehler beim Löschen')
      }
    } catch (error) {
      logger.error('Failed to delete category', error, { module: 'CatalogCategoriesPage' })
      setDeleteError('Fehler beim Löschen der Kategorie')
    }
  }

  // Get available parent categories (exclude self and children when editing)
  const getParentOptions = () => {
    if (!editingCategory) return flatCategories
    return flatCategories.filter((c) => c.id !== editingCategory.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kategorien</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Produkt- und Dienstleistungskategorien
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Kategorie
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Kategorien</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihre erste Kategorie, um Produkte zu organisieren.
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Erste Kategorie erstellen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="text-center">Sortierung</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(category.level ?? 0) > 0 && (
                          <span
                            className="text-muted-foreground"
                            style={{
                              paddingLeft: `${(category.level ?? 0) * 1.5}rem`,
                            }}
                          >
                            └
                          </span>
                        )}
                        <span className="font-medium">{category.name}</span>
                        {category.parentId && (
                          <Badge variant="outline" className="text-xs">
                            Unterkategorie
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Bearbeiten"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Loeschen"
                          onClick={() => openDeleteDialog(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="z.B. IT-Beratung"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optionale Beschreibung"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">Übergeordnete Kategorie</Label>
              <Select
                value={formParentId}
                onValueChange={setFormParentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine (Hauptkategorie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (Hauptkategorie)</SelectItem>
                  {getParentOptions().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sortierung</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? 'Speichern...' : editingCategory ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteError ? (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kategorie kann nicht gelöscht werden</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{deleteError}</p>
            <DialogFooter>
              <Button onClick={() => setDeleteDialogOpen(false)}>
                Verstanden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Kategorie löschen"
          description={`Sind Sie sicher, dass Sie die Kategorie "${deletingCategory?.name}" löschen möchten?`}
          confirmLabel="Löschen"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
