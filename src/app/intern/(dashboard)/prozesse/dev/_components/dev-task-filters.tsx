import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface DevTaskFiltersProps {
  search: string
  setSearch: (value: string) => void
  processFilter: string
  setProcessFilter: (value: string) => void
  priorityFilter: string
  setPriorityFilter: (value: string) => void
  effortFilter: string
  setEffortFilter: (value: string) => void
  appStatusFilter: string
  setAppStatusFilter: (value: string) => void
  toolFilter: string
  setToolFilter: (value: string) => void
  allProcesses: Array<[string, string]>
  allTools: string[]
}

export function DevTaskFilters({
  search,
  setSearch,
  processFilter,
  setProcessFilter,
  priorityFilter,
  setPriorityFilter,
  effortFilter,
  setEffortFilter,
  appStatusFilter,
  setAppStatusFilter,
  toolFilter,
  setToolFilter,
  allProcesses,
  allTools,
}: DevTaskFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger><SelectValue placeholder="Prozess" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prozesse</SelectItem>
              {allProcesses.map(([key, name]) => (
                <SelectItem key={key} value={key}>{key} {name.replace(key + ' ', '')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue placeholder="Prioritaet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prioritaeten</SelectItem>
              <SelectItem value="hoch">Hoch</SelectItem>
              <SelectItem value="mittel">Mittel</SelectItem>
              <SelectItem value="niedrig">Niedrig</SelectItem>
            </SelectContent>
          </Select>
          <Select value={effortFilter} onValueChange={setEffortFilter}>
            <SelectTrigger><SelectValue placeholder="Aufwand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Aufwaende</SelectItem>
              <SelectItem value="S">S (klein)</SelectItem>
              <SelectItem value="M">M (mittel)</SelectItem>
              <SelectItem value="L">L (gross)</SelectItem>
              <SelectItem value="XL">XL (sehr gross)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
            <SelectTrigger><SelectValue placeholder="App-Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="none">Fehlt</SelectItem>
              <SelectItem value="partial">Teilweise</SelectItem>
              <SelectItem value="full">Vorhanden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={toolFilter} onValueChange={setToolFilter}>
            <SelectTrigger><SelectValue placeholder="Tool" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Tools</SelectItem>
              {allTools.map(tool => (
                <SelectItem key={tool} value={tool}>{tool}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
