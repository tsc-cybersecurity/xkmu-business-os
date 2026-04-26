import { CourseEditView } from './_components/CourseEditView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CourseEditPage({ params }: Props) {
  const { id } = await params
  return <CourseEditView courseId={id} />
}
