'use client'

import Image from 'next/image'

interface LogoItem {
  name: string
  image?: string
  href?: string
}

interface LogoCloudBlockContent {
  sectionTitle?: string
  sectionSubtitle?: string
  items?: LogoItem[]
}

export function LogoCloudBlock({
  content,
}: {
  content: LogoCloudBlockContent
  settings: Record<string, unknown>
}) {
  const { sectionTitle, sectionSubtitle, items = [] } = content

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        {(sectionTitle || sectionSubtitle) && (
          <div className="text-center mb-10">
            {sectionTitle && (
              <h2 className="text-xl font-semibold mb-2 text-muted-foreground">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle && (
              <p className="text-sm text-muted-foreground">
                {sectionSubtitle}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {items.map((item, i) => {
            const inner = item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={140}
                height={40}
                className="h-8 md:h-10 max-w-[140px] object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
                unoptimized
              />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground/50 hover:text-foreground transition-colors">
                {item.name}
              </span>
            )

            if (item.href) {
              return (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  {inner}
                </a>
              )
            }
            return (
              <div key={i} className="shrink-0">
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
