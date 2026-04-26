import { CourseStammdatenForm } from '../_components/CourseStammdatenForm'

export default function NewCoursePage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Neuer Kurs</h1>
      <CourseStammdatenForm mode="create" />
    </div>
  )
}
