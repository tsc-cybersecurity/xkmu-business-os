import { MemoryService } from '@/lib/services/agents'
import { MemoryEntryCard } from '@/components/agents/memory/memory-entry-card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MemoryDetailPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: encScope } = await params
  const scope = decodeURIComponent(encScope)
  let r
  try {
    r = await MemoryService.read(scope)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('nicht gefunden') || msg.includes('summary.md fuer scope')) {
      notFound()
    }
    throw e // bubble up real errors to error.tsx
  }
  return (
    <div className="container py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{r.title ?? scope}</h1>
        <p className="text-xs text-muted-foreground">{scope}</p>
      </div>
      <MemoryEntryCard title={r.title} body={r.body} items={r.items} />
    </div>
  )
}
