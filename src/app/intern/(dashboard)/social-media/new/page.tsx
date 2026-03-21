'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Brain, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageGeneratorDialog } from '@/components/shared'
import { logger } from '@/lib/utils/logger'

interface Topic {
  id: string;
  name: string;
}

function ImageField({ imageUrl, onImageChange }: { imageUrl: string; onImageChange: (url: string) => void }) {
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<Array<{ id: string; imageUrl: string; prompt: string }>>([])

  const loadGallery = async () => {
    try {
      const res = await fetch('/api/v1/images?limit=20&category=social_media')
      const data = await res.json()
      if (data.success) setGalleryImages(data.data)
      // Also load general images
      const res2 = await fetch('/api/v1/images?limit=20')
      const data2 = await res2.json()
      if (data2.success) {
        const ids = new Set(data.data?.map((i: { id: string }) => i.id) || [])
        const extra = (data2.data || []).filter((i: { id: string }) => !ids.has(i.id))
        setGalleryImages(prev => [...prev, ...extra].slice(0, 30))
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-2">
      <Label>Bild (optional)</Label>
      {imageUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Post-Bild" className="h-32 w-auto rounded-lg border" />
          <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => onImageChange('')}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ImageGeneratorDialog defaultCategory="social_media" onImageGenerated={onImageChange} />
          <Button type="button" variant="outline" size="sm" onClick={() => { setShowGallery(!showGallery); if (!showGallery) loadGallery() }}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Aus Galerie wählen
          </Button>
        </div>
      )}
      {showGallery && !imageUrl && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-2">
          {galleryImages.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-4">Keine Bilder in der Galerie</p>}
          {galleryImages.map(img => (
            <button key={img.id} type="button" className="aspect-square rounded border overflow-hidden hover:ring-2 hover:ring-primary" onClick={() => { onImageChange(img.imageUrl); setShowGallery(false) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.imageUrl} alt={img.prompt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewSocialMediaPostPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Shared image state across tabs
  const [imageUrl, setImageUrl] = useState('');

  // Manual form
  const [form, setForm] = useState({
    platform: 'linkedin',
    topicId: '',
    title: '',
    content: '',
    hashtags: '',
  });

  // AI generation form
  const [aiForm, setAiForm] = useState({
    platform: 'linkedin',
    topic: '',
    tone: 'professional',
    includeHashtags: true,
    includeEmoji: true,
  });
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    hashtags: string[];
  } | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/social-media/topics');
      const data = await response.json();
      if (data.success) setTopics(data.data);
    } catch (error) {
      logger.error('Failed to fetch topics', error, { module: 'SocialMediaNewPage' });
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error('Inhalt ist erforderlich');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/v1/social-media/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          topicId: form.topicId || undefined,
          imageUrl: imageUrl || undefined,
          hashtags: form.hashtags
            ? form.hashtags
                .split(',')
                .map((h) => h.trim())
                .filter(Boolean)
            : [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Beitrag erstellt');
        router.push('/intern/social-media');
      } else {
        toast.error(data.error?.message || 'Fehler beim Erstellen');
      }
    } catch {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiForm.topic.trim()) {
      toast.error('Thema ist erforderlich');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/social-media/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedContent(data.data);
        toast.success('Beitrag generiert');
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen');
      }
    } catch {
      toast.error('Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedContent) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/social-media/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: aiForm.platform,
          title: generatedContent.title,
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          imageUrl: imageUrl || undefined,
          aiGenerated: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Beitrag gespeichert');
        router.push('/intern/social-media');
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern');
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/social-media">
          <Button variant="ghost" size="icon" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neuer Beitrag</h1>
          <p className="text-muted-foreground mt-1">
            Erstellen Sie einen neuen Social-Media-Beitrag
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manuell</TabsTrigger>
          <TabsTrigger value="ai">KI-Generierung</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <form onSubmit={handleManualSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Manueller Beitrag</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plattform *</Label>
                    <Select
                      value={form.platform}
                      onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="xing">XING</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thema</Label>
                    <Select
                      value={form.topicId || 'none'}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, topicId: v === 'none' ? '' : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kein Thema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Thema</SelectItem>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Titel</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Optionaler Titel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inhalt *</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="Beitragstext"
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hashtags (kommagetrennt)</Label>
                  <Input
                    value={form.hashtags}
                    onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                    placeholder="#hashtag1, #hashtag2"
                  />
                </div>
                <ImageField imageUrl={imageUrl} onImageChange={setImageUrl} />
                <div className="flex justify-end gap-2">
                  <Link href="/intern/social-media">
                    <Button variant="outline" type="button">
                      Abbrechen
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Beitrag erstellen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                KI-Generierung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plattform *</Label>
                  <Select
                    value={aiForm.platform}
                    onValueChange={(v) => setAiForm((f) => ({ ...f, platform: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="xing">XING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tonalität</Label>
                  <Select
                    value={aiForm.tone}
                    onValueChange={(v) => setAiForm((f) => ({ ...f, tone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professionell</SelectItem>
                      <SelectItem value="casual">Locker</SelectItem>
                      <SelectItem value="humorous">Humorvoll</SelectItem>
                      <SelectItem value="inspirational">Inspirierend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Thema *</Label>
                <Textarea
                  value={aiForm.topic}
                  onChange={(e) => setAiForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Worüber soll der Beitrag handeln?"
                  rows={3}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {generating ? 'Generiere...' : 'Beitrag generieren'}
              </Button>

              <ImageField imageUrl={imageUrl} onImageChange={setImageUrl} />

              {generatedContent && (
                <div className="mt-6 p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">Generierter Beitrag</h3>
                  {generatedContent.title && (
                    <p className="font-medium">{generatedContent.title}</p>
                  )}
                  <p className="whitespace-pre-line">{generatedContent.content}</p>
                  {generatedContent.hashtags.length > 0 && (
                    <p className="text-sm text-blue-600">{generatedContent.hashtags.join(' ')}</p>
                  )}
                  <Button onClick={handleSaveGenerated} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Als Entwurf speichern
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
