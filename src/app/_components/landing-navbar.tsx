'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, X, User, LogOut, Type, Palette, RectangleHorizontal, LayoutDashboard } from 'lucide-react'
import { useDesign, type FontId, type AccentId, type RadiusId } from './design-provider'
interface SessionUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface NavItemData {
  name: string
  href: string
  openInNewTab?: boolean
}

function getUserInitials(user: SessionUser) {
  const first = user.firstName?.[0] ?? ''
  const last = user.lastName?.[0] ?? ''
  return (first + last).toUpperCase() || user.email[0].toUpperCase()
}

function getUserDisplayName(user: SessionUser) {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return user.email
}

const DEFAULT_LOGO_URL = 'https://www.xkmu.de/xkmu_q_gross_slogan.png'
const DEFAULT_LOGO_ALT = 'xKMU'

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [navItems, setNavItems] = useState<NavItemData[]>([])
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL)
  const [logoAlt, setLogoAlt] = useState(DEFAULT_LOGO_ALT)
  const [headerSticky, setHeaderSticky] = useState(true)
  const {
    font, setFont, fontOptions,
    accent, setAccent, accentOptions,
    radius, setRadius, radiusOptions,
  } = useDesign()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user) setUser(data.data.user)
      })
      .catch(() => {})

    fetch('/api/v1/public/navigation?location=header')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data?.length > 0) {
          setNavItems(data.data.map((item: { label: string; href: string; openInNewTab: boolean }) => ({
            name: item.label,
            href: item.href,
            openInNewTab: item.openInNewTab,
          })))
        }
      })
      .catch(() => {})

    fetch('/api/v1/public/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          setLogoUrl(data.data.logoUrl || DEFAULT_LOGO_URL)
          setLogoAlt(data.data.logoAlt || DEFAULT_LOGO_ALT)
          if (data.data.headerSticky === false) setHeaderSticky(false)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
  }

  return (
    <header className={`${headerSticky ? 'fixed' : 'relative'} top-0 left-0 right-0 z-50 h-[100px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-sm`}>
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src={logoUrl}
            alt={logoAlt}
            width={200}
            height={64}
            className="h-16 w-auto"
            unoptimized
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] transition-colors"
            >
              {item.name}
            </Link>
          ))}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="cursor-pointer">
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{getUserDisplayName(user)}</div>
                  {(user.firstName || user.lastName) && (
                    <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/intern/dashboard">
                    <LayoutDashboard className="size-4" />
                    BusinessOS Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/intern/settings">
                    <User className="size-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Type className="size-4" />
                    Schriftart
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={font} onValueChange={(v) => setFont(v as FontId)}>
                      {fontOptions.map((opt) => (
                        <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="size-4" />
                    Akzentfarbe
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={accent} onValueChange={(v) => setAccent(v as AccentId)}>
                      {accentOptions.map((opt) => (
                        <DropdownMenuRadioItem key={opt.id} value={opt.id} className="gap-2">
                          <span
                            className="inline-block size-3 rounded-full shrink-0"
                            style={{ background: opt.color }}
                          />
                          {opt.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <RectangleHorizontal className="size-4" />
                    Ecken-Radius
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={radius} onValueChange={(v) => setRadius(v as RadiusId)}>
                      {radiusOptions.map((opt) => (
                        <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/kontakt">
              <Button className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white px-6">
                Kontakt
              </Button>
            </Link>
          )}
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
                {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--brand-600)] py-2 border-b border-gray-100 dark:border-slate-800"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {user ? (
              <>
                <div className="py-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <Link
                  href="/intern/dashboard"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--brand-600)] py-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="size-4" />
                  BusinessOS Dashboard
                </Link>
                <Link
                  href="/intern/settings"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--brand-600)] py-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <User className="size-4" />
                  Profil
                </Link>
                {/* Font */}
                <div className="py-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Type className="size-3" />
                    Schriftart
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fontOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFont(opt.id)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          font === opt.id
                            ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]'
                            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-[var(--brand-400)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Accent */}
                <div className="py-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Palette className="size-3" />
                    Akzentfarbe
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accentOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAccent(opt.id)}
                        className={`size-8 rounded-full border-2 transition-all ${
                          accent === opt.id
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ background: opt.color }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
                {/* Radius */}
                <div className="py-2 border-b border-gray-100 dark:border-slate-800">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <RectangleHorizontal className="size-3" />
                    Ecken-Radius
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {radiusOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setRadius(opt.id)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          radius === opt.id
                            ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]'
                            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-[var(--brand-400)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    handleLogout()
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-700 py-2 flex items-center gap-2 mt-1"
                >
                  <LogOut className="size-4" />
                  Abmelden
                </button>
              </>
            ) : (
              <Link href="/kontakt" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white mt-2">
                  Kontakt
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
