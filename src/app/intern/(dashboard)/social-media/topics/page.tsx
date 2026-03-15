'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, Pencil, Tags, CalendarDays, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger'

interface Topic {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string | null;
}

export default function SocialMediaTopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generateCount, setGenerateCount] = useState(5);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/social-media/topics');
      const data = await response.json();
      if (data.success) setTopics(data.data);
    } catch (error) {
      logger.error('Failed to fetch topics', error, { module: 'SocialMediaTopicsPage' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/v1/social-media/topics/${editingId}`
        : '/api/v1/social-media/topics';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(editingId ? 'Thema aktualisiert' : 'Thema erstellt');
        setShowDialog(false);
        setEditingId(null);
        setForm({ name: '', description: '', color: '#3b82f6' });
        fetchTopics();
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern');
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setForm({
      name: topic.name,
      description: topic.description || '',
      color: topic.color || '#3b82f6',
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Thema wirklich loeschen?')) return;
    try {
      await fetch(`/api/v1/social-media/topics/${id}`, { method: 'DELETE' });
      toast.success('Thema geloescht');
      fetchTopics();
    } catch {
      toast.error('Loeschen fehlgeschlagen');
    }
  };

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setEditingId(null);
      setForm({ name: '', description: '', color: '#3b82f6' });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/social-media/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: generateCount }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${data.data.length} Themen generiert`);
        setShowGenerateDialog(false);
        fetchTopics();
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen');
      }
    } catch {
      toast.error('Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Tags className="h-8 w-8" />
              Themen
            </h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Content-Themen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                KI-Themen generieren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Themen aus Unternehmensprofil generieren</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Die KI generiert Themenvorschlaege basierend auf Ihrem Business-Intelligence-Profil
                  (Branche, Geschaeftsmodell, Zielgruppe, Staerken).
                </p>
                <div className="space-y-2">
                  <Label>Anzahl Themen</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 5)}
                  />
                </div>
                <Button onClick={handleGenerate} disabled={generating} className="w-full">
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {generating ? 'Generiere Themen...' : 'Themen generieren'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showDialog} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neues Thema
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Thema bearbeiten' : 'Neues Thema erstellen'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Themenname"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optionale Beschreibung"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Farbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      placeholder="#3b82f6"
                      className="w-32"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8 text-muted-foreground">
              Noch keine Themen vorhanden
            </CardContent>
          </Card>
        ) : (
          topics.map((topic) => (
            <Card key={topic.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: topic.color || '#3b82f6' }}
                    />
                    <CardTitle className="text-base">{topic.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(topic)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(topic.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {topic.description && (
                  <p className="text-sm text-muted-foreground mb-3">{topic.description}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/intern/social-media/content-plan?topicId=${topic.id}&topic=${encodeURIComponent(topic.name)}`)}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Contentplan erstellen
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
