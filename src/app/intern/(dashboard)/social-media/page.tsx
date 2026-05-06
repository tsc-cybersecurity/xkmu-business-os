'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Share2, Plus, Loader2, Trash2, CalendarDays, Tags, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger'

interface Post {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  topicId: string | null;
  topicName: string | null;
  topicColor: string | null;
  status: string | null;
  hashtags: string[] | null;
  aiGenerated: boolean | null;
  scheduledAt: string | null;
  createdAt: string | null;
}

interface Topic {
  id: string;
  name: string;
  color: string | null;
}

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  xing: 'XING',
};

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  posted: 'Gepostet',
  failed: 'Fehlgeschlagen',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  scheduled: 'outline',
  posted: 'default',
  failed: 'destructive',
};

type SortField = 'createdAt' | 'platform' | 'topic' | 'status';
type SortDir = 'asc' | 'desc';

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [hidePosted, setHidePosted] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (topicFilter !== 'all') params.set('topicId', topicFilter);

      const [postsRes, topicsRes] = await Promise.all([
        fetch(`/api/v1/social-media/posts?${params}`),
        fetch('/api/v1/social-media/topics'),
      ]);
      const postsData = await postsRes.json();
      const topicsData = await topicsRes.json();
      if (postsData.success) setPosts(postsData.data);
      if (topicsData.success) setTopics(topicsData.data);
    } catch (error) {
      logger.error('Failed to fetch social media data', error, { module: 'SocialMediaPage' });
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter, topicFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Beitrag wirklich löschen?')) return;
    try {
      await fetch(`/api/v1/social-media/posts/${id}`, { method: 'DELETE' });
      toast.success('Beitrag gelöscht');
      fetchData();
    } catch {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Client-seitiger Filter "Gepostete ausblenden" — laeuft zusaetzlich zum
  // Server-Status-Filter, damit der User "alle Status" + "ohne Gepostete"
  // kombinieren kann (Server-Filter kennt nur einen einzelnen Status-Wert).
  const visiblePosts = hidePosted ? posts.filter((p) => p.status !== 'posted') : posts
  const postedCount = posts.filter((p) => p.status === 'posted').length

  const sortedPosts = [...visiblePosts].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'platform':
        return dir * (a.platform || '').localeCompare(b.platform || '');
      case 'topic':
        return dir * (a.topicName || '').localeCompare(b.topicName || '');
      case 'status':
        return dir * (a.status || '').localeCompare(b.status || '');
      case 'createdAt':
      default:
        return dir * ((a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-foreground' : 'text-muted-foreground/50'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Share2 className="h-8 w-8" />
            Social Media
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Social-Media-Beitraege</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/intern/social-media/topics">
            <Button variant="outline">
              <Tags className="h-4 w-4 mr-2" />
              Themen
            </Button>
          </Link>
          <Link href="/intern/social-media/content-plan">
            <Button variant="outline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Contentplan
            </Button>
          </Link>
          <Link href="/intern/social-media/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Beitrag
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Plattform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Plattformen</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="xing">XING</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="scheduled">Geplant</SelectItem>
            <SelectItem value="posted">Gepostet</SelectItem>
            <SelectItem value="failed">Fehlgeschlagen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Thema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Themen</SelectItem>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: topic.color || '#3b82f6' }}
                  />
                  {topic.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hidePosted}
            onChange={(e) => setHidePosted(e.target.checked)}
            className="h-4 w-4"
          />
          Gepostete ausblenden
          {postedCount > 0 && (
            <span className="text-xs text-muted-foreground">({postedCount})</span>
          )}
        </label>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader field="platform">Plattform</SortHeader>
              </TableHead>
              <TableHead>Inhalt</TableHead>
              <TableHead>
                <SortHeader field="topic">Thema</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="status">Status</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="createdAt">Erstellt</SortHeader>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Noch keine Beitraege vorhanden
                </TableCell>
              </TableRow>
            ) : (
              sortedPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {platformLabels[post.platform] || post.platform}
                      </Badge>
                      {post.aiGenerated && <Badge variant="secondary">KI</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <Link
                      href={`/intern/social-media/${post.id}`}
                      className="block hover:text-primary transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {post.title || post.content.substring(0, 60)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {post.content.substring(0, 150)}
                      </p>
                    </Link>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                        {post.hashtags.join(' ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {post.topicName ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: post.topicColor || '#3b82f6' }}
                        />
                        <span className="text-sm">{post.topicName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[post.status || 'draft']}>
                      {statusLabels[post.status || 'draft']}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Löschen"
                      aria-label="Löschen"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
