'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Brain,
  Globe,
  Loader2,
  Search,
  Share2,
  Target,
  TrendingUp,
  Sparkles,
  Copy,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Lightbulb,
  Hash,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface MarketingResearch {
  companyName: string
  industry: string
  targetAudience: string
  uniqueSellingPoints: string[]
  competitors: string[]
  keyProducts: string[]
  brandTone: string
  summary: string
}

interface SeoAnalysis {
  primaryKeywords: string[]
  secondaryKeywords: string[]
  contentGaps: string[]
  metaDescriptionSuggestion: string
  searchVisibilityScore: number
  recommendations: string[]
}

interface SocialMediaDraft {
  platform: string
  title: string
  content: string
  hashtags: string[]
  callToAction: string
}

interface AgentResult {
  research: MarketingResearch
  seoAnalysis: SeoAnalysis
  socialMediaDrafts: SocialMediaDraft[]
  executiveSummary: string
  scrapedUrl: string
  scrapedPagesCount: number
}

// ============================================
// Platform Config
// ============================================

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'xing', label: 'XING' },
]

const TONES = [
  { value: 'professional', label: 'Professionell' },
  { value: 'casual', label: 'Locker' },
  { value: 'humorous', label: 'Humorvoll' },
  { value: 'inspirational', label: 'Inspirierend' },
]

const platformIcons: Record<string, string> = {
  linkedin: 'in',
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  xing: 'X',
}

// ============================================
// Component
// ============================================

export default function MarketingAgentPage() {
  const [url, setUrl] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter', 'instagram'])
  const [tone, setTone] = useState('professional')
  const [additionalContext, setAdditionalContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Bitte geben Sie eine URL ein')
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Bitte waehlen Sie mindestens eine Plattform')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/v1/marketing/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          language: 'de',
          platforms: selectedPlatforms,
          tone,
          additionalContext: additionalContext.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        toast.success('Marketing-Analyse abgeschlossen!')
      } else {
        toast.error(data.error?.message || 'Analyse fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler bei der Analyse. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success('In Zwischenablage kopiert')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const saveDraftAsPost = async (draft: SocialMediaDraft) => {
    try {
      const response = await fetch('/api/v1/social-media/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: draft.platform,
          title: draft.title,
          content: draft.content,
          hashtags: draft.hashtags,
          status: 'draft',
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`${draft.platform}-Post als Entwurf gespeichert`)
      } else {
        toast.error(data.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/marketing">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              AI Marketing Agent
            </h1>
            <p className="text-muted-foreground">
              URL eingeben — KI analysiert und erstellt Marketing-Content
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website analysieren
          </CardTitle>
          <CardDescription>
            Der AI Marketing Agent scraped die Website, analysiert Positionierung,
            SEO und erstellt Social-Media-Entwuerfe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">Website-URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.beispiel.de"
                disabled={loading}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Plattformen</Label>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(p => (
                <label
                  key={p.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(p.value)}
                    onCheckedChange={() => togglePlatform(p.value)}
                    disabled={loading}
                  />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label>Ton</Label>
            <Select value={tone} onValueChange={setTone} disabled={loading}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Zusaetzlicher Kontext (optional)</Label>
            <Textarea
              id="context"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="z.B. Fokus auf bestimmtes Produkt, aktuelle Kampagne, Zielgruppe..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse laeuft... (ca. 30-60 Sek.)
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyse starten
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Executive Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{result.executiveSummary}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.scrapedPagesCount} Seite(n) gescraped von {result.scrapedUrl}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="research" className="w-full">
            <TabsList>
              <TabsTrigger value="research">
                <Search className="h-4 w-4 mr-1" />
                Research
              </TabsTrigger>
              <TabsTrigger value="seo">
                <TrendingUp className="h-4 w-4 mr-1" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="content">
                <Share2 className="h-4 w-4 mr-1" />
                Social Media
              </TabsTrigger>
            </TabsList>

            {/* Research Tab */}
            <TabsContent value="research" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Company Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Unternehmensprofil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Unternehmen</p>
                      <p className="font-medium">{result.research.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branche</p>
                      <p>{result.research.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zielgruppe</p>
                      <p>{result.research.targetAudience}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Marken-Ton</p>
                      <p>{result.research.brandTone}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Zusammenfassung
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.research.summary}</p>
                  </CardContent>
                </Card>
              </div>

              {/* USPs */}
              {result.research.uniqueSellingPoints.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Unique Selling Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.research.uniqueSellingPoints.map((usp, i) => (
                        <Badge key={i} variant="secondary" className="whitespace-normal">
                          {usp}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Products */}
                {result.research.keyProducts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Produkte / Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.research.keyProducts.map((p, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Competitors */}
                {result.research.competitors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Wettbewerber</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.research.competitors.map((c, i) => (
                          <Badge key={i} variant="outline">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-4">
              {/* Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative h-24 w-24 shrink-0">
                      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke="currentColor" strokeWidth="8" fill="none"
                          strokeDasharray={`${result.seoAnalysis.searchVisibilityScore * 2.51} 251`}
                          className={
                            result.seoAnalysis.searchVisibilityScore >= 70 ? 'text-green-500' :
                            result.seoAnalysis.searchVisibilityScore >= 40 ? 'text-yellow-500' :
                            'text-red-500'
                          }
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                        {result.seoAnalysis.searchVisibilityScore}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">SEO & AI-Search-Visibility Score</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.seoAnalysis.metaDescriptionSuggestion}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Keywords */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Primaere Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.seoAnalysis.primaryKeywords.map((kw, i) => (
                        <Badge key={i} className="bg-primary/10 text-primary hover:bg-primary/20">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    {result.seoAnalysis.secondaryKeywords.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Sekundaer</p>
                        <div className="flex flex-wrap gap-1">
                          {result.seoAnalysis.secondaryKeywords.map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Content Gaps */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Content-Luecken
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.seoAnalysis.contentGaps.map((gap, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {result.seoAnalysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Empfehlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.seoAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-500 font-bold mt-0.5">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Social Media Content Tab */}
            <TabsContent value="content" className="space-y-4">
              {result.socialMediaDrafts.map((draft, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-bold">
                          {platformIcons[draft.platform] || draft.platform[0]}
                        </span>
                        {PLATFORMS.find(p => p.value === draft.platform)?.label || draft.platform}
                        {draft.title && (
                          <span className="text-muted-foreground font-normal">
                            — {draft.title}
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex gap-2 self-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(draft.content, index)}
                        >
                          {copiedIndex === index ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <Copy className="mr-1 h-3 w-3" />
                          )}
                          Kopieren
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => saveDraftAsPost(draft)}
                        >
                          <Share2 className="mr-1 h-3 w-3" />
                          Als Entwurf speichern
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="whitespace-pre-wrap text-sm">{draft.content}</p>
                    </div>

                    {draft.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {draft.hashtags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {draft.callToAction && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Call-to-Action: </span>
                        <span className="font-medium">{draft.callToAction}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
