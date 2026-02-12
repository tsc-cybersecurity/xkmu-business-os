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
  { id: 'times', label: 'Times New Roman', variable: 'var(--font-times)' },
] as const

export type FontId = (typeof fontOptions)[number]['id']

function applyFont(fontId: FontId) {
  const option = fontOptions.find((f) => f.id === fontId)
  if (option) {
    document.body.style.setProperty('--font-sans', option.variable)
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
  s.setProperty('--brand-50', option.shades[50])
  s.setProperty('--brand-100', option.shades[100])
  s.setProperty('--brand-400', option.shades[400])
  s.setProperty('--brand-600', option.shades[600])
  s.setProperty('--brand-700', option.shades[700])
  s.setProperty('--brand-900', option.shades[900])
  s.setProperty('--brand-gradient-from', option.shades[600])
  s.setProperty('--brand-gradient-to', option.gradientTo)
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
}

const DesignContext = createContext<DesignContextValue | null>(null)

export function DesignProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontId>(DEFAULT_FONT)
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT)
  const [radius, setRadiusState] = useState<RadiusId>(DEFAULT_RADIUS)

  useEffect(() => {
    const validFonts = fontOptions.map((f) => f.id) as readonly string[]
    const storedFont = localStorage.getItem(FONT_KEY) as FontId | null
    if (storedFont && validFonts.includes(storedFont)) {
      setFontState(storedFont)
      applyFont(storedFont)
    } else {
      applyFont(DEFAULT_FONT)
    }

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

  return (
    <DesignContext.Provider
      value={{
        font, setFont, fontOptions,
        accent, setAccent, accentOptions,
        radius, setRadius, radiusOptions,
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
