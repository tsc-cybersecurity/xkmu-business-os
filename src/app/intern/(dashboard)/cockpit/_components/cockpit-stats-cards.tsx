import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Activity, Server, AlertTriangle } from 'lucide-react'

interface Stats {
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
}

interface CockpitStatsCardsProps {
  stats: Stats
}

export function CockpitStatsCards({ stats }: CockpitStatsCardsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900 p-2">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold">{stats.byStatus['active'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900 p-2">
                <Server className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inaktiv</p>
                <p className="text-2xl font-bold">{stats.byStatus['inactive'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wartung</p>
                <p className="text-2xl font-bold">{stats.byStatus['maintenance'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(stats.byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <Badge key={cat} variant="secondary" className="text-sm">
              {cat}: {count}
            </Badge>
          ))}
        </div>
      )}
    </>
  )
}
