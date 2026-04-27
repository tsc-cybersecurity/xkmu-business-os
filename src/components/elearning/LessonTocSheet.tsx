'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'
import { LessonTocSidebar } from './LessonTocSidebar'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
}

export function LessonTocSheet(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="mr-2 h-4 w-4" />
          Lektionen
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-4">
        <SheetHeader className="mb-4">
          <SheetTitle>Lektionen</SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <LessonTocSidebar {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
