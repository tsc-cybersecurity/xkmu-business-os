import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, ExternalLink, KeyRound, Monitor } from 'lucide-react'

interface CockpitSystem {
  id: string
  name: string
  hostname: string | null
  url: string | null
  category: string | null
  function: string | null
  description: string | null
  ipAddress: string | null
  port: number | null
  protocol: string | null
  status: string | null
  tags: string[] | null
  notes: string | null
  credentialCount: number
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  inactive: { label: 'Inaktiv', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  maintenance: { label: 'Wartung', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
}

interface CockpitSystemsTableProps {
  systems: CockpitSystem[]
  onEdit: (system: CockpitSystem) => void
  onDelete: (id: string) => void
  onOpenCreate: () => void
  getConnectionString: (system: CockpitSystem) => string | null
}

export function CockpitSystemsTable({
  systems,
  onEdit,
  onDelete,
  onOpenCreate,
  getConnectionString,
}: CockpitSystemsTableProps) {
  if (systems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Keine Systeme vorhanden</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Erfassen Sie Ihre IT-Systeme und Infrastruktur.
          </p>
          <Button onClick={onOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Erstes System hinzufuegen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hostname / URL</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Funktion</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Zugaenge</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.map((system) => {
              const connStr = getConnectionString(system)
              const statusConf = statusConfig[system.status || 'active'] || statusConfig.active

              return (
                <TableRow key={system.id}>
                  <TableCell>
                    <button
                      className="font-medium text-left hover:text-primary transition-colors"
                      onClick={() => onEdit(system)}
                    >
                      {system.name}
                    </button>
                    {system.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                        {system.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {connStr && (
                        <a
                          href={connStr.startsWith('http') ? connStr : `https://${connStr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {system.hostname || system.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {system.ipAddress && (
                        <span className="text-xs text-muted-foreground">
                          {system.ipAddress}
                          {system.port ? `:${system.port}` : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {system.category && (
                      <Badge variant="outline">{system.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{system.function || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConf.color}>
                      {statusConf.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {system.credentialCount > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <KeyRound className="h-3 w-3" />
                        {system.credentialCount} {system.credentialCount === 1 ? 'Zugang' : 'Zugaenge'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(system)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(system.id)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
