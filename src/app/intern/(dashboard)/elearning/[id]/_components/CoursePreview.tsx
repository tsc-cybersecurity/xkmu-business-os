'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface PreviewLesson {
  id: string
  title: string
  slug: string
  position: number
  moduleId: string | null
  contentMarkdown: string | null
  videoAssetId: string | null
  assets: Array<{ id: string; path: string; mimeType: string }>
}

export interface PreviewCourse {
  title: string
  subtitle: string | null
  description: string | null
  useModules: boolean
  modules: Array<{ id: string; title: string; position: number }>
  lessons: PreviewLesson[]
}

export function CoursePreview({
  course,
  lessonAssets,
}: {
  course: PreviewCourse
  lessonAssets: Record<string, { path: string; mimeType: string }>
}) {
  const sorted = [...course.lessons].sort((a, b) => a.position - b.position)

  return (
    <div className="prose prose-sm dark:prose-invert max-w-3xl mx-auto">
      <h1>{course.title}</h1>
      {course.subtitle && <p className="lead">{course.subtitle}</p>}
      {course.description && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.description}</ReactMarkdown>
      )}

      {course.useModules
        ? [...course.modules]
            .sort((a, b) => a.position - b.position)
            .map((m) => (
              <section key={m.id}>
                <h2>{m.title}</h2>
                {sorted
                  .filter((l) => l.moduleId === m.id)
                  .map((l) => renderLesson(l, lessonAssets))}
              </section>
            ))
        : sorted.map((l) => renderLesson(l, lessonAssets))}
    </div>
  )
}

function renderLesson(
  l: PreviewLesson,
  assets: Record<string, { path: string; mimeType: string }>,
) {
  const video = l.videoAssetId ? assets[l.videoAssetId] : null
  return (
    <article key={l.id} className="my-8">
      <h3>{l.title}</h3>
      {video && (
        <video
          controls
          className="w-full"
          src={`/api/v1/courses/assets/serve/${video.path}`}
        />
      )}
      {l.contentMarkdown && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{l.contentMarkdown}</ReactMarkdown>
      )}
    </article>
  )
}
