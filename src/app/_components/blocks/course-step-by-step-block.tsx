import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CourseStepByStepBlockStep {
  title: string
  description?: string
}

export interface CourseStepByStepBlockContent {
  title?: string
  steps?: CourseStepByStepBlockStep[]
}

interface Props {
  content: CourseStepByStepBlockContent
}

export function CourseStepByStepBlock({ content }: Props) {
  const steps = content.steps ?? []
  return (
    <Card>
      {content.title && (
        <CardHeader>
          <CardTitle className="text-lg">{content.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <div className="font-medium">{step.title}</div>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
