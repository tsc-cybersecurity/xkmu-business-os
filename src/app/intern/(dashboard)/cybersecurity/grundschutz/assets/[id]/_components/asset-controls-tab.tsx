import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Shield, Plus, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ControlMapping {
  id: string
  controlId: string
  applicability: string
  justification: string | null
  implementationStatus: string
  implementationNotes: string | null
}

const APPLICABILITY_COLORS: Record<string, string> = {
  applicable: 'bg-green-100 text-green-700',
  not_applicable: 'bg-gray-100 text-gray-500',
}

const IMPL_STATUS_OPTIONS = [
  { value: 'offen', label: 'Offen' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'teilweise', label: 'Teilweise' },
  { value: 'umgesetzt', label: 'Umgesetzt' },
  { value: 'nicht_umgesetzt', label: 'Nicht umgesetzt' },
] as const

const IMPL_STATUS_COLORS: Record<string, string> = {
  offen: 'bg-gray-100 text-gray-600',
  geplant: 'bg-blue-100 text-blue-700',
  teilweise: 'bg-orange-100 text-orange-700',
  umgesetzt: 'bg-green-100 text-green-700',
  nicht_umgesetzt: 'bg-red-100 text-red-700',
}

interface AssetControlsTabProps {
  controlMappings: ControlMapping[]
  onOpenControlDialog: (mapping?: ControlMapping) => void
}

export function AssetControlsTab({ controlMappings, onOpenControlDialog }: AssetControlsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Zugeordnete Controls</CardTitle>
        <Button size="sm" onClick={() => onOpenControlDialog()}>
          <Plus className="h-4 w-4 mr-1" /> Control zuordnen
        </Button>
      </CardHeader>
      <CardContent>
        {controlMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Shield className="h-10 w-10 opacity-30" />
            <p className="text-sm">Noch keine Controls zugeordnet</p>
            <Button variant="outline" size="sm" onClick={() => onOpenControlDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Control zuordnen
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control-ID</TableHead>
                <TableHead>Anwendbarkeit</TableHead>
                <TableHead>Umsetzungsstatus</TableHead>
                <TableHead>Notizen</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controlMappings.map(cm => (
                <TableRow key={cm.id}>
                  <TableCell className="font-mono text-sm font-medium">{cm.controlId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', APPLICABILITY_COLORS[cm.applicability])}>
                      {cm.applicability === 'applicable' ? 'Anwendbar' : 'Nicht anwendbar'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', IMPL_STATUS_COLORS[cm.implementationStatus])}>
                      {IMPL_STATUS_OPTIONS.find(o => o.value === cm.implementationStatus)?.label ?? cm.implementationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                    {cm.implementationNotes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Bearbeiten" onClick={() => onOpenControlDialog(cm)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
