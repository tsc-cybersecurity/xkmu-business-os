'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'xkmu-font'
const DEFAULT_FONT = 'ubuntu'

export const fontOptions = [
  { id: 'ubuntu', label: 'Ubuntu', variable: 'var(--font-ubuntu)' },
  { id: 'geist', label: 'Geist', variable: 'var(--font-geist)' },
  { id: 'inter', label: 'Inter', variable: 'var(--font-inter)' },
  { id: 'roboto', label: 'Roboto', variable: 'var(--font-roboto)' },
  { id: 'montserrat', label: 'Montserrat', variable: 'var(--font-montserrat)' },
] as const

export type FontId = (typeof fontOptions)[number]['id']

interface FontContextValue {
  font: FontId
  setFont: (font: FontId) => void
  fontOptions: typeof fontOptions
}

const FontContext = createContext<FontContextValue | null>(null)

function applyFont(fontId: FontId) {
  const option = fontOptions.find((f) => f.id === fontId)
  if (option) {
    document.documentElement.style.setProperty('--font-sans', option.variable)
  }
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontId>(DEFAULT_FONT)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as FontId | null
    const validIds = fontOptions.map((f) => f.id) as readonly string[]
    if (stored && validIds.includes(stored)) {
      setFontState(stored)
      applyFont(stored)
    } else {
      applyFont(DEFAULT_FONT)
    }
  }, [])

  const setFont = (newFont: FontId) => {
    setFontState(newFont)
    localStorage.setItem(STORAGE_KEY, newFont)
    applyFont(newFont)
  }

  return (
    <FontContext.Provider value={{ font, setFont, fontOptions }}>
      {children}
    </FontContext.Provider>
  )
}

export function useFontSwitcher() {
  const ctx = useContext(FontContext)
  if (!ctx) throw new Error('useFontSwitcher must be used within FontProvider')
  return ctx
}
