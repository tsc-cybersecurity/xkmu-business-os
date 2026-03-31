'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Check } from 'lucide-react'
import { IconPicker } from '@/components/shared'

// ============================================
// ArrayField
// ============================================
export function ArrayField({
  label, items, onChange, fields,
}: {
  label: string
  items: Record<string, string>[]
  onChange: (items: Record<string, string>[]) => void
  fields: string[]
}) {
  const addItem = () => {
    const newItem: Record<string, string> = {}
    fields.forEach((f) => (newItem[f] = ''))
    onChange([...items, newItem])
  }
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Hinzufuegen</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start rounded-lg border p-3">
          <div className="flex-1 grid grid-cols-1 gap-2">
            {fields.map((field) => (
              field.toLowerCase() === 'icon' ? (
                <IconPicker key={field} value={item[field] || ''} onChange={(v) => updateItem(i, field, v)} label="Icon waehlen..." />
              ) : (
                <Input key={field} placeholder={field} value={item[field] || ''} onChange={(e) => updateItem(i, field, e.target.value)} className="text-sm" />
              )
            ))}
          </div>
          <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ============================================
// PricingPlansField
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PricingPlansField({ plans, onChange }: { plans: Array<Record<string, any>>; onChange: (plans: Array<Record<string, any>>) => void }) {
  const addPlan = () => onChange([...plans, { name: '', price: '', period: 'Monat', description: '', features: [], buttonLabel: '', buttonHref: '', highlighted: false }])
  const removePlan = (index: number) => onChange(plans.filter((_, i) => i !== index))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePlan = (index: number, field: string, value: any) => { const updated = [...plans]; updated[index] = { ...updated[index], [field]: value }; onChange(updated) }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Pakete</Label>
        <Button variant="outline" size="sm" onClick={addPlan}><Plus className="h-3 w-3 mr-1" /> Paket hinzufuegen</Button>
      </div>
      {plans.map((plan, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Paket {i + 1}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => updatePlan(i, 'highlighted', !plan.highlighted)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${plan.highlighted ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'border-border'}`}>
                {plan.highlighted && <Check className="h-3 w-3" />}Hervorgehoben
              </button>
              <Button variant="ghost" size="icon" aria-label="Löschen" className="h-7 w-7" onClick={() => removePlan(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={plan.name || ''} onChange={(e) => updatePlan(i, 'name', e.target.value)} className="text-sm" />
            <Input placeholder="Preis (z.B. 29€)" value={plan.price || ''} onChange={(e) => updatePlan(i, 'price', e.target.value)} className="text-sm" />
            <Input placeholder="Zeitraum (z.B. Monat)" value={plan.period || ''} onChange={(e) => updatePlan(i, 'period', e.target.value)} className="text-sm" />
            <Input placeholder="Beschreibung" value={plan.description || ''} onChange={(e) => updatePlan(i, 'description', e.target.value)} className="text-sm" />
            <Input placeholder="Button Text" value={plan.buttonLabel || ''} onChange={(e) => updatePlan(i, 'buttonLabel', e.target.value)} className="text-sm" />
            <Input placeholder="Button Link" value={plan.buttonHref || ''} onChange={(e) => updatePlan(i, 'buttonHref', e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Features (eins pro Zeile)</Label>
            <Textarea value={(plan.features || []).join('\n')} onChange={(e) => updatePlan(i, 'features', e.target.value.split('\n').filter((l: string) => l.trim()))} rows={4} className="text-sm" placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// ServiceCardsField
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ServiceCardsField({ items, onChange }: { items: Array<Record<string, any>>; onChange: (items: Array<Record<string, any>>) => void }) {
  const addItem = () => onChange([...items, { badge: '', title: '', description: '', checklistItems: [], deliverables: [] }])
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (index: number, field: string, value: any) => { const updated = [...items]; updated[index] = { ...updated[index], [field]: value }; onChange(updated) }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Service-Karten</Label>
        <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Karte hinzufuegen</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Karte {i + 1}</span>
            <Button variant="ghost" size="icon" aria-label="Loeschen" className="h-7 w-7" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Badge (z.B. B1)" value={item.badge || ''} onChange={(e) => updateItem(i, 'badge', e.target.value)} className="text-sm" />
            <Input placeholder="Titel" value={item.title || ''} onChange={(e) => updateItem(i, 'title', e.target.value)} className="text-sm col-span-3" />
          </div>
          <Input placeholder="Beschreibung" value={item.description || ''} onChange={(e) => updateItem(i, 'description', e.target.value)} className="text-sm" />
          <div className="space-y-1">
            <Label className="text-xs">Checkliste (eins pro Zeile)</Label>
            <Textarea value={(item.checklistItems || []).join('\n')} onChange={(e) => updateItem(i, 'checklistItems', e.target.value.split('\n').filter((l: string) => l.trim()))} rows={4} className="text-sm" placeholder="Leistungspunkt 1&#10;Leistungspunkt 2" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deliverables (kommagetrennt)</Label>
            <Input value={(item.deliverables || []).join(', ')} onChange={(e) => updateItem(i, 'deliverables', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} className="text-sm" placeholder="Ergebnis 1, Ergebnis 2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// ComparisonField
// ============================================
export function ComparisonField({
  columns, rows, onChangeColumns, onChangeRows,
}: {
  columns: Array<{ name: string; highlighted?: boolean }>
  rows: Array<{ feature: string; values: string[] }>
  onChangeColumns: (cols: Array<{ name: string; highlighted?: boolean }>) => void
  onChangeRows: (rows: Array<{ feature: string; values: string[] }>) => void
}) {
  const addColumn = () => { onChangeColumns([...columns, { name: '', highlighted: false }]); onChangeRows(rows.map((r) => ({ ...r, values: [...(r.values || []), ''] }))) }
  const removeColumn = (index: number) => { onChangeColumns(columns.filter((_, i) => i !== index)); onChangeRows(rows.map((r) => ({ ...r, values: (r.values || []).filter((_, i) => i !== index) }))) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateColumn = (index: number, field: string, value: any) => { const updated = [...columns]; updated[index] = { ...updated[index], [field]: value }; onChangeColumns(updated) }
  const addRow = () => onChangeRows([...rows, { feature: '', values: columns.map(() => '') }])
  const removeRow = (index: number) => onChangeRows(rows.filter((_, i) => i !== index))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRow = (rowIndex: number, field: string, value: any) => { const updated = [...rows]; if (field === 'feature') updated[rowIndex] = { ...updated[rowIndex], feature: value }; onChangeRows(updated) }
  const updateRowValue = (rowIndex: number, colIndex: number, value: string) => { const updated = [...rows]; const values = [...(updated[rowIndex].values || [])]; values[colIndex] = value; updated[rowIndex] = { ...updated[rowIndex], values }; onChangeRows(updated) }
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Spalten</Label>
          <Button variant="outline" size="sm" onClick={addColumn}><Plus className="h-3 w-3 mr-1" /> Spalte</Button>
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input placeholder="Spaltenname" value={col.name} onChange={(e) => updateColumn(i, 'name', e.target.value)} className="text-sm" />
            <button type="button" onClick={() => updateColumn(i, 'highlighted', !col.highlighted)} className={`shrink-0 text-xs px-2 py-1 rounded-md border ${col.highlighted ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300' : 'border-border'}`}>
              {col.highlighted ? 'Hervorgehoben' : 'Normal'}
            </button>
            <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeColumn(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Zeilen</Label>
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3 w-3 mr-1" /> Zeile</Button>
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="rounded-lg border p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Feature-Name" value={row.feature} onChange={(e) => updateRow(ri, 'feature', e.target.value)} className="text-sm font-medium" />
              <Button variant="ghost" size="icon" aria-label="Löschen" className="h-8 w-8 shrink-0" onClick={() => removeRow(ri)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col, ci) => (
                <Input key={ci} placeholder={`${col.name || `Spalte ${ci + 1}`} (ja/nein/Text)`} value={(row.values || [])[ci] || ''} onChange={(e) => updateRowValue(ri, ci, e.target.value)} className="text-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
