'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ShoppingCart } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  color: string | null
}

interface ContractRow {
  id: string
  number: string
}

interface ProjectRow {
  id: string
  name: string
}

const PRIORITY_OPTIONS = [
  { value: 'niedrig',  label: 'Niedrig' },
  { value: 'mittel',   label: 'Mittel' },
  { value: 'hoch',     label: 'Hoch' },
  { value: 'kritisch', label: 'Kritisch' },
]

export default function PortalOrdersNewPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [categoryId, setCategoryId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('mittel')
  const [contractId, setContractId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/portal/order-categories').then(r => r.json()),
      fetch('/api/v1/portal/me/contracts').then(r => r.json()),
      fetch('/api/v1/portal/me/projects').then(r => r.json()),
    ]).then(([catData, contractData, projectData]) => {
      if (catData?.success) setCategories(catData.data || [])
      if (contractData?.success) setContracts(contractData.data || [])
      if (projectData?.success) setProjects(projectData.data || [])
    }).finally(() => setLoadingData(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (title.trim().length < 3) {
      toast.error('Titel muss mindestens 3 Zeichen lang sein.')
      return
    }
    if (description.trim().length < 10) {
      toast.error('Beschreibung muss mindestens 10 Zeichen lang sein.')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        priority,
      }
      if (categoryId) body.categoryId = categoryId
      if (contractId) body.contractId = contractId
      if (projectId) body.projectId = projectId

      const res = await fetch('/api/v1/portal/me/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok && data?.success) {
        toast.success('Auftrag eingereicht')
        router.push('/portal/orders')
      } else {
        toast.error(data?.error?.message || 'Einreichen fehlgeschlagen')
      }
    } catch {
      toast.error('Einreichen fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Neuen Auftrag einreichen
        </h1>
        <p className="text-muted-foreground">Füllen Sie das Formular aus, um einen Auftrag zu übermitteln.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auftragsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Kategorie */}
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Kategorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="— Keine —" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titel */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Titel <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Kurze Beschreibung des Auftrags"
                required
                minLength={3}
                maxLength={255}
              />
            </div>

            {/* Beschreibung */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Beschreibung <span className="text-destructive">*</span></Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung des Auftrags..."
                rows={5}
                required
                minLength={10}
              />
            </div>

            {/* Priorität */}
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vertrag */}
            <div className="space-y-1.5">
              <Label htmlFor="contractId">Vertrag</Label>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="— Kein Vertrag —" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Projekt */}
            <div className="space-y-1.5">
              <Label htmlFor="projectId">Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="— Kein Projekt —" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/portal/orders">Abbrechen</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Einreichen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
