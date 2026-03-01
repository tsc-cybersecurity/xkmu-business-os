'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Brain, Save, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface Topic {
  id: string;
  name: string;
}

interface ContentPlanItem {
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  scheduledDay?: number;
}

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  xing: 'XING',
};

export default function ContentPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<ContentPlanItem[]>([]);

  const topicFromQuery = searchParams.get('topic') || '';

  const [form, setForm] = useState({
    platforms: ['linkedin'] as string[],
    topics: topicFromQuery,
    count: 7,
    tone: 'professional',
  });

  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/social-media/topics');
      const data = await response.json();
      if (data.success) setTopics(data.data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const togglePlatform = (platform: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }));
  };

  const handleGenerate = async () => {
    if (form.platforms.length === 0) {
      toast.error('Mindestens eine Plattform auswaehlen');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/social-media/posts/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: form.platforms,
          topics: form.topics
            ? form.topics
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          count: form.count,
          tone: form.tone,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPlan(data.data);
        toast.success(`${data.data.length} Beitraege generiert`);
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen');
      }
    } catch {
      toast.error('Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (plan.length === 0) return;
    setSaving(true);
    try {
      let savedCount = 0;
      for (const item of plan) {
        const response = await fetch('/api/v1/social-media/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: item.platform,
            title: item.title,
            content: item.content,
            hashtags: item.hashtags,
            aiGenerated: true,
            status: 'draft',
          }),
        });
        const data = await response.json();
        if (data.success) savedCount++;
      }
      toast.success(`${savedCount} Beitraege gespeichert`);
      router.push('/intern/social-media');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const allPlatforms = ['linkedin', 'twitter', 'instagram', 'facebook', 'xing'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/social-media">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            Contentplan Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Lassen Sie die KI einen kompletten Contentplan erstellen
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plattformen *</Label>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={form.platforms.includes(platform) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePlatform(platform)}
                >
                  {platformLabels[platform]}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Themen (kommagetrennt)</Label>
              <Textarea
                value={form.topics}
                onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                placeholder="z.B. Digitalisierung, KI, IT-Sicherheit"
                rows={2}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Anzahl Beitraege</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.count}
                  onChange={(e) => setForm((f) => ({ ...f, count: parseInt(e.target.value) || 7 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tonalitaet</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => setForm((f) => ({ ...f, tone: v }))}
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
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Generiere Contentplan...' : 'Contentplan generieren'}
          </Button>
        </CardContent>
      </Card>

      {plan.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Vorschau ({plan.length} Beitraege)</h2>
            <Button onClick={handleSaveAll} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Alle als Entwuerfe speichern
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {item.title || `Beitrag ${index + 1}`}
                    </CardTitle>
                    <Badge variant="outline">
                      {platformLabels[item.platform] || item.platform}
                    </Badge>
                  </div>
                  {item.scheduledDay && <CardDescription>Tag {item.scheduledDay}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{item.content}</p>
                  {item.hashtags.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">{item.hashtags.join(' ')}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
