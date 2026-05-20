/**
 * BusinessPlanPDF — @react-pdf/renderer-Komponente fuer Plan-Export.
 * Wird serverseitig von pdf-export.service.ts via renderToBuffer
 * gerendert; lebt deshalb in components/, nicht in app/_components/.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  canvasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  canvasBox: {
    width: '33.33%',
    padding: 6,
  },
  canvasBoxFull: {
    width: '100%',
    padding: 6,
  },
  canvasBoxHalf: {
    width: '50%',
    padding: 6,
  },
  canvasBoxInner: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 6,
    minHeight: 60,
  },
  canvasBoxTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  canvasItem: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  scoreBox: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface CanvasPlan {
  problem?: string[]
  solution?: string[]
  keyMetrics?: string[]
  uniqueValueProposition?: string
  unfairAdvantage?: string[]
  channels?: string[]
  customerSegments?: string[]
  costStructure?: string[]
  revenueStreams?: string[]
}

interface Analysis {
  score?: number
  reasoning?: string
  strengths?: string[]
  weaknesses?: string[]
  improvements?: string[]
}

export interface BusinessPlanPDFProps {
  title: string
  mode: 'canvas' | 'kfw' | 'both'
  status: string
  finalScore: number | null
  scoreThreshold: number
  currentIteration: number
  maxIterations: number
  createdAt: string | null
  canvas?: CanvasPlan | null
  kfwMarkdown?: string | null
  analysis?: Analysis | null
  organizationName?: string
}

function CanvasBox({ title, items, width = 'third' }: { title: string; items?: string[] | string; width?: 'third' | 'half' | 'full' }) {
  const list = Array.isArray(items) ? items : items ? [items] : []
  const wrapStyle =
    width === 'full' ? styles.canvasBoxFull : width === 'half' ? styles.canvasBoxHalf : styles.canvasBox
  return (
    <View style={wrapStyle}>
      <View style={styles.canvasBoxInner}>
        <Text style={styles.canvasBoxTitle}>{title}</Text>
        {list.length === 0 ? (
          <Text style={[styles.canvasItem, { color: '#9ca3af', fontStyle: 'italic' }]}>–</Text>
        ) : (
          list.map((it, i) => (
            <Text key={i} style={styles.canvasItem}>• {it}</Text>
          ))
        )}
      </View>
    </View>
  )
}

// Sehr einfacher Markdown → Plain-Text-Render fuer KfW-Plan. Wir splitten
// nach H2 (## …), behandeln Bold (**text**) als plain text und werfen Listen-
// Markup raus. Fuer den Export reicht das — Anspruch ist nicht voll markdown-
// renderable, sondern lesbare Langform.
function renderKfwMarkdown(md: string) {
  const lines = md.split('\n')
  const out: Array<{ kind: 'h2' | 'p'; text: string }> = []
  let buf = ''
  const flush = () => {
    const t = buf.trim()
    if (t) out.push({ kind: 'p', text: t })
    buf = ''
  }
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[-*]\s+/, '• ')
    if (line.startsWith('## ')) {
      flush()
      out.push({ kind: 'h2', text: line.slice(3).trim() })
    } else if (line.trim() === '') {
      flush()
    } else {
      buf += (buf ? ' ' : '') + line.trim()
    }
  }
  flush()
  return out
}

export function BusinessPlanPDF(props: BusinessPlanPDFProps) {
  const {
    title, mode, status, finalScore, scoreThreshold,
    currentIteration, maxIterations, createdAt, canvas, kfwMarkdown, analysis,
    organizationName,
  } = props

  const showCanvas = (mode === 'canvas' || mode === 'both') && canvas
  const showKfw = (mode === 'kfw' || mode === 'both') && kfwMarkdown
  const kfwBlocks = kfwMarkdown ? renderKfwMarkdown(kfwMarkdown) : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.metaRow}>
            <Text>Status: {status}</Text>
            <Text>Mode: {mode}</Text>
            <Text>
              Iteration {currentIteration}/{maxIterations}
            </Text>
          </View>
          {createdAt && (
            <View style={styles.metaRow}>
              <Text>Angelegt: {new Date(createdAt).toLocaleString('de-DE')}</Text>
              {organizationName && <Text>{organizationName}</Text>}
            </View>
          )}

          <View style={styles.scoreBox}>
            <View style={styles.scoreRow}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Score</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {finalScore !== null ? `${finalScore}/100` : '–'}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={{ color: '#6b7280' }}>Ziel-Schwelle</Text>
              <Text style={{ color: '#6b7280' }}>{scoreThreshold}</Text>
            </View>
          </View>
        </View>

        {showCanvas && (
          <View>
            <Text style={styles.sectionTitle}>Lean Canvas</Text>
            <View style={styles.canvasGrid}>
              <CanvasBox title="Problem" items={canvas.problem} />
              <CanvasBox title="Lösung" items={canvas.solution} />
              <CanvasBox title="Schlüsselmetriken" items={canvas.keyMetrics} />
              <CanvasBox title="Wertversprechen (UVP)" items={canvas.uniqueValueProposition} width="full" />
              <CanvasBox title="Unfair Advantage" items={canvas.unfairAdvantage} />
              <CanvasBox title="Kanäle" items={canvas.channels} />
              <CanvasBox title="Kundensegmente" items={canvas.customerSegments} />
              <CanvasBox title="Kostenstruktur" items={canvas.costStructure} width="half" />
              <CanvasBox title="Einnahmequellen" items={canvas.revenueStreams} width="half" />
            </View>
          </View>
        )}

        {analysis && (
          <View>
            <Text style={styles.sectionTitle}>KI-Analyse der letzten Iteration</Text>
            {analysis.reasoning && <Text style={styles.paragraph}>{analysis.reasoning}</Text>}
            {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
              <>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 6 }}>Stärken</Text>
                {analysis.strengths.map((s, i) => <Text key={i} style={styles.canvasItem}>• {s}</Text>)}
              </>
            )}
            {Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0 && (
              <>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 6 }}>Schwächen</Text>
                {analysis.weaknesses.map((s, i) => <Text key={i} style={styles.canvasItem}>• {s}</Text>)}
              </>
            )}
            {Array.isArray(analysis.improvements) && analysis.improvements.length > 0 && (
              <>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 6 }}>Verbesserungsvorschläge</Text>
                {analysis.improvements.map((s, i) => <Text key={i} style={styles.canvasItem}>• {s}</Text>)}
              </>
            )}
          </View>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {showKfw && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>KfW-Langform-Plan</Text>
          {kfwBlocks.map((block, i) =>
            block.kind === 'h2' ? (
              <Text key={i} style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 }}>
                {block.text}
              </Text>
            ) : (
              <Text key={i} style={styles.paragraph}>{block.text}</Text>
            ),
          )}
          <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  )
}
