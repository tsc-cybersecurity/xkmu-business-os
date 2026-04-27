import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export interface CourseKeyTakeawaysBlockContent {
  title?: string
  items?: string[]
}

interface Props {
  content: CourseKeyTakeawaysBlockContent
}

export function CourseKeyTakeawaysBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Card className="bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {content.title || 'Wichtigste Punkte'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
