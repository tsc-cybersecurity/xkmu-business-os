import { LessonEditView } from './_components/LessonEditView'

interface Props {
  params: Promise<{ id: string; lessonId: string }>
}

export default async function LessonEditPage({ params }: Props) {
  const { id, lessonId } = await params
  return <LessonEditView courseId={id} lessonId={lessonId} />
}
