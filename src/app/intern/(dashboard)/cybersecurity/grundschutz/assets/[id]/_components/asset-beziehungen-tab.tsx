import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Shield, ArrowRight, ArrowLeft as ArrowLeftIcon, FolderOpen, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssetRelation {
  id: string
  direction: 'outgoing' | 'incoming'
  relationType: string
  otherAssetId: string
  otherAssetName: string | null
  otherAssetCategory: string | null
  otherAssetCategoryName: string | null
  notes: string | null
}

const RELATION_TYPE_LABELS: Record<string, string> = {
  supports: 'Unterstuetzt',
  runs_on: 'Laeuft auf',
  connected_to: 'Verbunden mit',
  housed_in: 'Untergebracht in',
  uses: 'Nutzt',
  managed_by: 'Verwaltet von',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'IT-Systeme': FolderOpen,
  'Anwendungen': FolderOpen,
  'Netze': FolderOpen,
  'Standorte': FolderOpen,
  'Nutzende': FolderOpen,
  'Einkaeufe': FolderOpen,
  'Informationen': FolderOpen,
}

interface AssetBeziehungenTabProps {
  relations: AssetRelation[]
}

export function AssetBeziehungenTab({ relations }: AssetBeziehungenTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beziehungen zu anderen Assets</CardTitle>
      </CardHeader>
      <CardContent>
        {relations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Shield className="h-10 w-10 opacity-30" />
            <p className="text-sm">Keine Beziehungen vorhanden</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Richtung</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Beziehungstyp</TableHead>
                <TableHead>Notizen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relations.map(rel => {
                const RelIcon = rel.otherAssetCategory
                  ? CATEGORY_ICONS[rel.otherAssetCategory] ?? FolderOpen
                  : FolderOpen
                return (
                  <TableRow key={rel.id}>
                    <TableCell>
                      {rel.direction === 'outgoing' ? (
                        <ArrowRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowLeftIcon className="h-4 w-4 text-orange-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/intern/cybersecurity/grundschutz/assets/${rel.otherAssetId}`}
                        className="hover:underline text-primary"
                      >
                        {rel.otherAssetName || rel.otherAssetId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <RelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{rel.otherAssetCategoryName || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {RELATION_TYPE_LABELS[rel.relationType] ?? rel.relationType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {rel.notes || '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center gap-2 mt-4 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          <span>Beziehungen werden in einer kuenftigen Version bearbeitbar.</span>
        </div>
      </CardContent>
    </Card>
  )
}
