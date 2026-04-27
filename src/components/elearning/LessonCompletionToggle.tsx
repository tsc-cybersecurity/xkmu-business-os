'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Props {
  courseId: string
  lessonId: string
  initialCompleted: boolean
}

export function LessonCompletionToggle({ courseId, lessonId, initialCompleted }: Props) {
  const router = useRouter()
  const [completed, setCompleted] = useState(initialCompleted)
  const [pending, startTransition] = useTransition()

  async function toggle() {
    const next = !completed
    setCompleted(next)  // optimistic
    try {
      const res = await fetch(
        `/api/v1/courses/${courseId}/lessons/${lessonId}/complete`,
        { method: next ? 'POST' : 'DELETE' },
      )
      const json = await res.json()
      if (!json.success) {
        setCompleted(!next)
        toast.error(json.error?.message ?? 'Aktualisierung fehlgeschlagen')
        return
      }
      toast.success(next ? 'Als erledigt markiert' : 'Markierung entfernt')
      startTransition(() => router.refresh())
    } catch (err) {
      setCompleted(!next)
      logger.error('Lesson completion toggle failed', err, { module: 'LessonCompletionToggle' })
      toast.error('Aktualisierung fehlgeschlagen')
    }
  }

  return (
    <Button
      variant={completed ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {completed ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Erledigt
        </>
      ) : (
        <>
          <Circle className="mr-2 h-4 w-4" />
          Als erledigt markieren
        </>
      )}
    </Button>
  )
}
