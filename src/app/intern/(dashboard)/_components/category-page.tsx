'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CategoryItem {
  name: string
  href: string
  description?: string
  icon?: LucideIcon
}

interface CategoryPageProps {
  title: string
  description: string
  icon: LucideIcon
  items: CategoryItem[]
}

export function CategoryPage({ title, description, icon: Icon, items }: CategoryPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const ItemIcon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-accent/50 hover:border-primary/30">
                <CardContent className="flex items-center gap-4 py-5">
                  {ItemIcon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <ItemIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
