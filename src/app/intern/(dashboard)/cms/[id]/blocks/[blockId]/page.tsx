'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { BlockEditor } from './_components/block-editor'
import { BlockPreview } from './_components/block-preview'

interface CmsBlock {
  id: string
  pageId: string
  blockType: string
  sortOrder: number | null
  content: Record<string, unknown>
  settings: Record<string, unknown>
  isVisible: boolean | null
}

export default function BlockEditorPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string
  const blockId = params.blockId as string

  const [block, setBlock] = useState<CmsBlock | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  const fetchBlock = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}`)
      const data = await response.json()
      if (data.success) {
        const found = data.data.blocks.find((b: CmsBlock) => b.id === blockId)
        if (found) {
          setBlock(found)
          setContent((found.content as Record<string, unknown>) || {})
          setSettings((found.settings as Record<string, unknown>) || {})
        }
      }
    } catch (error) {
      logger.error('Failed to fetch block', error, { module: 'CmsBlocksPage' })
    } finally {
      setLoading(false)
    }
  }, [pageId, blockId])

  useEffect(() => {
    fetchBlock()
  }, [fetchBlock])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/v1/cms/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, settings }),
      })
      router.push(`/intern/cms/${pageId}`)
    } catch (error) {
      logger.error('Failed to save block', error, { module: 'CmsBlocksPage' })
    } finally {
      setSaving(false)
    }
  }

  const updateContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const updateSettings = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!block) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Block nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BlockEditor
        pageId={pageId}
        blockType={block.blockType}
        content={content}
        settings={settings}
        saving={saving}
        onSave={handleSave}
        onUpdateContent={updateContent}
        onUpdateSettings={updateSettings}
      />

      {/* Live Preview */}
      <BlockPreview
        blockType={block.blockType}
        content={content}
        settings={settings}
      />
    </div>
  )
}
