import { MemoryService } from '@/lib/services/agents'
import { MemoryEntryCard } from '@/components/agents/memory/memory-entry-card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MemoryDetailPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: encScope } = await params
  const scope = decodeURIComponent(encScope)
  try {
    const r = await MemoryService.read(scope)
    return (
      <div className="container py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{r.title ?? scope}</h1>
          <p className="text-xs text-muted-foreground">{scope}</p>
        </div>
        <MemoryEntryCard title={r.title} body={r.body} items={r.items} />
      </div>
    )
  } catch {
    notFound()
  }
}
