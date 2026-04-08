'use client'

import { Breadcrumbs } from './breadcrumbs'

export function Header() {
  return (
    <header className="flex h-14 items-center border-b bg-card px-6">
      <Breadcrumbs />
    </header>
  )
}
