'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string;
  isDefault: boolean | null;
  createdAt: string | null;
}

const typeLabels: Record<string, string> = {
  email: 'E-Mail',
  call: 'Anruf',
  sms: 'SMS',
};

export default function MarketingTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'email',
    subject: '',
    content: '',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/marketing/templates?limit=50');
      const data = await response.json();
      if (data.success) setTemplates(data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error('Name und Inhalt sind erforderlich');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/v1/marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Vorlage erstellt');
        setShowDialog(false);
        setForm({ name: '', type: 'email', subject: '', content: '' });
        fetchTemplates();
      } else {
        toast.error(data.error?.message || 'Fehler beim Erstellen');
      }
    } catch {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vorlage wirklich loeschen?')) return;
    try {
      await fetch(`/api/v1/marketing/templates/${id}`, { method: 'DELETE' });
      toast.success('Vorlage geloescht');
      fetchTemplates();
    } catch {
      toast.error('Loeschen fehlgeschlagen');
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
          <Link href="/intern/marketing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Vorlagen
            </h1>
            <p className="text-muted-foreground mt-1">Wiederverwendbare Marketing-Vorlagen</p>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Vorlage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Vorlage erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Vorlagenname"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="call">Anruf</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Betreff</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Betreffzeile"
                />
              </div>
              <div className="space-y-2">
                <Label>Inhalt *</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Vorlagen-Inhalt"
                  rows={6}
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vorlage erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8 text-muted-foreground">
              Noch keine Vorlagen vorhanden
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{typeLabels[template.type] || template.type}</Badge>
                    {!template.isDefault && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <p className="text-sm font-medium mb-2">Betreff: {template.subject}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-4">{template.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
