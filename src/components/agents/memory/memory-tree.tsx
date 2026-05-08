'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Folder, FolderOpen, FileText } from 'lucide-react'

const PARA: Array<{ key: 'projects' | 'areas' | 'resources' | 'archives'; label: string }> = [
  { key: 'projects', label: 'Projects' },
  { key: 'areas', label: 'Areas' },
  { key: 'resources', label: 'Resources' },
  { key: 'archives', label: 'Archives' },
]

interface Entry { id: string; scope: string; title: string | null; summary: string | null }

export function MemoryTree() {
  const [open, setOpen] = useState<Record<string, boolean>>({ projects: true })
  const [data, setData] = useState<Record<string, Entry[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function loadPara(para: string) {
    if (data[para]) return
    setLoading((p) => ({ ...p, [para]: true }))
    try {
      const res = await fetch(`/api/agents/memory?para=${para}&limit=200`)
      const json = await res.json() as { items: Entry[] }
      setData((p) => ({ ...p, [para]: json.items ?? [] }))
    } finally {
      setLoading((p) => ({ ...p, [para]: false }))
    }
  }

  useEffect(() => { void loadPara('projects') }, [])

  return (
    <div className="text-sm">
      {PARA.map((p) => (
        <div key={p.key} className="mb-2">
          <button
            type="button"
            onClick={() => { setOpen((s) => ({ ...s, [p.key]: !s[p.key] })); void loadPara(p.key) }}
            className="flex items-center gap-1 font-medium hover:underline"
          >
            {open[p.key] ? <FolderOpen className="size-4" /> : <Folder className="size-4" />}
            {p.label}
          </button>
          {open[p.key] && (
            <ul className="pl-5 mt-1 space-y-1">
              {loading[p.key] && <li className="text-muted-foreground">lade ...</li>}
              {(data[p.key] ?? []).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/intern/agents/memory/${encodeURIComponent(e.scope)}`}
                    className="flex items-center gap-1 hover:underline text-foreground"
                  >
                    <FileText className="size-4" />
                    {e.title ?? e.scope}
                  </Link>
                </li>
              ))}
              {open[p.key] && !loading[p.key] && (data[p.key]?.length ?? 0) === 0 && (
                <li className="text-muted-foreground italic">leer</li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
