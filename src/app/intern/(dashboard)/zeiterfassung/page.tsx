'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Play, Square, Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface TimeEntry {
  id: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  billable: boolean
  hourlyRate: string | null
  companyId: string | null
  companyName: string | null
}

interface Company { id: string; name: string }

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function ZeiterfassungPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // New entry form
  const [desc, setDesc] = useState('')
  const [companyId, setCompanyId] = useState<string>('none')
  const [manualMinutes, setManualMinutes] = useState('')

  const fetchData = useCallback(async () => {
    const [entriesRes, companiesRes, timerRes] = await Promise.all([
      fetch('/api/v1/time-entries?limit=50'),
      fetch('/api/v1/companies?limit=200'),
      fetch('/api/v1/time-entries/timer'),
    ])
    const [entriesData, companiesData, timerData] = await Promise.all([
      entriesRes.json(), companiesRes.json(), timerRes.json(),
    ])
    if (entriesData.success) setEntries(entriesData.data)
    if (companiesData.success) setCompanies(companiesData.data)
    if (timerData.success) setRunningTimer(timerData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Elapsed time ticker
  useEffect(() => {
    if (!runningTimer?.startTime) return
    const update = () => {
      const start = new Date(runningTimer.startTime!).getTime()
      setElapsed(Math.floor((Date.now() - start) / 60000))
    }
    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [runningTimer])

  const startTimer = async () => {
    const response = await fetch('/api/v1/time-entries/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', description: desc || undefined, companyId: companyId !== 'none' ? companyId : undefined }),
    })
    const data = await response.json()
    if (data.success) {
      setRunningTimer(data.data)
      setDesc('')
      toast.success('Timer gestartet')
    }
  }

  const stopTimer = async () => {
    const response = await fetch('/api/v1/time-entries/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    const data = await response.json()
    if (data.success) {
      setRunningTimer(null)
      setElapsed(0)
      fetchData()
      toast.success(`Timer gestoppt: ${formatDuration(data.data.durationMinutes)}`)
    }
  }

  const addManual = async () => {
    const minutes = parseInt(manualMinutes)
    if (!minutes || minutes <= 0) return
    const response = await fetch('/api/v1/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: desc || undefined,
        companyId: companyId !== 'none' ? companyId : undefined,
        date: new Date().toISOString(),
        durationMinutes: minutes,
      }),
    })
    const data = await response.json()
    if (data.success) {
      setDesc('')
      setManualMinutes('')
      fetchData()
      toast.success('Zeiteintrag erstellt')
    }
  }

  const deleteEntry = async (id: string) => {
    await fetch(`/api/v1/time-entries/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const todayMinutes = entries
    .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="h-8 w-8" />
          Zeiterfassung
        </h1>
        <p className="text-muted-foreground mt-1">Arbeitszeit erfassen und verwalten</p>
      </div>

      {/* Timer + Quick Add */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Timer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runningTimer ? (
              <div className="flex items-center gap-3">
                <div className="text-3xl font-mono font-bold text-green-600">{formatDuration(elapsed)}</div>
                <div className="flex-1 text-sm text-muted-foreground truncate">
                  {runningTimer.description || 'Ohne Beschreibung'}
                </div>
                <Button variant="destructive" size="sm" onClick={stopTimer}>
                  <Square className="h-4 w-4 mr-1" />Stop
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Beschreibung..." value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex gap-2">
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Firma (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine Firma</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={startTimer}>
                    <Play className="h-4 w-4 mr-1" />Start
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Add + Today Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Manueller Eintrag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Minuten" type="number" value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} className="w-24" />
              <Button variant="outline" onClick={addManual} disabled={!manualMinutes}>
                <Plus className="h-4 w-4 mr-1" />Hinzufuegen
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Heute: <span className="font-bold text-foreground">{formatDuration(todayMinutes)}</span> erfasst
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Ende</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Abrechenbar</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Noch keine Zeiteintraege
                </TableCell>
              </TableRow>
            ) : entries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm">{new Date(entry.date).toLocaleDateString('de-DE')}</TableCell>
                <TableCell className="text-sm">{entry.description || '—'}</TableCell>
                <TableCell className="text-sm">{entry.companyName || '—'}</TableCell>
                <TableCell className="text-sm">{formatTime(entry.startTime)}</TableCell>
                <TableCell className="text-sm">{formatTime(entry.endTime)}</TableCell>
                <TableCell className="font-mono text-sm font-medium">{formatDuration(entry.durationMinutes)}</TableCell>
                <TableCell>{entry.billable ? <Badge className="text-xs bg-green-100 text-green-800">Ja</Badge> : <Badge variant="secondary" className="text-xs">Nein</Badge>}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
