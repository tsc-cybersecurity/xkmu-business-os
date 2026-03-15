'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger'

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string | null;
  targetAudience: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

const typeLabels: Record<string, string> = {
  email: 'E-Mail',
  call: 'Anruf',
  sms: 'SMS',
  multi: 'Multi-Kanal',
};

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  paused: 'outline',
  completed: 'default',
  archived: 'outline',
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const response = await fetch(`/api/v1/marketing/campaigns?${params}`);
      const data = await response.json();
      if (data.success) setCampaigns(data.data);
    } catch (error) {
      logger.error('Failed to fetch campaigns', error, { module: 'MarketingPage' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async (id: string) => {
    if (!confirm('Kampagne wirklich loeschen?')) return;
    try {
      await fetch(`/api/v1/marketing/campaigns/${id}`, { method: 'DELETE' });
      toast.success('Kampagne geloescht');
      fetchCampaigns();
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="h-8 w-8" />
            Marketing
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Marketing-Kampagnen</p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/marketing/templates">
            <Button variant="outline">Vorlagen</Button>
          </Link>
          <Link href="/intern/marketing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Kampagne
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="paused">Pausiert</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="archived">Archiviert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="email">E-Mail</SelectItem>
            <SelectItem value="call">Anruf</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="multi">Multi-Kanal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Noch keine Kampagnen vorhanden
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Link href={`/intern/marketing/${campaign.id}`} className="hover:underline">
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[campaign.type] || campaign.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[campaign.status || 'draft']}>
                      {statusLabels[campaign.status || 'draft']}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.startDate
                      ? new Date(campaign.startDate).toLocaleDateString('de-DE')
                      : '-'}
                    {campaign.endDate &&
                      ` - ${new Date(campaign.endDate).toLocaleDateString('de-DE')}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.createdAt
                      ? new Date(campaign.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/intern/marketing/${campaign.id}`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Loeschen"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
