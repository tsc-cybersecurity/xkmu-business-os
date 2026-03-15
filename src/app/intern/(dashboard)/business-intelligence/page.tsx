'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Upload, Loader2, Trash2, FileText, Brain, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger'

interface BusinessDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractionStatus: string | null;
  extractedText: string | null;
  createdAt: string | null;
}

interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface BusinessProfile {
  id: string;
  companyName: string | null;
  industry: string | null;
  businessModel: string | null;
  swotAnalysis: SwotAnalysis | null;
  marketAnalysis: string | null;
  financialSummary: string | null;
  keyMetrics: Record<string, unknown> | null;
  recommendations: string | null;
  rawAnalysis: string | null;
  lastAnalyzedAt: string | null;
}

const statusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  processing: 'Verarbeitung...',
  completed: 'Extrahiert',
  failed: 'Fehlgeschlagen',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  failed: 'destructive',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function BusinessIntelligencePage() {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, profileRes] = await Promise.all([
        fetch('/api/v1/business-intelligence/documents?limit=50'),
        fetch('/api/v1/business-intelligence/profile'),
      ]);
      const docsData = await docsRes.json();
      const profileData = await profileRes.json();
      if (docsData.success) setDocuments(docsData.data);
      if (profileData.success) setProfile(profileData.data);
    } catch (error) {
      logger.error('Failed to fetch BI data', error, { module: 'BusinessIntelligencePage' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/v1/business-intelligence/documents', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`${file.name} hochgeladen`);
        } else {
          toast.error(data.error?.message || 'Upload fehlgeschlagen');
        }
      }
      fetchData();
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleExtract = async (doc: BusinessDocument) => {
    setExtracting(doc.id);
    try {
      const response = await fetch(`/api/v1/business-intelligence/documents/${doc.id}/extract`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Text erfolgreich extrahiert');
        fetchData();
      } else {
        toast.error(data.error?.message || 'Extraktion fehlgeschlagen');
      }
    } catch {
      toast.error('Extraktion fehlgeschlagen');
    } finally {
      setExtracting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich loeschen?')) return;
    try {
      await fetch(`/api/v1/business-intelligence/documents/${id}`, { method: 'DELETE' });
      toast.success('Dokument geloescht');
      fetchData();
    } catch {
      toast.error('Loeschen fehlgeschlagen');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/v1/business-intelligence/profile', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Analyse abgeschlossen');
        // Daten neu laden um sicherzustellen, dass das Profil korrekt angezeigt wird
        await fetchData();
      } else {
        toast.error(data.error?.message || 'Analyse fehlgeschlagen');
      }
    } catch {
      toast.error('Analyse fehlgeschlagen');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const extractedCount = documents.filter((d) => d.extractionStatus === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Laden Sie Geschaeftsdokumente hoch und lassen Sie ein KI-Profil erstellen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Hochladen...' : 'Dokument hochladen'}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.xls,.txt"
                multiple
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing || extractedCount === 0}>
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {analyzing ? 'Analysiere...' : 'KI-Analyse starten'}
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dokumente ({documents.length})
          </CardTitle>
          <CardDescription>
            {extractedCount} von {documents.length} Dokumenten extrahiert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dateiname</TableHead>
                <TableHead>Groesse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hochgeladen</TableHead>
                <TableHead className="w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Noch keine Dokumente hochgeladen
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.originalName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBytes(doc.sizeBytes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[doc.extractionStatus || 'pending']}>
                        {statusLabels[doc.extractionStatus || 'pending']}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.extractionStatus !== 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Text extrahieren"
                            aria-label="Text extrahieren"
                            onClick={() => handleExtract(doc)}
                            disabled={extracting === doc.id}
                          >
                            {extracting === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Loeschen"
                          aria-label="Loeschen"
                          onClick={() => handleDelete(doc.id)}
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
        </CardContent>
      </Card>

      {/* Business Profile */}
      {profile && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Unternehmensprofil</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.companyName && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Unternehmen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{profile.companyName}</p>
                  {profile.industry && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Branche: {profile.industry}
                    </p>
                  )}
                  {profile.businessModel && <p className="text-sm mt-2">{profile.businessModel}</p>}
                </CardContent>
              </Card>
            )}

            {profile.financialSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Finanzen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{profile.financialSummary}</p>
                  {profile.keyMetrics && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(profile.keyMetrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* SWOT Analysis */}
          {profile.swotAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SWOT-Analyse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                      Staerken
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(profile.swotAnalysis as SwotAnalysis).strengths?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                      Schwaechen
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(profile.swotAnalysis as SwotAnalysis).weaknesses?.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">Chancen</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(profile.swotAnalysis as SwotAnalysis).opportunities?.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-400 mb-2">
                      Risiken
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(profile.swotAnalysis as SwotAnalysis).threats?.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profile.marketAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Marktanalyse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{profile.marketAnalysis}</p>
              </CardContent>
            </Card>
          )}

          {profile.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Empfehlungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{profile.recommendations}</p>
              </CardContent>
            </Card>
          )}

          {/* Fallback: Rohe KI-Analyse anzeigen wenn keine strukturierten Felder */}
          {!profile.companyName && !profile.swotAnalysis && !profile.financialSummary && !profile.marketAnalysis && !profile.recommendations && profile.rawAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">KI-Analyse (Rohtext)</CardTitle>
                <CardDescription>Die strukturierte Auswertung konnte nicht extrahiert werden. Hier die vollstaendige KI-Antwort:</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{profile.rawAnalysis}</p>
              </CardContent>
            </Card>
          )}

          {profile.lastAnalyzedAt && (
            <p className="text-xs text-muted-foreground">
              Letzte Analyse: {new Date(profile.lastAnalyzedAt).toLocaleString('de-DE')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
