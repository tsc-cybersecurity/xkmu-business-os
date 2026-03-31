'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

export interface FaqBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  items?: FaqItem[]
}

export function FaqBlock({
  content,
}: {
  content: FaqBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, items = [] } = content
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-3xl">
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
        <div className="space-y-2">
          {items.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i} className="rounded-lg border-2">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 ml-4 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
