'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Trash2, Plus, Brain, Save } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger'

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string | null;
  targetAudience: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface Task {
  id: string;
  type: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientCompany: string | null;
  subject: string | null;
  content: string | null;
  status: string | null;
  createdAt: string | null;
}

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
};

const taskStatusLabels: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  sent: 'Gesendet',
  failed: 'Fehlgeschlagen',
};

const typeLabels: Record<string, string> = {
  email: 'E-Mail',
  call: 'Anruf',
  sms: 'SMS',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genForm, setGenForm] = useState({
    type: 'email' as string,
    recipientName: '',
    recipientCompany: '',
    tone: 'professional',
    context: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [campaignRes, tasksRes] = await Promise.all([
        fetch(`/api/v1/marketing/campaigns/${id}`),
        fetch(`/api/v1/marketing/campaigns/${id}/tasks`),
      ]);
      const campaignData = await campaignRes.json();
      const tasksData = await tasksRes.json();
      if (campaignData.success) setCampaign(campaignData.data);
      if (tasksData.success) setTasks(tasksData.data);
    } catch (error) {
      logger.error('Failed to fetch campaign', error, { module: 'MarketingPage' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/marketing/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          targetAudience: campaign.targetAudience,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Kampagne gespeichert');
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern');
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!campaign) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/marketing/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm),
      });
      const data = await response.json();
      if (data.success) {
        // Create a task with the generated content
        const taskRes = await fetch('/api/v1/marketing/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: id,
            type: genForm.type,
            recipientName: genForm.recipientName || undefined,
            recipientCompany: genForm.recipientCompany || undefined,
            subject: data.data.subject,
            content: data.data.content,
            status: 'draft',
          }),
        });
        const taskData = await taskRes.json();
        if (taskData.success) {
          toast.success('KI-Inhalt generiert und Task erstellt');
          setShowGenDialog(false);
          fetchData();
        }
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen');
      }
    } catch {
      toast.error('Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Task wirklich loeschen?')) return;
    try {
      await fetch(`/api/v1/marketing/tasks/${taskId}`, { method: 'DELETE' });
      toast.success('Task geloescht');
      fetchData();
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

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Kampagne nicht gefunden</p>
        <Link href="/intern/marketing">
          <Button variant="link">Zurueck zur Uebersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/intern/marketing">
            <Button variant="ghost" size="icon" aria-label="Zurueck">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground mt-1">
              {typeLabels[campaign.type] || campaign.type} Kampagne
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Speichern
        </Button>
      </div>

      {/* Campaign Edit */}
      <Card>
        <CardHeader>
          <CardTitle>Kampagnen-Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={campaign.name}
                onChange={(e) => setCampaign((c) => (c ? { ...c, name: e.target.value } : c))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={campaign.status || 'draft'}
                onValueChange={(v) => setCampaign((c) => (c ? { ...c, status: v } : c))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={campaign.description || ''}
              onChange={(e) => setCampaign((c) => (c ? { ...c, description: e.target.value } : c))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Zielgruppe</Label>
            <Textarea
              value={campaign.targetAudience || ''}
              onChange={(e) =>
                setCampaign((c) => (c ? { ...c, targetAudience: e.target.value } : c))
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks ({tasks.length})</CardTitle>
              <CardDescription>Einzelaufgaben dieser Kampagne</CardDescription>
            </div>
            <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Brain className="h-4 w-4 mr-2" />
                  KI-Inhalt generieren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>KI-Inhalt generieren</DialogTitle>
                  <DialogDescription>
                    Lassen Sie die KI Marketing-Inhalte erstellen
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select
                      value={genForm.type}
                      onValueChange={(v) => setGenForm((f) => ({ ...f, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">E-Mail</SelectItem>
                        <SelectItem value="call">Anruf-Skript</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Empfaenger-Name</Label>
                    <Input
                      value={genForm.recipientName}
                      onChange={(e) => setGenForm((f) => ({ ...f, recipientName: e.target.value }))}
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <Input
                      value={genForm.recipientCompany}
                      onChange={(e) =>
                        setGenForm((f) => ({ ...f, recipientCompany: e.target.value }))
                      }
                      placeholder="Musterfirma GmbH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tonalitaet</Label>
                    <Select
                      value={genForm.tone}
                      onValueChange={(v) => setGenForm((f) => ({ ...f, tone: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professionell</SelectItem>
                        <SelectItem value="casual">Locker</SelectItem>
                        <SelectItem value="persuasive">Ueberzeugend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kontext / Ziel</Label>
                    <Textarea
                      value={genForm.context}
                      onChange={(e) => setGenForm((f) => ({ ...f, context: e.target.value }))}
                      placeholder="Was soll mit dem Inhalt erreicht werden?"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleGenerate} disabled={generating} className="w-full">
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    {generating ? 'Generiere...' : 'Generieren'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Empfaenger</TableHead>
                <TableHead>Betreff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Noch keine Tasks vorhanden. Nutzen Sie die KI-Generierung!
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[task.type] || task.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.recipientName || task.recipientEmail || '-'}
                      {task.recipientCompany && (
                        <span className="text-muted-foreground"> ({task.recipientCompany})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {task.subject || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'sent' ? 'default' : 'secondary'}>
                        {taskStatusLabels[task.status || 'draft']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Loeschen"
                        aria-label="Loeschen"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
