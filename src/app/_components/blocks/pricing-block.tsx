'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'

interface PricingPlan {
  name: string
  price: string
  period?: string
  description?: string
  features?: string[]
  buttonLabel?: string
  buttonHref?: string
  highlighted?: boolean
}

export interface PricingBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  plans?: PricingPlan[]
}

export function PricingBlock({
  content,
}: {
  content: PricingBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, plans = [] } = content

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-6xl">
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
        <div
          className={`grid grid-cols-1 gap-6 ${
            plans.length === 2
              ? 'md:grid-cols-2 max-w-4xl mx-auto'
              : plans.length >= 3
                ? 'md:grid-cols-2 lg:grid-cols-3'
                : 'max-w-md mx-auto'
          }`}
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-xl border-2 p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-[var(--brand-600)] shadow-lg shadow-[var(--brand-600)]/10 scale-[1.02]'
                  : 'border-border'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--brand-600)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Empfohlen
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground ml-1">
                    /{plan.period}
                  </span>
                )}
              </div>
              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-[var(--brand-600)] shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              {plan.buttonLabel && (
                <Link
                  href={plan.buttonHref || '#'}
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white'
                      : 'border-2 border-border hover:bg-muted'
                  }`}
                >
                  {plan.buttonLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
