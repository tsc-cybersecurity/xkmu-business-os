'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ArrowLeft, Loader2, PenLine, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  // Manual form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [featuredImageAlt, setFeaturedImageAlt] = useState('')

  // AI form
  const [aiTopic, setAiTopic] = useState('')
  const [aiLanguage, setAiLanguage] = useState('de')
  const [aiTone, setAiTone] = useState('professional')
  const [aiLength, setAiLength] = useState('medium')

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.success) {
        setFeaturedImage(data.data.path)
        toast.success('Bild erfolgreich hochgeladen')
      } else {
        toast.error(data.error?.message || 'Upload fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Bild-Upload fehlgeschlagen')
    }
  }

  const handleCreateManual = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: content || undefined,
          excerpt: excerpt || undefined,
          featuredImage: featuredImage || undefined,
          featuredImageAlt: featuredImageAlt || undefined,
          category: category || undefined,
          tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
          source: 'manual',
        }),
      })
      const data = await response.json()
      if (data.success) {
        router.push(`/intern/blog/${data.data.id}`)
      } else {
        toast.error(data.error?.message || 'Erstellen fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      toast.error('Beitrag konnte nicht erstellt werden')
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/blog/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          language: aiLanguage,
          tone: aiTone,
          length: aiLength,
        }),
      })
      const data = await response.json()
      if (data.success) {
        router.push(`/intern/blog/${data.data.id}`)
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to generate post:', error)
      toast.error('Beitrag konnte nicht generiert werden')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/intern/blog">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Neuer Beitrag</h1>
      </div>

      <Tabs defaultValue="manual" className="max-w-3xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Manuell erstellen
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Per KI generieren
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Beitrag manuell erstellen</CardTitle>
              <CardDescription>Schreiben Sie Ihren Beitrag direkt in Markdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titel *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel des Beitrags" />
              </div>
              <div className="space-y-2">
                <Label>Zusammenfassung</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Kurze Zusammenfassung..." />
              </div>
              <div className="space-y-2">
                <Label>Inhalt (Markdown)</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={15} className="font-mono text-sm" placeholder="# Ueberschrift\n\nIhr Text hier..." />
              </div>
              <div className="space-y-2">
                <Label>Beitragsbild</Label>
                <Input type="file" accept="image/*" onChange={handleUploadImage} />
                {featuredImage && (
                  <p className="text-xs text-muted-foreground truncate">{featuredImage}</p>
                )}
              </div>
              {featuredImage && (
                <div className="space-y-2">
                  <Label>Alt-Text</Label>
                  <Input value={featuredImageAlt} onChange={(e) => setFeaturedImageAlt(e.target.value)} placeholder="Bildbeschreibung" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z.B. IT-Sicherheit" />
                </div>
                <div className="space-y-2">
                  <Label>Tags (kommagetrennt)</Label>
                  <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="tag1, tag2" />
                </div>
              </div>
              <Button onClick={handleCreateManual} disabled={creating || !title.trim()} className="w-full">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Beitrag erstellen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Beitrag per KI generieren</CardTitle>
              <CardDescription>Lassen Sie einen kompletten Blogbeitrag per KI erstellen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thema *</Label>
                <Textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  rows={3}
                  placeholder="z.B. Die wichtigsten IT-Sicherheitstrends 2026 fuer kleine Unternehmen"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sprache</Label>
                  <Select value={aiLanguage} onValueChange={setAiLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">Englisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tonalitaet</Label>
                  <Select value={aiTone} onValueChange={setAiTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professionell</SelectItem>
                      <SelectItem value="casual">Locker</SelectItem>
                      <SelectItem value="technical">Technisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Laenge</Label>
                  <Select value={aiLength} onValueChange={setAiLength}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Kurz (~500 Woerter)</SelectItem>
                      <SelectItem value="medium">Mittel (~1000 Woerter)</SelectItem>
                      <SelectItem value="long">Lang (~2000 Woerter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleGenerateAI} disabled={creating || !aiTopic.trim()} className="w-full">
                {creating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird generiert...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Beitrag generieren</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
