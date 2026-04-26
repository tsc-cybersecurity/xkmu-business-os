import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, GraduationCap } from 'lucide-react'
import { CourseStammdatenForm } from '../_components/CourseStammdatenForm'

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/intern/elearning">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück zur Liste
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="h-8 w-8" />
          Neuer Kurs
        </h1>
        <p className="text-muted-foreground mt-1">
          Lege einen neuen Onlinekurs an. Nach dem Speichern kannst du Lektionen, Videos und Anhänge ergänzen.
        </p>
      </div>
      <CourseStammdatenForm mode="create" />
    </div>
  )
}
