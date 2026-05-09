import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Item { id: string; fact: string; status: string; source: string }

export function MemoryEntryCard(props: { title: string | null; body: string; items: Item[]; scope?: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{props.title ?? 'Memory-Entry'}</span>
            {props.scope && (
              <Link href={`/intern/agents/memory/${encodeURIComponent(props.scope)}/edit`}>
                <Button size="sm" variant="outline">Bearbeiten</Button>
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{props.body}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
      {props.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fakten</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm divide-y">
              {props.items.map((i) => (
                <li key={i.id} className="py-2 flex items-start gap-2">
                  <Badge variant={i.status === 'active' ? 'default' : 'secondary'}>{i.status}</Badge>
                  <div>
                    <div>{i.fact}</div>
                    <div className="text-xs text-muted-foreground">{i.source}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
