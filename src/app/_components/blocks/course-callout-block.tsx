import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, Lightbulb, AlertTriangle, OctagonAlert, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CourseCalloutBlockContent {
  variant?: 'note' | 'tip' | 'warning' | 'danger' | 'info'
  title?: string
  body?: string
}

interface Props {
  content: CourseCalloutBlockContent
}

const variantConfig = {
  note:    { icon: Info,           classes: 'border-slate-300 bg-slate-50 text-slate-900 dark:bg-slate-900/40 dark:text-slate-100' },
  tip:     { icon: Lightbulb,      classes: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100' },
  info:    { icon: CircleAlert,    classes: 'border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100' },
  warning: { icon: AlertTriangle,  classes: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100' },
  danger:  { icon: OctagonAlert,   classes: 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100' },
}

export function CourseCalloutBlock({ content }: Props) {
  const variant = content.variant ?? 'tip'
  const config = variantConfig[variant] ?? variantConfig.tip
  const Icon = config.icon
  return (
    <Alert className={cn('border', config.classes)}>
      <Icon className="h-4 w-4" />
      {content.title && <AlertTitle>{content.title}</AlertTitle>}
      {content.body && <AlertDescription>{content.body}</AlertDescription>}
    </Alert>
  )
}
