'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Pencil, Check, X, Package } from 'lucide-react'

interface DocumentItem {
  id: string
  position: number
  productId: string | null
  name: string
  description: string | null
  quantity: string
  unit: string
  unitPrice: string
  vatRate: string
  discount: string | null
  discountType: string | null
  lineTotal: string
}

interface Product {
  id: string
  name: string
  description: string | null
  type: string
  priceNet: string | null
  vatRate: string | null
  unit: string | null
  sku: string | null
}

interface LineItemsEditorProps {
  documentId: string
  items: DocumentItem[]
  readonly?: boolean
  onItemsChanged: () => void
  subtotal: string
  taxTotal: string
  total: string
}

const unitOptions = [
  'Stück', 'Stunde', 'Tag', 'Monat', 'Pauschal', 'kg', 'Liter', 'm', 'm²',
]

const vatRateOptions = [
  { value: '19', label: '19%' },
  { value: '7', label: '7%' },
  { value: '0', label: '0%' },
]

function formatCurrency(value: string | null): string {
  if (!value) return '0,00 €'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(value))
}

export function LineItemsEditor({
  documentId,
  items,
  readonly = false,
  onItemsChanged,
  subtotal,
  taxTotal,
  total,
}: LineItemsEditorProps) {
  const [adding, setAdding] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    quantity: '1',
    unit: 'Stück',
    unitPrice: '0',
    vatRate: '19',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: '1',
    unit: 'Stück',
    unitPrice: '0',
    vatRate: '19',
    productId: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/v1/products?limit=200&status=active')
      const data = await response.json()
      if (data.success) setProducts(data.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const handleProductSelect = (productId: string) => {
    if (productId === 'none') {
      setNewItem(prev => ({ ...prev, productId: '' }))
      return
    }
    const product = products.find(p => p.id === productId)
    if (product) {
      setNewItem(prev => ({
        ...prev,
        productId: product.id,
        name: product.name,
        description: product.description || '',
        unitPrice: product.priceNet || '0',
        vatRate: product.vatRate || '19',
        unit: product.unit || 'Stück',
      }))
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setAdding(true)
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newItem.productId || undefined,
          name: newItem.name,
          description: newItem.description || undefined,
          quantity: parseFloat(newItem.quantity) || 1,
          unit: newItem.unit,
          unitPrice: parseFloat(newItem.unitPrice) || 0,
          vatRate: parseFloat(newItem.vatRate) || 19,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Fehler beim Hinzufügen')
      }

      setNewItem({ name: '', description: '', quantity: '1', unit: 'Stück', unitPrice: '0', vatRate: '19', productId: '' })
      onItemsChanged()
      toast.success('Position hinzugefügt')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler')
    } finally {
      setAdding(false)
    }
  }

  const startEditing = (item: DocumentItem) => {
    setEditingItemId(item.id)
    setEditData({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    })
  }

  const cancelEditing = () => {
    setEditingItemId(null)
  }

  const handleSaveEdit = async (itemId: string) => {
    if (!editData.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setSavingEdit(true)
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          description: editData.description || undefined,
          quantity: parseFloat(editData.quantity) || 1,
          unit: editData.unit,
          unitPrice: parseFloat(editData.unitPrice) || 0,
          vatRate: parseFloat(editData.vatRate) || 19,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Fehler beim Speichern')
      }

      setEditingItemId(null)
      onItemsChanged()
      toast.success('Position aktualisiert')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Entfernen')

      onItemsChanged()
      toast.success('Position entfernt')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler')
    }
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">Pos</TableHead>
            <TableHead>Bezeichnung</TableHead>
            <TableHead className="w-[80px] text-right">Menge</TableHead>
            <TableHead className="w-[80px]">Einheit</TableHead>
            <TableHead className="w-[120px] text-right">Einzelpreis</TableHead>
            <TableHead className="w-[70px] text-right">MwSt</TableHead>
            <TableHead className="w-[120px] text-right">Gesamt</TableHead>
            {!readonly && <TableHead className="w-[90px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={readonly ? 7 : 8} className="text-center text-muted-foreground py-8">
                Keine Positionen vorhanden
              </TableCell>
            </TableRow>
          )}
          {items.map((item, index) => (
            <TableRow key={item.id}>
              {editingItemId === item.id ? (
                <>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="mb-1"
                    />
                    <Input
                      placeholder="Beschreibung"
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={editData.quantity}
                      onChange={(e) => setEditData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={editData.unit} onValueChange={(v) => setEditData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.unitPrice}
                      onChange={(e) => setEditData(prev => ({ ...prev, unitPrice: e.target.value }))}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={editData.vatRate} onValueChange={(v) => setEditData(prev => ({ ...prev, vatRate: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vatRateOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600"
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {parseFloat(item.quantity).toLocaleString('de-DE')}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">{item.vatRate}%</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                  {!readonly && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditing(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={readonly ? 5 : 6} className="text-right font-medium">Zwischensumme (netto)</TableCell>
            <TableCell colSpan={2} className="text-right font-mono">{formatCurrency(subtotal)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={readonly ? 5 : 6} className="text-right font-medium">MwSt</TableCell>
            <TableCell colSpan={2} className="text-right font-mono">{formatCurrency(taxTotal)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={readonly ? 5 : 6} className="text-right text-lg font-bold">Gesamtbetrag</TableCell>
            <TableCell colSpan={2} className="text-right font-mono text-lg font-bold">{formatCurrency(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {/* Add new item */}
      {!readonly && (
        <div className="mt-4 rounded-md border p-4 space-y-3">
          <h4 className="font-medium text-sm">Neue Position hinzufügen</h4>

          {/* Product selection */}
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Select
                value={newItem.productId || 'none'}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Artikel/Service auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Manuell eingeben --</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}{product.sku ? ` (${product.sku})` : ''} — {formatCurrency(product.priceNet)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <Input
                placeholder="Bezeichnung *"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="Menge"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <div>
              <Select
                value={newItem.unit}
                onValueChange={(v) => setNewItem(prev => ({ ...prev, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Einzelpreis"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: e.target.value }))}
              />
            </div>
            <div>
              <Select
                value={newItem.vatRate}
                onValueChange={(v) => setNewItem(prev => ({ ...prev, vatRate: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vatRateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Beschreibung (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              className="flex-1"
            />
            <Button onClick={handleAddItem} disabled={adding}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Hinzufügen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
