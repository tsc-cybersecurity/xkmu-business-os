import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const SCHUTZBEDARF_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  hoch: 'bg-orange-100 text-orange-700',
  sehr_hoch: 'bg-red-100 text-red-700',
}

export const SCHUTZBEDARF_LABELS: Record<string, string> = {
  normal: 'Normal',
  hoch: 'Hoch',
  sehr_hoch: 'Sehr hoch',
}

interface SchutzBadgeProps {
  label: string
  value: string | null
}

export function SchutzBadge({ label, value }: SchutzBadgeProps) {
  const v = value || 'normal'
  return (
    <Badge variant="outline" className={cn('text-xs', SCHUTZBEDARF_COLORS[v])}>
      {label}: {SCHUTZBEDARF_LABELS[v] ?? v}
    </Badge>
  )
}
