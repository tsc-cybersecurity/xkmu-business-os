import { MemoryService } from '@/lib/services/agents'
import { MarkdownEditor } from '@/components/agents/memory/markdown-editor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MemoryEditPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: rawScope } = await params
  const scope = decodeURIComponent(rawScope)
  let entry: Awaited<ReturnType<typeof MemoryService.read>> | null = null
  try {
    entry = await MemoryService.read(scope)
  } catch (e) {
    if ((e as Error).message.includes('nicht gefunden')) notFound()
    throw e
  }
  return (
    <div className="container py-6">
      <MarkdownEditor scope={scope} initialBody={entry.body ?? ''} initialTitle={entry.title ?? ''} />
    </div>
  )
}
