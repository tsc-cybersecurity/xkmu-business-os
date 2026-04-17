import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

const SCHUTZBEDARF_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'hoch', label: 'Hoch' },
  { value: 'sehr_hoch', label: 'Sehr hoch' },
] as const

const SCHUTZBEDARF_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  hoch: 'bg-orange-100 text-orange-700',
  sehr_hoch: 'bg-red-100 text-red-700',
}

const SCHUTZBEDARF_LABELS: Record<string, string> = {
  normal: 'Normal',
  hoch: 'Hoch',
  sehr_hoch: 'Sehr hoch',
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv' },
  { value: 'planned', label: 'Geplant' },
  { value: 'decommissioned', label: 'Stillgelegt' },
] as const

interface AssetDetail {
  categoryName: string
  categoryType: string
}

interface AssetStammdatenTabProps {
  asset: AssetDetail
  formName: string
  setFormName: (v: string) => void
  formDescription: string
  setFormDescription: (v: string) => void
  formStatus: string
  setFormStatus: (v: string) => void
  formLocation: string
  setFormLocation: (v: string) => void
  formNotes: string
  setFormNotes: (v: string) => void
  formVertraulichkeit: string
  setFormVertraulichkeit: (v: string) => void
  formIntegritaet: string
  setFormIntegritaet: (v: string) => void
  formVerfuegbarkeit: string
  setFormVerfuegbarkeit: (v: string) => void
  formBegruendung: string
  setFormBegruendung: (v: string) => void
  saving: boolean
  onSave: () => void
  CategoryIcon: React.ElementType
}

export function AssetStammdatenTab({
  asset,
  formName,
  setFormName,
  formDescription,
  setFormDescription,
  formStatus,
  setFormStatus,
  formLocation,
  setFormLocation,
  formNotes,
  setFormNotes,
  formVertraulichkeit,
  setFormVertraulichkeit,
  formIntegritaet,
  setFormIntegritaet,
  formVerfuegbarkeit,
  setFormVerfuegbarkeit,
  formBegruendung,
  setFormBegruendung,
  saving,
  onSave,
  CategoryIcon,
}: AssetStammdatenTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Kategorie</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                {asset.categoryName} ({asset.categoryType})
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Standort</label>
              <Input
                placeholder="z.B. Serverraum, Buero Berlin..."
                value={formLocation}
                onChange={e => setFormLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Beschreibung</label>
            <Textarea
              placeholder="Optionale Beschreibung des Assets..."
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notizen</label>
            <Textarea
              placeholder="Interne Notizen..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schutzbedarf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Vertraulichkeit', value: formVertraulichkeit, setter: setFormVertraulichkeit },
              { label: 'Integritaet', value: formIntegritaet, setter: setFormIntegritaet },
              { label: 'Verfuegbarkeit', value: formVerfuegbarkeit, setter: setFormVerfuegbarkeit },
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <Select value={value} onValueChange={setter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHUTZBEDARF_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className={cn('text-xs mt-1', SCHUTZBEDARF_COLORS[value])}>
                  {SCHUTZBEDARF_LABELS[value]}
                </Badge>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Begruendung</label>
            <Textarea
              placeholder="Begruendung fuer die Schutzbedarfseinstufung..."
              value={formBegruendung}
              onChange={e => setFormBegruendung(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Speichern
        </Button>
      </div>
    </div>
  )
}
