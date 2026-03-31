'use client'

import Image from 'next/image'
import { iconMap } from '@/lib/utils/icon-map'

interface TeamMember {
  name: string
  role?: string
  image?: string
  bio?: string
  links?: Array<{ icon?: string; href: string }>
}

export interface TeamBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  columns?: 2 | 3 | 4
  items?: TeamMember[]
}

export function TeamBlock({
  content,
}: {
  content: TeamBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, columns = 3, items = [] } = content

  const gridCols =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3'

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
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {items.map((member, i) => (
            <div key={i} className="text-center group">
              <div className="mb-4 relative mx-auto w-32 h-32 rounded-full overflow-hidden bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    fill
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                    {member.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold">{member.name}</h3>
              {member.role && (
                <p className="text-sm text-[var(--brand-600)] dark:text-[var(--brand-400)] font-medium mb-2">
                  {member.role}
                </p>
              )}
              {member.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.bio}
                </p>
              )}
              {member.links && member.links.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {member.links.map((link, j) => {
                    const Icon =
                      iconMap[link.icon as keyof typeof iconMap] || iconMap.Globe
                    return (
                      <a
                        key={j}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} – ${link.icon || 'Link'}`}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
