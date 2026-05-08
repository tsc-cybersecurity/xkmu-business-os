import { MemoryTree } from '@/components/agents/memory/memory-tree'
import { MemorySearchBar } from '@/components/agents/memory/memory-search-bar'

export const dynamic = 'force-dynamic'

export default function MemoryHubPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Memory</h1>
        <p className="text-sm text-muted-foreground">
          PARA-strukturiertes Wissen — Projects, Areas, Resources, Archives.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="border rounded p-3 bg-card">
          <MemoryTree />
        </aside>
        <main>
          <MemorySearchBar />
        </main>
      </div>
    </div>
  )
}
