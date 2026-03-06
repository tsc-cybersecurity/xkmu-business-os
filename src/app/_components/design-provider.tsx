'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// ── Font ──────────────────────────────────────────────────────────────────────

const FONT_KEY = 'xkmu-font'
const DEFAULT_FONT = 'ubuntu'

export const fontOptions = [
  { id: 'ubuntu', label: 'Ubuntu', variable: 'var(--font-ubuntu)' },
  { id: 'geist', label: 'Geist', variable: 'var(--font-geist)' },
  { id: 'inter', label: 'Inter', variable: 'var(--font-inter)' },
  { id: 'roboto', label: 'Roboto', variable: 'var(--font-roboto)' },
  { id: 'montserrat', label: 'Montserrat', variable: 'var(--font-montserrat)' },
  { id: 'times', label: 'Times New Roman', variable: '"Times New Roman", Times, serif' },
] as const

export type FontId = (typeof fontOptions)[number]['id']

function applyFont(fontId: FontId) {
  const option = fontOptions.find((f) => f.id === fontId)
  if (option) {
    document.body.style.setProperty('--active-font', option.variable)
  }
}

// ── Accent Color ──────────────────────────────────────────────────────────────

const ACCENT_KEY = 'xkmu-accent'
const DEFAULT_ACCENT = 'blue'

export const accentOptions = [
  {
    id: 'blue',
    label: 'Blau',
    color: '#2563eb',
    shades: {
      50: 'oklch(0.97 0.014 254)',
      100: 'oklch(0.93 0.034 254)',
      400: 'oklch(0.61 0.18 254)',
      600: 'oklch(0.55 0.20 260)',
      700: 'oklch(0.49 0.19 260)',
      900: 'oklch(0.31 0.12 260)',
    },
    gradientTo: 'oklch(0.55 0.20 293)',
  },
  {
    id: 'green',
    label: 'Grün',
    color: '#059669',
    shades: {
      50: 'oklch(0.97 0.018 163)',
      100: 'oklch(0.93 0.038 163)',
      400: 'oklch(0.63 0.16 163)',
      600: 'oklch(0.56 0.15 163)',
      700: 'oklch(0.50 0.14 163)',
      900: 'oklch(0.31 0.09 163)',
    },
    gradientTo: 'oklch(0.56 0.15 185)',
  },
  {
    id: 'violet',
    label: 'Violett',
    color: '#7c3aed',
    shades: {
      50: 'oklch(0.97 0.014 293)',
      100: 'oklch(0.93 0.034 293)',
      400: 'oklch(0.59 0.20 293)',
      600: 'oklch(0.50 0.22 293)',
      700: 'oklch(0.44 0.20 293)',
      900: 'oklch(0.28 0.13 293)',
    },
    gradientTo: 'oklch(0.50 0.20 330)',
  },
  {
    id: 'orange',
    label: 'Orange',
    color: '#ea580c',
    shades: {
      50: 'oklch(0.97 0.015 55)',
      100: 'oklch(0.93 0.038 55)',
      400: 'oklch(0.68 0.17 46)',
      600: 'oklch(0.58 0.18 40)',
      700: 'oklch(0.52 0.17 40)',
      900: 'oklch(0.33 0.10 40)',
    },
    gradientTo: 'oklch(0.58 0.18 20)',
  },
  {
    id: 'rose',
    label: 'Rosa',
    color: '#e11d48',
    shades: {
      50: 'oklch(0.97 0.015 350)',
      100: 'oklch(0.93 0.034 350)',
      400: 'oklch(0.60 0.19 350)',
      600: 'oklch(0.52 0.21 350)',
      700: 'oklch(0.46 0.19 350)',
      900: 'oklch(0.29 0.12 350)',
    },
    gradientTo: 'oklch(0.52 0.21 15)',
  },
  {
    id: 'teal',
    label: 'Teal',
    color: '#0d9488',
    shades: {
      50: 'oklch(0.97 0.015 180)',
      100: 'oklch(0.93 0.035 180)',
      400: 'oklch(0.63 0.13 180)',
      600: 'oklch(0.55 0.13 180)',
      700: 'oklch(0.49 0.12 180)',
      900: 'oklch(0.31 0.08 180)',
    },
    gradientTo: 'oklch(0.55 0.13 210)',
  },
] as const

export type AccentId = (typeof accentOptions)[number]['id']

function applyAccent(accentId: AccentId) {
  const option = accentOptions.find((a) => a.id === accentId)
  if (!option) return
  const s = document.body.style
  // Brand shades
  s.setProperty('--brand-50', option.shades[50])
  s.setProperty('--brand-100', option.shades[100])
  s.setProperty('--brand-400', option.shades[400])
  s.setProperty('--brand-600', option.shades[600])
  s.setProperty('--brand-700', option.shades[700])
  s.setProperty('--brand-900', option.shades[900])
  s.setProperty('--brand-gradient-from', option.shades[600])
  s.setProperty('--brand-gradient-to', option.gradientTo)
  // Wire into shadcn theme
  const isDark = document.documentElement.classList.contains('dark')
  if (isDark) {
    s.setProperty('--primary', option.shades[400])
    s.setProperty('--primary-foreground', option.shades[900])
    s.setProperty('--ring', option.shades[400])
    s.setProperty('--sidebar-primary', option.shades[400])
    s.setProperty('--sidebar-primary-foreground', option.shades[900])
  } else {
    s.setProperty('--primary', option.shades[600])
    s.setProperty('--primary-foreground', 'oklch(0.985 0 0)')
    s.setProperty('--ring', option.shades[400])
    s.setProperty('--sidebar-primary', option.shades[600])
    s.setProperty('--sidebar-primary-foreground', 'oklch(0.985 0 0)')
  }
}

// ── Theme (Light / Dark) ─────────────────────────────────────────────────────

const THEME_KEY = 'xkmu-theme'
const DEFAULT_THEME: ThemeId = 'light'

export const themeOptions = [
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
  { id: 'system', label: 'System' },
] as const

export type ThemeId = 'light' | 'dark' | 'system'

function getResolvedTheme(themeId: ThemeId): 'light' | 'dark' {
  if (themeId === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeId
}

function applyTheme(themeId: ThemeId) {
  const resolved = getResolvedTheme(themeId)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

// ── Border Radius ─────────────────────────────────────────────────────────────

const RADIUS_KEY = 'xkmu-radius'
const DEFAULT_RADIUS = 'default'

export const radiusOptions = [
  { id: 'sharp', label: 'Eckig', value: '0rem' },
  { id: 'default', label: 'Standard', value: '0.625rem' },
  { id: 'rounded', label: 'Rund', value: '1rem' },
  { id: 'pill', label: 'Pill', value: '1.5rem' },
] as const

export type RadiusId = (typeof radiusOptions)[number]['id']

function applyRadius(radiusId: RadiusId) {
  const option = radiusOptions.find((r) => r.id === radiusId)
  if (option) {
    document.body.style.setProperty('--radius', option.value)
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface DesignContextValue {
  font: FontId
  setFont: (font: FontId) => void
  fontOptions: typeof fontOptions
  accent: AccentId
  setAccent: (accent: AccentId) => void
  accentOptions: typeof accentOptions
  radius: RadiusId
  setRadius: (radius: RadiusId) => void
  radiusOptions: typeof radiusOptions
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themeOptions: typeof themeOptions
  resolvedTheme: 'light' | 'dark'
}

const DesignContext = createContext<DesignContextValue | null>(null)

export function DesignProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontId>(DEFAULT_FONT)
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT)
  const [radius, setRadiusState] = useState<RadiusId>(DEFAULT_RADIUS)
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const validFonts = fontOptions.map((f) => f.id) as readonly string[]
    const storedFont = localStorage.getItem(FONT_KEY) as FontId | null
    if (storedFont && validFonts.includes(storedFont)) {
      setFontState(storedFont)
      applyFont(storedFont)
    } else {
      applyFont(DEFAULT_FONT)
    }

    // Theme must be applied before accent (accent reads dark class)
    const validThemes = themeOptions.map((t) => t.id) as readonly string[]
    const storedTheme = localStorage.getItem(THEME_KEY) as ThemeId | null
    const activeTheme = storedTheme && validThemes.includes(storedTheme) ? storedTheme : DEFAULT_THEME
    setThemeState(activeTheme)
    applyTheme(activeTheme)
    setResolvedTheme(getResolvedTheme(activeTheme))

    const validAccents = accentOptions.map((a) => a.id) as readonly string[]
    const storedAccent = localStorage.getItem(ACCENT_KEY) as AccentId | null
    if (storedAccent && validAccents.includes(storedAccent)) {
      setAccentState(storedAccent)
      applyAccent(storedAccent)
    } else {
      applyAccent(DEFAULT_ACCENT)
    }

    const validRadii = radiusOptions.map((r) => r.id) as readonly string[]
    const storedRadius = localStorage.getItem(RADIUS_KEY) as RadiusId | null
    if (storedRadius && validRadii.includes(storedRadius)) {
      setRadiusState(storedRadius)
      applyRadius(storedRadius)
    } else {
      applyRadius(DEFAULT_RADIUS)
    }

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if ((localStorage.getItem(THEME_KEY) || DEFAULT_THEME) === 'system') {
        applyTheme('system')
        setResolvedTheme(getResolvedTheme('system'))
        // Re-apply accent for dark/light switch
        const currentAccent = (localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT) as AccentId
        applyAccent(currentAccent)
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const setFont = (newFont: FontId) => {
    setFontState(newFont)
    localStorage.setItem(FONT_KEY, newFont)
    applyFont(newFont)
  }

  const setAccent = (newAccent: AccentId) => {
    setAccentState(newAccent)
    localStorage.setItem(ACCENT_KEY, newAccent)
    applyAccent(newAccent)
  }

  const setRadius = (newRadius: RadiusId) => {
    setRadiusState(newRadius)
    localStorage.setItem(RADIUS_KEY, newRadius)
    applyRadius(newRadius)
  }

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    applyTheme(newTheme)
    setResolvedTheme(getResolvedTheme(newTheme))
    // Re-apply accent to adjust for dark/light
    const currentAccent = (localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT) as AccentId
    applyAccent(currentAccent)
  }

  return (
    <DesignContext.Provider
      value={{
        font, setFont, fontOptions,
        accent, setAccent, accentOptions,
        radius, setRadius, radiusOptions,
        theme, setTheme, themeOptions, resolvedTheme,
      }}
    >
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  const ctx = useContext(DesignContext)
  if (!ctx) throw new Error('useDesign must be used within DesignProvider')
  return ctx
}
