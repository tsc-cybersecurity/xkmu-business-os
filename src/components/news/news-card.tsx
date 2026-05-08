'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Play, EyeOff, Eye, FileText, Share2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NewsItemData {
  id: string
  topicId: string
  title: string
  url: string
  snippet: string | null
  source: string | null
  imageUrl: string | null
  publishedAt: string | null
  pipelineStatus: 'idle' | 'queued' | 'researching' | 'generating' | 'completed' | 'failed'
  pipelineError: string | null
  isHidden?: boolean
}

const STATUS_LABELS: Record<NewsItemData['pipelineStatus'], string> = {
  idle: 'Bereit',
  queued: 'Wartet',
  researching: 'Recherche…',
  generating: 'Generiert…',
  completed: 'Fertig',
  failed: 'Fehler',
}

function formatRelativeDe(value: string): string {
  try {
    const date = new Date(value)
    const diffMs = Date.now() - date.getTime()
    const diffSec = Math.round(diffMs / 1000)
    const abs = Math.abs(diffSec)
    if (abs < 60) return 'gerade eben'
    const diffMin = Math.round(diffSec / 60)
    if (Math.abs(diffMin) < 60) return `vor ${Math.abs(diffMin)} Min.`
    const diffHr = Math.round(diffMin / 60)
    if (Math.abs(diffHr) < 24) return `vor ${Math.abs(diffHr)} Std.`
    const diffDay = Math.round(diffHr / 24)
    if (Math.abs(diffDay) < 30) return `vor ${Math.abs(diffDay)} Tag${Math.abs(diffDay) === 1 ? '' : 'en'}`
    return date.toLocaleDateString('de-DE')
  } catch {
    return ''
  }
}

interface Props {
  item: NewsItemData
  draftCounts?: { blog: number; social: number }
  onPipeline: (itemId: string) => void
  onHide: (itemId: string) => void
  onDelete: (itemId: string) => void
  onOpenDetail: (itemId: string) => void
  triggering: boolean
}

export function NewsCard({ item, draftCounts, onPipeline, onHide, onDelete, onOpenDetail, triggering }: Props) {
  const status = item.pipelineStatus
  const isPulsing = status === 'queued' || status === 'researching' || status === 'generating'
  const canTrigger = status === 'idle' || status === 'failed'

  const badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' =
    status === 'completed' ? 'default'
    : status === 'failed' ? 'destructive'
    : status === 'idle' ? 'secondary'
    : 'outline'

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm space-y-2">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="w-full h-28 object-cover rounded" />
      )}
      <div className="space-y-1">
        <button
          onClick={() => onOpenDetail(item.id)}
          className="text-left font-medium text-sm leading-tight hover:underline line-clamp-2"
        >
          {item.title}
        </button>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {item.source && <span className="truncate">{item.source}</span>}
          {item.publishedAt && (
            <>
              <span>·</span>
              <span>{formatRelativeDe(item.publishedAt)}</span>
            </>
          )}
        </div>
        {item.snippet && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.snippet}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-1">
        <Badge variant={badgeVariant} className={cn('text-xs', isPulsing && 'animate-pulse')}>
          {STATUS_LABELS[status]}
        </Badge>
        <div className="flex items-center gap-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Quelle öffnen"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canTrigger || triggering}
            onClick={() => onPipeline(item.id)}
            title="Verarbeiten"
            className="h-7 w-7 p-0"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onHide(item.id)}
            title={item.isHidden ? 'Wieder einblenden' : 'Verbergen'}
            className="h-7 w-7 p-0"
          >
            {item.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            title="Löschen"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {status === 'completed' && draftCounts && (draftCounts.blog > 0 || draftCounts.social > 0) && (
        <div className="text-xs text-muted-foreground flex items-center gap-3 pt-1 border-t">
          {draftCounts.blog > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> {draftCounts.blog} Blog
            </span>
          )}
          {draftCounts.social > 0 && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" /> {draftCounts.social} Posts
            </span>
          )}
        </div>
      )}

      {status === 'failed' && item.pipelineError && (
        <p className="text-xs text-destructive truncate" title={item.pipelineError}>
          {item.pipelineError}
        </p>
      )}
    </div>
  )
}
