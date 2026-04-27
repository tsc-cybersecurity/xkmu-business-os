import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Target } from 'lucide-react'

export interface CourseLearningObjectivesBlockContent {
  title?: string
  items?: string[]
}

interface Props {
  content: CourseLearningObjectivesBlockContent
}

export function CourseLearningObjectivesBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          {content.title || 'Was du lernst'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
