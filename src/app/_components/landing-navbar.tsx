'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
/* eslint-disable @next/next/no-img-element */

const navItems = [
  { name: 'Cyber Security', href: '#cyber-security' },
  { name: 'KI & Automation', href: '#ki-automation' },
  { name: 'IT Consulting', href: '#it-consulting' },
  { name: 'IT-News', href: '#it-news' },
]

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[100px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <img
            src="https://www.xkmu.de/xkmu_q_gross_slogan.png"
            alt="xKMU"
            className="h-16 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.name}
            </Link>
          ))}
          <Link href="/kontakt">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              Kontakt
            </Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-gray-700 dark:text-gray-300"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 shadow-lg">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 py-2 border-b border-gray-100 dark:border-slate-800"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link href="/kontakt" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                Kontakt
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
