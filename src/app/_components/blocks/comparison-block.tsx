'use client'

import { Check, X, Minus } from 'lucide-react'

interface ComparisonColumn {
  name: string
  highlighted?: boolean
}

interface ComparisonRow {
  feature: string
  values: string[]
}

interface ComparisonBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: ComparisonColumn[]
  rows?: ComparisonRow[]
}

function CellValue({ value }: { value: string }) {
  if (value === 'true' || value === 'ja' || value === '✓')
    return <Check className="h-5 w-5 text-green-600 mx-auto" />
  if (value === 'false' || value === 'nein' || value === '✗')
    return <X className="h-5 w-5 text-red-400 mx-auto" />
  if (value === '-' || value === '')
    return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  return <span className="text-sm">{value}</span>
}

export function ComparisonBlock({
  content,
}: {
  content: ComparisonBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, columns = [], rows = [] } = content

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-5xl">
        {(sectionTitle || sectionSubtitle) && (
          <div className="text-center mb-12">
            {sectionTitle && (
              <h2 className="text-3xl font-bold mb-3">{sectionTitle}</h2>
            )}
            {sectionSubtitle && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {sectionSubtitle}
              </p>
            )}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2">
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Feature
                </th>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`p-4 text-center font-semibold ${
                      col.highlighted
                        ? 'bg-[var(--brand-50)] dark:bg-[var(--brand-900)]/20 text-[var(--brand-700)] dark:text-[var(--brand-400)]'
                        : ''
                    }`}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={i < rows.length - 1 ? 'border-b' : ''}
                >
                  <td className="p-4 font-medium">{row.feature}</td>
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`p-4 text-center ${
                        col.highlighted
                          ? 'bg-[var(--brand-50)]/50 dark:bg-[var(--brand-900)]/10'
                          : ''
                      }`}
                    >
                      <CellValue value={row.values?.[j] || '-'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
