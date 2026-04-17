'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Brain } from 'lucide-react'

interface Opportunity {
  id: string
  name: string
  industry: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
  status: string
  source: string | null
  searchQuery: string | null
  searchLocation: string | null
  notes: string | null
  placeId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface EditForm {
  name: string
  industry: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  notes: string
  status: string
}

interface ChancenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editOpp: Opportunity | null
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  savingEdit: boolean
  onSave: () => void
  onOpenChat: (opp: Opportunity) => void
}

export function ChancenDialog({
  open,
  onOpenChange,
  editOpp,
  editForm,
  setEditForm,
  savingEdit,
  onSave,
  onOpenChat,
}: ChancenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chance bearbeiten</DialogTitle>
          <DialogDescription>Daten bearbeiten und speichern</DialogDescription>
        </DialogHeader>
        {editOpp && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Branche</Label>
                <Input id="edit-industry" value={editForm.industry} onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editForm.status} onValueChange={(val) => setEditForm(f => ({ ...f, status: val }))}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Neu</SelectItem>
                    <SelectItem value="contacted">Kontaktiert</SelectItem>
                    <SelectItem value="qualified">Qualifiziert</SelectItem>
                    <SelectItem value="rejected">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Adresse</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-address">Strasse</Label>
                  <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-postalCode">PLZ</Label>
                  <Input id="edit-postalCode" value={editForm.postalCode} onChange={(e) => setEditForm(f => ({ ...f, postalCode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Ort</Label>
                  <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-country">Land</Label>
                  <Input id="edit-country" value={editForm.country} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Kontakt</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">E-Mail</Label>
                  <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input id="edit-website" value={editForm.website} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="edit-notes">Notizen</Label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
                placeholder="Notizen..."
              />
            </div>

            {editOpp.rating !== null && (
              <div className="border-t pt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Bewertung: {editOpp.rating?.toFixed(1)} <span className="text-yellow-500">&#9733;</span> ({editOpp.reviewCount || 0})</span>
                <span>Erstellt: {new Date(editOpp.id).toLocaleDateString('de-DE')}</span>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (editOpp) onOpenChat(editOpp) }}
          >
            <Brain className="mr-2 h-4 w-4" />
            KI fragen
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button onClick={onSave} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
