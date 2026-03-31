import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface ControlMapping {
  id: string
  controlId: string
  applicability: string
  justification: string | null
  implementationStatus: string
  implementationNotes: string | null
}

interface CatalogGroup {
  id: string
  title: string
  controlCount?: number
}

interface CatalogControl {
  id: string
  controlId: string
  title: string
}

const APPLICABILITY_OPTIONS = [
  { value: 'applicable', label: 'Anwendbar' },
  { value: 'not_applicable', label: 'Nicht anwendbar' },
] as const

const IMPL_STATUS_OPTIONS = [
  { value: 'offen', label: 'Offen' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'teilweise', label: 'Teilweise' },
  { value: 'umgesetzt', label: 'Umgesetzt' },
  { value: 'nicht_umgesetzt', label: 'Nicht umgesetzt' },
] as const

interface AssetControlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingControl: ControlMapping | null
  ctrlGroups: CatalogGroup[]
  ctrlGroupControls: CatalogControl[]
  ctrlSelectedGroup: string
  setCtrlSelectedGroup: (v: string) => void
  ctrlSelectedControl: string
  setCtrlSelectedControl: (v: string) => void
  ctrlApplicability: string
  setCtrlApplicability: (v: string) => void
  ctrlImplStatus: string
  setCtrlImplStatus: (v: string) => void
  ctrlJustification: string
  setCtrlJustification: (v: string) => void
  ctrlImplNotes: string
  setCtrlImplNotes: (v: string) => void
  ctrlSaving: boolean
  ctrlLoadingControls: boolean
  onFetchGroupControls: (groupId: string) => void
  onSave: () => void
}

export function AssetControlDialog({
  open,
  onOpenChange,
  editingControl,
  ctrlGroups,
  ctrlGroupControls,
  ctrlSelectedGroup,
  setCtrlSelectedGroup,
  ctrlSelectedControl,
  setCtrlSelectedControl,
  ctrlApplicability,
  setCtrlApplicability,
  ctrlImplStatus,
  setCtrlImplStatus,
  ctrlJustification,
  setCtrlJustification,
  ctrlImplNotes,
  setCtrlImplNotes,
  ctrlSaving,
  ctrlLoadingControls,
  onFetchGroupControls,
  onSave,
}: AssetControlDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingControl ? 'Control bearbeiten' : 'Control zuordnen'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {editingControl ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">Control-ID</label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-mono">
                {editingControl.controlId}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Gruppe</label>
                <Select
                  value={ctrlSelectedGroup}
                  onValueChange={v => {
                    setCtrlSelectedGroup(v)
                    setCtrlSelectedControl('')
                    onFetchGroupControls(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gruppe waehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ctrlGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title} {g.controlCount != null ? `(${g.controlCount})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Control *</label>
                <Select
                  value={ctrlSelectedControl}
                  onValueChange={setCtrlSelectedControl}
                  disabled={!ctrlSelectedGroup || ctrlLoadingControls}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      ctrlLoadingControls ? 'Lade...' :
                      !ctrlSelectedGroup ? 'Erst Gruppe waehlen' :
                      'Control waehlen...'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {ctrlGroupControls.map(c => (
                      <SelectItem key={c.id} value={c.controlId}>
                        {c.controlId} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Anwendbarkeit</label>
            <Select value={ctrlApplicability} onValueChange={setCtrlApplicability}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPLICABILITY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Umsetzungsstatus</label>
            <Select value={ctrlImplStatus} onValueChange={setCtrlImplStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMPL_STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Begruendung</label>
            <Textarea
              placeholder="Begruendung fuer Anwendbarkeit..."
              value={ctrlJustification}
              onChange={e => setCtrlJustification(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Umsetzungsnotizen</label>
            <Textarea
              placeholder="Details zur Umsetzung..."
              value={ctrlImplNotes}
              onChange={e => setCtrlImplNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={ctrlSaving}>
              {ctrlSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingControl ? 'Aktualisieren' : 'Zuordnen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
