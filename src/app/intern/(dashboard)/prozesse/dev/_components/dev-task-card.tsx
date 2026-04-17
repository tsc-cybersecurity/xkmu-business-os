import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, Wrench, CircleDot, Save, Pencil, Zap, FileCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DevRequirement {
  tool: string
  neededFunction: string
  approach: string
  effort: string
  priority: string
}

interface Step {
  nr: number | string
  action: string
  tool?: string
  hint?: string
}

interface DevTask {
  id: string
  taskKey: string
  title: string
  subprocess: string | null
  purpose: string | null
  trigger: string | null
  timeEstimate: string | null
  automationPotential: string | null
  tools: string[]
  prerequisites: string[]
  steps: Step[]
  checklist: string[]
  expectedOutput: string | null
  errorEscalation: string | null
  solution: string | null
  appStatus: string | null
  appModule: string | null
  appNotes: string | null
  devRequirements: DevRequirement[]
  processKey: string
  processName: string
}

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  S: { label: 'S (klein)', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  M: { label: 'M (mittel)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  L: { label: 'L (gross)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  XL: { label: 'XL (sehr gross)', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

const PRIORITY_COLORS: Record<string, string> = {
  hoch: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  mittel: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  niedrig: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

interface DevTaskCardProps {
  task: DevTask
  req: DevRequirement
  reqIndex: number
  isEditing: boolean
  editData: DevRequirement | null
  editTaskData: { appStatus: string; appNotes: string; appModule: string } | null
  saving: boolean
  onStartEdit: (task: DevTask, reqIndex: number, req: DevRequirement) => void
  onCancelEdit: () => void
  onSaveEdit: (task: DevTask, reqIndex: number) => void
  setEditData: React.Dispatch<React.SetStateAction<DevRequirement | null>>
  setEditTaskData: React.Dispatch<React.SetStateAction<{ appStatus: string; appNotes: string; appModule: string } | null>>
  onOpenAiDialog: (task: DevTask) => void
  onDownloadSingle: (task: DevTask, req: DevRequirement) => void
}

export function DevTaskCard({
  task,
  req,
  reqIndex,
  isEditing,
  editData,
  editTaskData,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  setEditData,
  setEditTaskData,
  onOpenAiDialog,
  onDownloadSingle,
}: DevTaskCardProps) {
  const current = isEditing && editData ? editData : req

  return (
    <Card className={cn(isEditing && 'ring-2 ring-primary')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{task.taskKey}</Badge>
              <Badge variant="secondary" className="text-xs"><Wrench className="h-3 w-3 mr-1" />{current.tool}</Badge>
              {isEditing ? (
                <>
                  <Select value={editData!.effort} onValueChange={v => setEditData({ ...editData!, effort: v })}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={editData!.priority} onValueChange={v => setEditData({ ...editData!, priority: v })}>
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoch">hoch</SelectItem>
                      <SelectItem value="mittel">mittel</SelectItem>
                      <SelectItem value="niedrig">niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Badge className={cn('text-xs', EFFORT_LABELS[current.effort]?.color || '')}>{current.effort}</Badge>
                  <Badge className={cn('text-xs', PRIORITY_COLORS[current.priority] || '')}>{current.priority}</Badge>
                </>
              )}
              {task.appStatus === 'none' && <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Fehlt</Badge>}
              {task.appStatus === 'partial' && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs"><CircleDot className="h-3 w-3 mr-1" />Teilweise</Badge>}
            </div>
            <CardTitle className="text-base">{task.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {task.processName} {task.subprocess && <>&#8250; {task.subprocess}</>}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={onCancelEdit}>Abbrechen</Button>
                <Button size="sm" onClick={() => onSaveEdit(task, reqIndex)} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Speichern
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenAiDialog(task)} title="KI-Analyse">
                  <Zap className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(task, reqIndex, req)} title="Bearbeiten">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDownloadSingle(task, req)}>
                  <FileCode className="h-3.5 w-3.5 mr-1" />.md
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {isEditing && editTaskData ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tool</label>
              <Input
                value={editData!.tool}
                onChange={e => setEditData({ ...editData!, tool: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Benoetigte Funktion</label>
              <Textarea
                value={editData!.neededFunction}
                onChange={e => setEditData({ ...editData!, neededFunction: e.target.value })}
                rows={2} className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Umsetzungsansatz</label>
              <Textarea
                value={editData!.approach}
                onChange={e => setEditData({ ...editData!, approach: e.target.value })}
                rows={5} className="text-sm"
              />
            </div>
            <div className="border-t pt-3 mt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">App-Abdeckung (gilt fuer alle Anforderungen dieser Aufgabe)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">App-Status</label>
                  <Select value={editTaskData.appStatus} onValueChange={v => setEditTaskData({ ...editTaskData, appStatus: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fehlt</SelectItem>
                      <SelectItem value="partial">Teilweise</SelectItem>
                      <SelectItem value="full">Vorhanden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">App-Modul</label>
                  <Input
                    value={editTaskData.appModule}
                    onChange={e => setEditTaskData({ ...editTaskData, appModule: e.target.value })}
                    placeholder="z.B. blog, finance, leads"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">App-Notizen (aktueller Stand)</label>
                <Textarea
                  value={editTaskData.appNotes}
                  onChange={e => setEditTaskData({ ...editTaskData, appNotes: e.target.value })}
                  rows={3} className="text-sm"
                  placeholder="Was existiert bereits, was fehlt noch?"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Benoetigte Funktion</h4>
              <p className="text-sm">{current.neededFunction}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Umsetzungsansatz</h4>
              <p className="text-sm">{current.approach}</p>
            </div>
            {task.appNotes && (
              <div className={cn('rounded-lg p-3 text-sm',
                task.appStatus === 'none' ? 'bg-red-50 dark:bg-red-950/30' :
                task.appStatus === 'partial' ? 'bg-yellow-50 dark:bg-yellow-950/30' :
                'bg-green-50 dark:bg-green-950/30'
              )}>
                <span className="font-semibold">App-Stand:</span>{' '}
                {task.appModule && <Badge variant="outline" className="text-xs mr-1">{task.appModule}</Badge>}
                {task.appNotes}
              </div>
            )}
          </div>
        )}

        {/* Prozesskontext (collapsible) */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="context" className="border-0">
            <AccordionTrigger className="hover:no-underline py-2 text-xs text-muted-foreground">
              Prozesskontext anzeigen
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                {task.purpose && (
                  <div><span className="font-semibold">Zweck:</span> <span className="text-muted-foreground">{task.purpose}</span></div>
                )}
                {task.trigger && (
                  <div><span className="font-semibold">Ausloeser:</span> <span className="text-muted-foreground">{task.trigger}</span></div>
                )}
                {Array.isArray(task.tools) && task.tools.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Tools:</span>
                    {task.tools.map((tool, ti) => <Badge key={ti} variant="secondary" className="text-xs">{tool}</Badge>)}
                  </div>
                )}
                {Array.isArray(task.steps) && task.steps.length > 0 && (
                  <div>
                    <span className="font-semibold">Schritte:</span>
                    <ol className="mt-1 space-y-0.5 text-muted-foreground ml-4 list-decimal text-xs">
                      {task.steps.map((step, si) => (
                        <li key={si}>{step.action}{step.tool && <span className="ml-1">[{step.tool}]</span>}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                  <div>
                    <span className="font-semibold">Checkliste:</span>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground ml-4 list-disc text-xs">
                      {task.checklist.map((item, ci) => <li key={ci}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {task.expectedOutput && (
                  <div><span className="font-semibold">Ergebnis:</span> <span className="text-muted-foreground">{task.expectedOutput}</span></div>
                )}
                {task.solution && (
                  <div><span className="font-semibold">KI-Ansatz:</span> <span className="text-muted-foreground">{task.solution}</span></div>
                )}
                {task.appNotes && (
                  <div className={cn('rounded p-2', task.appStatus === 'none' ? 'bg-red-50 dark:bg-red-950/30' : task.appStatus === 'partial' ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-green-50 dark:bg-green-950/30')}>
                    <span className="font-semibold">App-Stand:</span>{' '}
                    {task.appModule && <Badge variant="outline" className="text-xs mr-1">{task.appModule}</Badge>}
                    <span className="text-muted-foreground">{task.appNotes}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
