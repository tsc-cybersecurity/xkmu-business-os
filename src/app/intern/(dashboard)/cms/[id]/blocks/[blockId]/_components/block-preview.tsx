'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye } from 'lucide-react'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'

interface BlockPreviewProps {
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

export function BlockPreview({ blockType, content, settings }: BlockPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live-Vorschau
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg overflow-hidden bg-white dark:bg-background">
          <CmsBlockRenderer
            blockType={blockType}
            content={content}
            settings={settings}
          />
        </div>
      </CardContent>
    </Card>
  )
}
