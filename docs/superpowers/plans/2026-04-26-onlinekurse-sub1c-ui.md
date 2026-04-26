# Onlinekurse Sub-Projekt 1c — Intern-UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Voraussetzung:** Pakete 1a + 1b sind durch (Schema, Services, alle API-Routen, alle Tests grün).

**Goal:** Vollständige Intern-UI unter `/intern/(dashboard)/elearning`: Liste, Anlegen, Edit (Stammdaten + Inhalt-Tree mit Drag-Drop + Vorschau), dedizierte Lektion-Editor-Seite (Inhalt/Video/Anhänge), Publish-Validation-Dialog.

**Codebase-Patterns:**
- `'use client'` Pages mit `useState`/`useEffect`, Server-Roundtrips via `fetch('/api/v1/...')`
- shadcn/ui-Komponenten aus `@/components/ui/{button,badge,table,tabs,dialog,input,textarea,select}`
- Lucide-Icons
- `logger` aus `@/lib/utils/logger`
- @dnd-kit (bereits im Projekt — bestehende Workflow-UI nutzt es)
- Markdown-Rendering: `react-markdown` falls schon installiert, sonst Plan-Schritt 4 in Task 19

**UI-Tests:** in dieser Codebase nicht standardisiert für Pages — Verifikation via manuellem UAT (Schritte am Ende von Task 23). API-Tests aus Paket 1b decken Verhalten ab.

**Module-Bezeichnung im linken Sidebar-Nav:** „Onlinekurse" (deutscher Konsumenten-Name; Dateipfad bleibt `elearning`).

---

## Task 16: Sidebar-Eintrag + Kursliste + „Neuer Kurs"-Form

**Files:**
- Modify: Bestehender Dashboard-Nav-Komponent (z. B. `src/components/layout/sidebar.tsx` oder `src/app/intern/(dashboard)/_components/Sidebar.tsx` — den vorhandenen suchen via `grep -r "Blog" src/components src/app/intern/(dashboard)/_components`)
- Create: `src/app/intern/(dashboard)/elearning/page.tsx`
- Create: `src/app/intern/(dashboard)/elearning/new/page.tsx`
- Create: `src/app/intern/(dashboard)/elearning/_components/CourseList.tsx`
- Create: `src/app/intern/(dashboard)/elearning/_components/CourseStammdatenForm.tsx`

- [ ] **Step 1: Nav-Eintrag ergänzen**

Im bestehenden Sidebar-Nav-Komponenten den Eintrag „Onlinekurse" (Icon `GraduationCap` aus lucide) einfügen, am sinnvollen Platz (z. B. zwischen „Wiba" und „CMS-Hub" oder bei Wissens-Themen). Ziel-Route: `/intern/elearning`.

- [ ] **Step 2: Liste implementieren**

Datei `src/app/intern/(dashboard)/elearning/page.tsx`:

```tsx
import { CourseList } from './_components/CourseList'

export default function CoursesPage() {
  return <CourseList />
}
```

Datei `src/app/intern/(dashboard)/elearning/_components/CourseList.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GraduationCap, Plus, Loader2, Pencil } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Course {
  id: string; title: string; slug: string; status: string; visibility: string
  updatedAt: string
}

const statusVariant: Record<string, 'default'|'secondary'|'outline'> = {
  draft: 'secondary', published: 'default', archived: 'outline',
}

export function CourseList() {
  const [items, setItems] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [visibility, setVisibility] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (visibility) params.set('visibility', visibility)
      const res = await fetch(`/api/v1/courses?${params.toString()}`)
      const body = await res.json()
      if (body.success) setItems(body.data)
    } catch (err) {
      logger.error('CourseList load failed', err, { module: 'CourseList' })
    } finally { setLoading(false) }
  }, [q, status, visibility])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <GraduationCap className="h-6 w-6" /> Onlinekurse
        </h1>
        <Button asChild>
          <Link href="/intern/elearning/new"><Plus className="mr-2 h-4 w-4" />Neuer Kurs</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Suche…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Visibility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="both">Beides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Geändert</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.title}</TableCell>
                <TableCell><Badge variant={statusVariant[c.status] ?? 'secondary'}>{c.status}</Badge></TableCell>
                <TableCell>{c.visibility}</TableCell>
                <TableCell>{new Date(c.updatedAt).toLocaleString('de-DE')}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/intern/elearning/${c.id}`}><Pencil className="h-4 w-4" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Keine Kurse</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: „Neuer Kurs"-Form implementieren**

Datei `src/app/intern/(dashboard)/elearning/new/page.tsx`:

```tsx
import { CourseStammdatenForm } from '../_components/CourseStammdatenForm'

export default function NewCoursePage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Neuer Kurs</h1>
      <CourseStammdatenForm mode="create" />
    </div>
  )
}
```

Datei `src/app/intern/(dashboard)/elearning/_components/CourseStammdatenForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Initial {
  id?: string
  title?: string; slug?: string; subtitle?: string | null; description?: string | null
  visibility?: string; useModules?: boolean; enforceSequential?: boolean
  estimatedMinutes?: number | null; coverImageId?: string | null
}

export function CourseStammdatenForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: Initial }) {
  const router = useRouter()
  const [data, setData] = useState<Initial>(initial ?? { title: '', visibility: 'portal' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setErr(null)
    try {
      const url = mode === 'create' ? '/api/v1/courses' : `/api/v1/courses/${initial?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!body.success) {
        setErr(body.error?.message ?? 'Fehler')
        return
      }
      if (mode === 'create') router.push(`/intern/elearning/${body.data.id}`)
      else router.refresh()
    } catch (e) {
      logger.error('Course save failed', e, { module: 'CourseStammdatenForm' })
      setErr('Speichern fehlgeschlagen')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label>Titel *</Label>
        <Input value={data.title ?? ''} onChange={e => setData({ ...data, title: e.target.value })} />
      </div>
      <div>
        <Label>Slug (optional, sonst aus Titel)</Label>
        <Input value={data.slug ?? ''} onChange={e => setData({ ...data, slug: e.target.value })} />
      </div>
      <div>
        <Label>Untertitel</Label>
        <Input value={data.subtitle ?? ''} onChange={e => setData({ ...data, subtitle: e.target.value })} />
      </div>
      <div>
        <Label>Beschreibung (Markdown)</Label>
        <Textarea value={data.description ?? ''} rows={4} onChange={e => setData({ ...data, description: e.target.value })} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Sichtbarkeit</Label>
          <Select value={data.visibility ?? 'portal'} onValueChange={v => setData({ ...data, visibility: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
              <SelectItem value="both">Beides</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Geschätzte Dauer (Minuten)</Label>
          <Input type="number" value={data.estimatedMinutes ?? ''} onChange={e => setData({ ...data, estimatedMinutes: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Module verwenden</Label>
        <Switch checked={!!data.useModules} onCheckedChange={v => setData({ ...data, useModules: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Lektionen sequenziell erzwingen</Label>
        <Switch checked={!!data.enforceSequential} onCheckedChange={v => setData({ ...data, enforceSequential: v })} />
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !data.title}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Anlegen' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Manuell prüfen**

Run: `npm run dev`
Öffne: `http://localhost:3000/intern/elearning` — Liste lädt (leer ok), CTA „Neuer Kurs" sichtbar.
Klick „Neuer Kurs", Titel eingeben, Anlegen → Redirect auf `/intern/elearning/[id]` (Seite existiert noch nicht → 404 erwartet, kommt in Task 17).

- [ ] **Step 5: Commit**

```bash
git add src/app/intern/(dashboard)/elearning src/components/layout
git commit -m "feat(elearning): course list + new form + sidebar nav"
```

---

## Task 17: Kurs-Edit-Seite (Tabs-Gerüst + Stammdaten-Tab)

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/page.tsx`
- Create: `src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx`

- [ ] **Step 1: Page implementieren**

Datei `src/app/intern/(dashboard)/elearning/[id]/page.tsx`:

```tsx
import { CourseEditView } from './_components/CourseEditView'

interface Props { params: Promise<{ id: string }> }

export default async function CourseEditPage({ params }: Props) {
  const { id } = await params
  return <CourseEditView courseId={id} />
}
```

Datei `src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { CourseStammdatenForm } from '../../_components/CourseStammdatenForm'

interface Course {
  id: string; title: string; slug: string; subtitle: string | null; description: string | null
  status: string; visibility: string; useModules: boolean; enforceSequential: boolean
  estimatedMinutes: number | null; coverImageId: string | null
  modules: Array<{ id: string; title: string; position: number }>
  lessons: Array<{ id: string; title: string; slug: string; position: number; moduleId: string | null }>
}

const statusVariant: Record<string, 'default'|'secondary'|'outline'> = {
  draft: 'secondary', published: 'default', archived: 'outline',
}

export function CourseEditView({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/v1/courses/${courseId}`)
    const body = await res.json()
    if (body.success) setCourse(body.data)
    setLoading(false)
  }, [courseId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!course) return <div className="p-6">Kurs nicht gefunden</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge variant={statusVariant[course.status]}>{course.status}</Badge>
            <Badge variant="outline">{course.visibility}</Badge>
          </div>
        </div>
        {/* Publish-Button kommt in Task 22 */}
      </div>

      <Tabs defaultValue="stammdaten">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="inhalt">Inhalt</TabsTrigger>
          <TabsTrigger value="vorschau">Vorschau</TabsTrigger>
        </TabsList>
        <TabsContent value="stammdaten" className="mt-6">
          <CourseStammdatenForm mode="edit" initial={course} />
        </TabsContent>
        <TabsContent value="inhalt" className="mt-6">
          {/* Content-Tree kommt in Task 18 */}
          <p className="text-muted-foreground">Tree kommt in Task 18.</p>
        </TabsContent>
        <TabsContent value="vorschau" className="mt-6">
          {/* Vorschau kommt in Task 23 */}
          <p className="text-muted-foreground">Vorschau kommt in Task 23.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Manuell prüfen**

Run: `npm run dev`
Öffne den frisch angelegten Kurs aus Task 16. Erwartet: Tabs sichtbar, Stammdaten-Tab zeigt Form mit befülltem Titel, Speichern aktualisiert. Andere Tabs zeigen Platzhaltertext.

- [ ] **Step 3: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]
git commit -m "feat(elearning): course edit page with tabs + stammdaten"
```

---

## Task 18: Inhalt-Tab — Content-Tree mit @dnd-kit

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/_components/CourseContentTree.tsx`
- Modify: `src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx` (Tab-Inhalt)

- [ ] **Step 1: Tree-Komponente implementieren**

Datei `src/app/intern/(dashboard)/elearning/[id]/_components/CourseContentTree.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GripVertical, Plus, Trash2, FolderOpen } from 'lucide-react'

export interface Module { id: string; title: string; position: number }
export interface Lesson { id: string; title: string; slug: string; position: number; moduleId: string | null }

interface Props {
  courseId: string
  useModules: boolean
  modules: Module[]
  lessons: Lesson[]
  onChange: () => void
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         className="flex items-center gap-2 border rounded p-2 bg-background">
      <button {...attributes} {...listeners} className="cursor-grab"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function CourseContentTree({ courseId, useModules, modules, lessons, onChange }: Props) {
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null)

  async function addModule() {
    if (!newModuleTitle) return
    await fetch(`/api/v1/courses/${courseId}/modules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newModuleTitle }),
    })
    setNewModuleTitle('')
    onChange()
  }

  async function addLesson() {
    if (!newLessonTitle) return
    await fetch(`/api/v1/courses/${courseId}/lessons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newLessonTitle, moduleId: newLessonModuleId }),
    })
    setNewLessonTitle('')
    onChange()
  }

  async function deleteLesson(id: string) {
    if (!confirm('Lektion löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/lessons/${id}`, { method: 'DELETE' })
    onChange()
  }

  async function deleteModule(id: string) {
    if (!confirm('Modul löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/modules/${id}`, { method: 'DELETE' })
    onChange()
  }

  async function reorderLessons(reordered: Lesson[]) {
    await fetch(`/api/v1/courses/${courseId}/lessons/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((l, i) => ({ id: l.id, position: i + 1, moduleId: l.moduleId }))),
    })
    onChange()
  }

  async function reorderModules(reordered: Module[]) {
    await fetch(`/api/v1/courses/${courseId}/modules/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((m, i) => ({ id: m.id, position: i + 1 }))),
    })
    onChange()
  }

  function handleLessonDragEnd(event: DragEndEvent, scopeLessons: Lesson[]) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = scopeLessons.findIndex(l => l.id === active.id)
    const newIdx = scopeLessons.findIndex(l => l.id === over.id)
    void reorderLessons(arrayMove(scopeLessons, oldIdx, newIdx))
  }

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = modules.findIndex(m => m.id === active.id)
    const newIdx = modules.findIndex(m => m.id === over.id)
    void reorderModules(arrayMove(modules, oldIdx, newIdx))
  }

  if (!useModules) {
    return (
      <div className="space-y-4">
        <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(e, lessons)}>
          <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {lessons.map(l => (
                <SortableRow key={l.id} id={l.id}>
                  <div className="flex items-center justify-between">
                    <Link href={`/intern/elearning/${courseId}/lektionen/${l.id}`} className="hover:underline">📄 {l.title}</Link>
                    <div className="flex gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/intern/elearning/${courseId}/lektionen/${l.id}`}>Bearbeiten →</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteLesson(l.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2 mt-4">
          <Input placeholder="Neue Lektion …" value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} />
          <Button onClick={addLesson}><Plus className="h-4 w-4 mr-1" />Hinzufügen</Button>
        </div>
      </div>
    )
  }

  // useModules = true
  return (
    <div className="space-y-6">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {modules.map(m => {
              const moduleLessons = lessons.filter(l => l.moduleId === m.id).sort((a, b) => a.position - b.position)
              return (
                <SortableRow key={m.id} id={m.id}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2"><FolderOpen className="h-4 w-4" />{m.title}</span>
                      <Button size="sm" variant="ghost" onClick={() => deleteModule(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <DndContext collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(e, moduleLessons)}>
                      <SortableContext items={moduleLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                        <div className="ml-6 space-y-1">
                          {moduleLessons.map(l => (
                            <SortableRow key={l.id} id={l.id}>
                              <div className="flex items-center justify-between text-sm">
                                <Link href={`/intern/elearning/${courseId}/lektionen/${l.id}`} className="hover:underline">📄 {l.title}</Link>
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={`/intern/elearning/${courseId}/lektionen/${l.id}`}>Bearbeiten →</Link>
                                </Button>
                              </div>
                            </SortableRow>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </SortableRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input placeholder="Neues Modul …" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} />
        <Button onClick={addModule}><Plus className="h-4 w-4 mr-1" />Modul</Button>
      </div>

      <div className="flex gap-2">
        <select value={newLessonModuleId ?? ''} onChange={e => setNewLessonModuleId(e.target.value || null)}
                className="border rounded px-2 py-1 text-sm">
          <option value="">— Modul wählen —</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <Input placeholder="Neue Lektion …" value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} />
        <Button onClick={addLesson} disabled={!newLessonModuleId}><Plus className="h-4 w-4 mr-1" />Lektion</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: In `CourseEditView.tsx` einbinden**

Im `TabsContent value="inhalt"` den Platzhalter ersetzen:

```tsx
<TabsContent value="inhalt" className="mt-6">
  <CourseContentTree
    courseId={course.id}
    useModules={course.useModules}
    modules={course.modules}
    lessons={course.lessons}
    onChange={load}
  />
</TabsContent>
```

Plus Import: `import { CourseContentTree } from './CourseContentTree'`

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Im neuen Kurs Tab „Inhalt" öffnen. Test mit `useModules=false`:
- Lektion anlegen, dann zweite Lektion → beide sichtbar
- Drag-Drop tauscht Reihenfolge → Refresh → bleibt
- Löschen entfernt

Stammdaten-Tab → useModules toggeln → Inhalt-Tab → Modul anlegen, Lektion zuordnen, Drag-Drop sowohl Module als auch Lektionen innerhalb Modul.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/_components/CourseContentTree.tsx src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx
git commit -m "feat(elearning): content tree with dnd-kit reorder"
```

---

## Task 19: Lektion-Editor-Seite (Tabs-Gerüst + Inhalt-Tab Markdown)

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/page.tsx`
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonEditView.tsx`
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonContentForm.tsx`

- [ ] **Step 1: Markdown-Editor-Wahl**

Wähle: `react-markdown` für Preview-Rendering (render-only). Edit ist plain `<Textarea>` mit Live-Preview rechts.

```bash
npm install react-markdown remark-gfm
```

- [ ] **Step 2: Lesson-Edit-Page implementieren**

Datei `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/page.tsx`:

```tsx
import { LessonEditView } from './_components/LessonEditView'

interface Props { params: Promise<{ id: string; lessonId: string }> }

export default async function LessonEditPage({ params }: Props) {
  const { id, lessonId } = await params
  return <LessonEditView courseId={id} lessonId={lessonId} />
}
```

Datei `.../_components/LessonEditView.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { LessonContentForm } from './LessonContentForm'

interface Lesson {
  id: string; courseId: string; title: string; slug: string; moduleId: string | null
  contentMarkdown: string | null
  videoAssetId: string | null; videoExternalUrl: string | null
  durationMinutes: number | null
  assets: Array<{ id: string; kind: string; originalName: string; label: string | null; sizeBytes: number; path: string }>
}

export function LessonEditView({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
    const body = await res.json()
    if (body.success) setLesson(body.data)
    setLoading(false)
  }, [courseId, lessonId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!lesson) return <div className="p-6">Lektion nicht gefunden</div>

  return (
    <div className="space-y-6 p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/intern/elearning/${courseId}`}><ChevronLeft className="mr-1 h-4 w-4" />Zurück zum Kurs</Link>
      </Button>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>

      <Tabs defaultValue="inhalt">
        <TabsList>
          <TabsTrigger value="inhalt">Inhalt</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="anhaenge">Anhänge</TabsTrigger>
        </TabsList>
        <TabsContent value="inhalt" className="mt-6">
          <LessonContentForm lesson={lesson} onSaved={load} />
        </TabsContent>
        <TabsContent value="video" className="mt-6">
          {/* VideoUploader kommt in Task 20 */}
          <p className="text-muted-foreground">Video-Tab kommt in Task 20.</p>
        </TabsContent>
        <TabsContent value="anhaenge" className="mt-6">
          {/* AttachmentList kommt in Task 21 */}
          <p className="text-muted-foreground">Anhänge-Tab kommt in Task 21.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

Datei `.../_components/LessonContentForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Lesson {
  id: string; courseId: string; title: string; slug: string
  contentMarkdown: string | null; durationMinutes: number | null
}

export function LessonContentForm({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(lesson.title)
  const [slug, setSlug] = useState(lesson.slug)
  const [markdown, setMarkdown] = useState(lesson.contentMarkdown ?? '')
  const [duration, setDuration] = useState(lesson.durationMinutes ?? 0)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, contentMarkdown: markdown, durationMinutes: duration || null }),
      })
      const body = await res.json()
      if (body.success) { onSaved(); router.refresh() }
    } catch (e) {
      logger.error('Lesson save failed', e, { module: 'LessonContentForm' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Titel</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Geschätzte Dauer (Minuten)</Label>
        <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="max-w-xs" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Markdown</Label>
          <Textarea value={markdown} onChange={e => setMarkdown(e.target.value)} rows={20} className="font-mono text-sm" />
        </div>
        <div>
          <Label>Vorschau</Label>
          <div className="prose prose-sm border rounded p-4 min-h-[400px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || '*Leer*'}</ReactMarkdown>
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Speichern
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Im Kurs aus vorigem Task auf Lektion → Edit-Seite öffnet sich. Markdown eingeben → Vorschau aktualisiert live. Speichern → 200, persistiert nach Reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/lektionen package.json package-lock.json
git commit -m "feat(elearning): lesson editor — content tab with markdown preview"
```

---

## Task 20: Lektion-Editor — Video-Tab

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonVideoUploader.tsx`
- Modify: `LessonEditView.tsx` (Tab-Inhalt)

- [ ] **Step 1: Video-Uploader implementieren**

Datei `.../_components/LessonVideoUploader.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Lesson {
  id: string; courseId: string
  videoAssetId: string | null; videoExternalUrl: string | null
  assets: Array<{ id: string; kind: string; originalName: string; sizeBytes: number; path: string }>
}

export function LessonVideoUploader({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState(lesson.videoExternalUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  const videoAsset = lesson.assets.find(a => a.id === lesson.videoAssetId)

  async function upload() {
    if (!file) return
    setBusy(true); setErr(null); setProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'video')
      fd.append('lessonId', lesson.id)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/v1/courses/${lesson.courseId}/assets`)
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
      const result: { success: boolean; data?: { id: string }; error?: { message: string } } = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(JSON.parse(xhr.responseText))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(fd)
      })
      if (!result.success || !result.data) {
        setErr(result.error?.message ?? 'Upload fehlgeschlagen')
        return
      }
      // Lektion mit videoAssetId verknüpfen
      await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoAssetId: result.data.id }),
      })
      onSaved()
    } catch (e) {
      logger.error('Video upload failed', e, { module: 'LessonVideoUploader' })
      setErr('Upload fehlgeschlagen')
    } finally { setBusy(false); setFile(null) }
  }

  async function removeVideo() {
    if (!lesson.videoAssetId || !confirm('Video entfernen?')) return
    await fetch(`/api/v1/courses/${lesson.courseId}/assets/${lesson.videoAssetId}`, { method: 'DELETE' })
    await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoAssetId: null }),
    })
    onSaved()
  }

  async function saveExternalUrl() {
    setBusy(true)
    await fetch(`/api/v1/courses/${lesson.courseId}/lessons/${lesson.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoExternalUrl: externalUrl || null }),
    })
    onSaved()
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-2">Video-Upload</h2>
        {videoAsset && (
          <div className="mb-4 space-y-2">
            <video controls className="w-full max-w-2xl rounded border"
                   src={`/api/v1/courses/assets/serve/${videoAsset.path}`} />
            <div className="text-sm text-muted-foreground">
              {videoAsset.originalName} · {(videoAsset.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </div>
            <Button variant="outline" size="sm" onClick={removeVideo}><Trash2 className="h-4 w-4 mr-1" />Video entfernen</Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input type="file" accept="video/mp4,video/webm,video/quicktime"
                 onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={upload} disabled={!file || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload
          </Button>
        </div>
        {busy && progress > 0 && (
          <div className="mt-2 h-2 bg-muted rounded">
            <div className="h-2 bg-primary rounded" style={{ width: `${progress}%` }} />
          </div>
        )}
        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Alternative: externe URL (z. B. YouTube unlisted)</h2>
        <div className="flex gap-2 max-w-xl">
          <Input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." />
          <Button onClick={saveExternalUrl} disabled={busy} variant="outline">Speichern</Button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: In `LessonEditView.tsx` einbinden**

Tab-Inhalt ersetzen:

```tsx
<TabsContent value="video" className="mt-6">
  <LessonVideoUploader lesson={lesson} onSaved={load} />
</TabsContent>
```

Plus `import { LessonVideoUploader } from './LessonVideoUploader'`

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Lektion-Edit → Video-Tab → kleine .mp4 hochladen → Progress sichtbar, nach Upload Player erscheint und spielt ab. Klick im Player vor → Range-Request, Video seekt korrekt. Externe URL eingeben + Speichern → Wert persistiert.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/lektionen
git commit -m "feat(elearning): lesson video upload + player"
```

---

## Task 21: Lektion-Editor — Anhänge-Tab

**Files:**
- Create: `.../_components/LessonAttachmentList.tsx`
- Modify: `LessonEditView.tsx`

- [ ] **Step 1: Komponente implementieren**

Datei `.../_components/LessonAttachmentList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Upload, Download } from 'lucide-react'

interface Asset { id: string; kind: string; originalName: string; sizeBytes: number; path: string; label: string | null }
interface Lesson { id: string; courseId: string; assets: Asset[] }

export function LessonAttachmentList({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const docs = lesson.assets.filter(a => a.kind === 'document')

  async function upload() {
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'document')
      fd.append('lessonId', lesson.id)
      if (label) fd.append('label', label)
      const res = await fetch(`/api/v1/courses/${lesson.courseId}/assets`, { method: 'POST', body: fd })
      const body = await res.json()
      if (!body.success) { setErr(body.error?.message ?? 'Upload fehlgeschlagen'); return }
      setFile(null); setLabel(''); onSaved()
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Datei entfernen?')) return
    await fetch(`/api/v1/courses/${lesson.courseId}/assets/${id}`, { method: 'DELETE' })
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {docs.map(a => (
          <div key={a.id} className="flex items-center justify-between border rounded p-2">
            <div>
              <div className="font-medium">{a.label ?? a.originalName}</div>
              <div className="text-xs text-muted-foreground">{a.originalName} · {(a.sizeBytes / 1024).toFixed(0)} KB</div>
            </div>
            <div className="flex gap-1">
              <Button asChild size="sm" variant="ghost">
                <a href={`/api/v1/courses/assets/serve/${a.path}`} download={a.originalName}><Download className="h-4 w-4" /></a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {docs.length === 0 && <div className="text-sm text-muted-foreground">Keine Anhänge</div>}
      </div>

      <div className="border-t pt-4 space-y-2 max-w-xl">
        <Input placeholder="Anzeigename (optional)" value={label} onChange={e => setLabel(e.target.value)} />
        <div className="flex gap-2">
          <Input type="file" accept=".pdf,.zip,.docx,.pptx,.xlsx" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={upload} disabled={!file || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload
          </Button>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: In `LessonEditView.tsx` einbinden**

```tsx
<TabsContent value="anhaenge" className="mt-6">
  <LessonAttachmentList lesson={lesson} onSaved={load} />
</TabsContent>
```

Plus Import.

- [ ] **Step 3: Manuell prüfen**

Anhänge hochladen, Download per Klick, Löschen entfernt.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/lektionen
git commit -m "feat(elearning): lesson attachments tab"
```

---

## Task 22: Publish-Button + Validation-Dialog

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/_components/PublishValidationDialog.tsx`
- Modify: `CourseEditView.tsx` (Header-Bereich + Publish-Button)

- [ ] **Step 1: Dialog implementieren**

Datei `.../_components/PublishValidationDialog.tsx`:

```tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

export interface PublishProblem { lessonId?: string; code: string; message: string }

export function PublishValidationDialog({ open, onClose, problems }: {
  open: boolean; onClose: () => void; problems: PublishProblem[]
}) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Publish nicht möglich</DialogTitle>
          <DialogDescription>Folgende Punkte müssen vor dem Veröffentlichen behoben werden:</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 mt-4">
          {problems.map((p, i) => (
            <li key={i} className="text-sm border-l-2 border-amber-400 pl-3">
              <span className="font-mono text-xs text-muted-foreground">{p.code}</span><br />
              {p.message}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Header in `CourseEditView.tsx` erweitern**

Im Header-Block des `CourseEditView.tsx`:

```tsx
'use client'

// ... bestehende Imports
import { useState } from 'react'
import { PublishValidationDialog, type PublishProblem } from './PublishValidationDialog'

// ... in der Komponente, nach useState calls:
const [problems, setProblems] = useState<PublishProblem[]>([])
const [publishOpen, setPublishOpen] = useState(false)
const [publishing, setPublishing] = useState(false)

async function publish() {
  setPublishing(true)
  try {
    const res = await fetch(`/api/v1/courses/${courseId}/publish`, { method: 'POST' })
    const body = await res.json()
    if (res.status === 422) {
      setProblems(body.error.details ?? [])
      setPublishOpen(true)
      return
    }
    if (body.success) await load()
  } finally { setPublishing(false) }
}

async function unpublish() {
  await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' })
  await load()
}

async function archive() {
  if (!confirm('Kurs archivieren?')) return
  await fetch(`/api/v1/courses/${courseId}/archive`, { method: 'POST' })
  await load()
}

// im Header-JSX, neben den Badges:
<div className="flex gap-2">
  {course.status === 'draft' && (
    <Button onClick={publish} disabled={publishing}>
      {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Veröffentlichen
    </Button>
  )}
  {course.status === 'published' && (
    <>
      <Button onClick={unpublish} variant="outline">Zurück zu Draft</Button>
      <Button onClick={archive} variant="outline">Archivieren</Button>
    </>
  )}
  {course.status === 'archived' && (
    <Button onClick={async () => { await fetch(`/api/v1/courses/${courseId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }); await load() }} variant="outline">
      Wiederbeleben
    </Button>
  )}
</div>

// am Ende des JSX (nach </Tabs>):
<PublishValidationDialog open={publishOpen} onClose={() => setPublishOpen(false)} problems={problems} />
```

(„Wiederbeleben" eines archivierten Kurses funktioniert über simples PATCH ohne Body — Server lässt status auf `archived`. Korrekter wäre eine separate `restore`-Route — aktuell out of scope. Stattdessen kann der Admin per Stammdaten-Tab ein Feld ändern, der Server setzt status nicht zurück. Folge-Verbesserung: dedizierter `POST /api/v1/courses/[id]/restore`-Endpoint im nächsten Sub-Projekt.)

- [ ] **Step 3: Manuell prüfen**

Kurs ohne Lektion → Veröffentlichen klicken → Dialog mit Mängeln. Dialog schließen, Lektion mit Inhalt anlegen → erneut Veröffentlichen → Status springt auf `published`. „Zurück zu Draft" → Status `draft`. „Archivieren" → Status `archived`.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/_components
git commit -m "feat(elearning): publish/unpublish/archive flow with validation dialog"
```

---

## Task 23: Vorschau-Tab + manuelles UAT

**Files:**
- Create: `.../_components/CoursePreview.tsx`
- Modify: `CourseEditView.tsx` (Vorschau-Tab)

- [ ] **Step 1: Vorschau-Komponente implementieren**

Datei `.../_components/CoursePreview.tsx`:

```tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Module { id: string; title: string; position: number }
interface Lesson { id: string; title: string; slug: string; position: number; moduleId: string | null; contentMarkdown: string | null; videoAssetId: string | null }
interface Course {
  title: string; subtitle: string | null; description: string | null
  useModules: boolean
  modules: Module[]; lessons: Lesson[]
}

export function CoursePreview({ course, lessonAssets }: {
  course: Course
  lessonAssets: Record<string, { path: string; mimeType: string }>
}) {
  const sorted = [...course.lessons].sort((a, b) => a.position - b.position)

  return (
    <div className="prose prose-sm max-w-3xl mx-auto">
      <h1>{course.title}</h1>
      {course.subtitle && <p className="lead">{course.subtitle}</p>}
      {course.description && <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.description}</ReactMarkdown>}

      {course.useModules ? course.modules.sort((a,b) => a.position - b.position).map(m => (
        <section key={m.id}>
          <h2>{m.title}</h2>
          {sorted.filter(l => l.moduleId === m.id).map(l => renderLesson(l, lessonAssets))}
        </section>
      )) : sorted.map(l => renderLesson(l, lessonAssets))}
    </div>
  )
}

function renderLesson(l: Lesson, assets: Record<string, { path: string; mimeType: string }>) {
  const video = l.videoAssetId ? assets[l.videoAssetId] : null
  return (
    <article key={l.id} className="my-8">
      <h3>{l.title}</h3>
      {video && <video controls className="w-full" src={`/api/v1/courses/assets/serve/${video.path}`} />}
      {l.contentMarkdown && <ReactMarkdown remarkPlugins={[remarkGfm]}>{l.contentMarkdown}</ReactMarkdown>}
    </article>
  )
}
```

- [ ] **Step 2: In `CourseEditView.tsx` einbinden**

Im Vorschau-Tab müssen Lektion + Asset-Daten geladen werden, weil `course.lessons` aus `/api/v1/courses/[id]` keine `contentMarkdown` enthält. Erweitere `load()` so, dass beim Vorschau-Tab via `Promise.all` jede Lektion einzeln über `/api/v1/courses/[id]/lessons/[lessonId]` geladen wird:

```tsx
const [previewLessons, setPreviewLessons] = useState<Array<Lesson & { contentMarkdown: string | null; videoAssetId: string | null; assets: any[] }>>([])

async function loadPreview() {
  if (!course) return
  const detailed = await Promise.all(
    course.lessons.map(l => fetch(`/api/v1/courses/${courseId}/lessons/${l.id}`).then(r => r.json()).then(b => b.data))
  )
  setPreviewLessons(detailed)
}

// Im Vorschau-Tab:
<TabsContent value="vorschau" className="mt-6" onFocus={loadPreview}>
  <Button onClick={loadPreview} variant="outline" size="sm" className="mb-4">Aktualisieren</Button>
  {previewLessons.length > 0 && (
    <CoursePreview
      course={{ ...course, lessons: previewLessons }}
      lessonAssets={Object.fromEntries(previewLessons.flatMap(l => (l.assets ?? []).map(a => [a.id, a])))}
    />
  )}
</TabsContent>
```

(`onFocus` an `TabsContent` ist nicht zuverlässig. Pragmatischer: User klickt einmal „Aktualisieren". Alternative: in `useEffect` auf `tab === 'vorschau'` reagieren — dafür wäre `defaultValue` zu `value`-controlled umzubauen. Out of scope dieser Task.)

- [ ] **Step 3: Vollständiges manuelles UAT**

Run: `npm run dev`

UAT-Skript:
1. **Kurs-Lifecycle:** Liste → „Neuer Kurs" → Titel „UAT-Kurs" → Anlegen → Edit-Seite öffnet
2. **Stammdaten:** Sichtbarkeit auf „Public" + leere Beschreibung → Speichern → Tab „Inhalt"
3. **Tree ohne Module:** 2 Lektionen anlegen → Drag-Drop tauscht → Refresh → bleibt
4. **Lektion editieren:** „Bearbeiten →" → Markdown eingeben + Vorschau live → Speichern
5. **Video-Upload:** Video-Tab → kleine .mp4 (~10 MB) hochladen → Progress sichtbar → Player erscheint, spielt ab, seekt
6. **Anhang:** Anhänge-Tab → PDF hochladen → Download-Link funktioniert
7. **Publish-Validation:** Zurück zum Kurs → „Veröffentlichen" → Dialog erscheint mit Mängelliste (z. B. „Public-Kurse brauchen eine Beschreibung")
8. **Publish-Erfolg:** Stammdaten → Beschreibung füllen → Speichern → Inhalt → Lektion ohne Inhalt entfernen falls vorhanden → Veröffentlichen → Status springt auf „published"
9. **Tree mit Modulen:** Neuer Kurs anlegen, useModules=true → 2 Module + je 2 Lektionen → Drag-Drop sowohl Module als auch Lektionen → Reload → korrekt
10. **Vorschau:** Vorschau-Tab → „Aktualisieren" → Inhalt + Video + Module gerendert
11. **Löschen:** Kurs löschen → Liste leer (wenn kein anderer übrig) → File-System: `public/uploads/courses/{deletedId}/` ist weg

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/elearning/[id]/_components/CoursePreview.tsx src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx
git commit -m "feat(elearning): vorschau tab + manual UAT pass"
```

---

## Pakets-Abschluss

- [ ] **Final-Check: TypeScript-Build sauber**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Final-Check: alle Tests grün**

Run: `npx vitest run`
Expected: alle bestehenden + neuen Tests grün.

- [ ] **Plan-Datei committen**

```bash
git add docs/superpowers/plans/2026-04-26-onlinekurse-sub1c-ui.md
git commit -m "docs(elearning): plan 1c ui"
```

**Sub-Projekt 1 abgeschlossen.** Nächste Sub-Projekte siehe Spec → Sub-Projekt 2 (Public/Portal-Player) ist als nächstes geplant.
