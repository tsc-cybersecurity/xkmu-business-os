'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Save, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  hashtags: string[] | null;
  status: string | null;
  scheduledAt: string | null;
  topicId: string | null;
}

export default function EditSocialMediaPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [improveInstructions, setImproveInstructions] = useState('');

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/social-media/posts/${id}`);
      const data = await response.json();
      if (data.success) setPost(data.data);
    } catch (error) {
      console.error('Failed to fetch post:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/social-media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          hashtags: post.hashtags,
          status: post.status,
          platform: post.platform,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Beitrag gespeichert');
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern');
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleImprove = async () => {
    if (!improveInstructions.trim()) {
      toast.error('Anweisungen erforderlich');
      return;
    }
    setImproving(true);
    try {
      const response = await fetch(`/api/v1/social-media/posts/${id}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: improveInstructions }),
      });
      const data = await response.json();
      if (data.success) {
        setPost((p) =>
          p
            ? {
                ...p,
                content: data.data.content,
                hashtags: data.data.hashtags,
              }
            : p,
        );
        toast.success('Beitrag verbessert');
        setShowImproveDialog(false);
        setImproveInstructions('');
      } else {
        toast.error(data.error?.message || 'Verbesserung fehlgeschlagen');
      }
    } catch {
      toast.error('Verbesserung fehlgeschlagen');
    } finally {
      setImproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Beitrag nicht gefunden</p>
        <Link href="/intern/social-media">
          <Button variant="link">Zurueck zur Uebersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/intern/social-media">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Beitrag bearbeiten</h1>
            <p className="text-muted-foreground mt-1">
              {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                KI verbessern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Beitrag mit KI verbessern</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Anweisungen</Label>
                  <Textarea
                    value={improveInstructions}
                    onChange={(e) => setImproveInstructions(e.target.value)}
                    placeholder="z.B. 'Mach den Beitrag kuerzer und fuege mehr Emojis hinzu'"
                    rows={4}
                  />
                </div>
                <Button onClick={handleImprove} disabled={improving} className="w-full">
                  {improving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {improving ? 'Verbessere...' : 'Verbessern'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beitrag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plattform</Label>
              <Select
                value={post.platform}
                onValueChange={(v) => setPost((p) => (p ? { ...p, platform: v } : p))}
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
              <Label>Status</Label>
              <Select
                value={post.status || 'draft'}
                onValueChange={(v) => setPost((p) => (p ? { ...p, status: v } : p))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="scheduled">Geplant</SelectItem>
                  <SelectItem value="posted">Gepostet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={post.title || ''}
              onChange={(e) => setPost((p) => (p ? { ...p, title: e.target.value } : p))}
              placeholder="Optionaler Titel"
            />
          </div>
          <div className="space-y-2">
            <Label>Inhalt</Label>
            <Textarea
              value={post.content}
              onChange={(e) => setPost((p) => (p ? { ...p, content: e.target.value } : p))}
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              value={post.hashtags?.join(', ') || ''}
              onChange={(e) =>
                setPost((p) =>
                  p
                    ? {
                        ...p,
                        hashtags: e.target.value
                          .split(',')
                          .map((h) => h.trim())
                          .filter(Boolean),
                      }
                    : p,
                )
              }
              placeholder="#hashtag1, #hashtag2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
