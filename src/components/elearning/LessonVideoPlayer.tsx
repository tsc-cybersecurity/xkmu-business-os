import type { CourseAsset } from '@/lib/db/schema'

interface Props {
  videoAsset: CourseAsset | null
  videoExternalUrl: string | null
}

function extractYouTubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url)
  return m ? m[1] : null
}

export function LessonVideoPlayer({ videoAsset, videoExternalUrl }: Props) {
  if (videoAsset) {
    return (
      <video
        controls
        preload="metadata"
        className="w-full rounded-md border bg-black"
        src={`/api/v1/courses/assets/serve/${videoAsset.path}`}
      />
    )
  }
  if (videoExternalUrl) {
    const ytId = extractYouTubeId(videoExternalUrl)
    if (ytId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title="Video"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }
    return (
      <a href={videoExternalUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
        Video öffnen
      </a>
    )
  }
  return null
}
