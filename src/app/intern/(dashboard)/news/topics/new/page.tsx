'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { toast } from 'sonner'
import { TopicForm, type TopicFormData } from '@/components/news/topic-form'
import { logger } from '@/lib/utils/logger'

export default function NewNewsTopicPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (data: TopicFormData) => {
    setSaving(true)
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        color: data.color,
        keywords: data.keywords,
        sourceType: data.sourceType,
        sourceConfig: data.sourceConfig,
        socialConfig: data.socialConfig,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      }
      const response = await fetch('/api/v1/news/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Thema erstellt')
        const id = json.data?.id
        if (id) router.push(`/intern/news/topics/${id}`)
        else router.push('/intern/news/topics')
      } else {
        toast.error(json.error?.message || 'Fehler beim Speichern')
      }
    } catch (error) {
      logger.error('Failed to create news topic', error, { module: 'NewsTopicNewPage' })
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/news/topics">
          <Button variant="ghost" size="icon" aria-label="Zurück zur Liste">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Newspaper className="h-8 w-8" />
            Neues Themengebiet
          </h1>
          <p className="text-muted-foreground mt-1">
            Legen Sie ein neues Thema für die News-Recherche an.
          </p>
        </div>
      </div>

      <TopicForm onSubmit={handleSubmit} saving={saving} submitLabel="Erstellen" />
    </div>
  )
}
