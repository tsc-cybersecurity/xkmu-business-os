import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Pillar = 'ki' | 'it' | 'cyber' | 'nis2' | 'default'

const PILLAR_GRADIENTS: Record<Pillar, [string, string]> = {
  ki:      ['#2563eb', '#4338ca'], // blue-600 → indigo-700
  it:      ['#0d9488', '#0e7490'], // teal-600 → cyan-700
  cyber:   ['#dc2626', '#be123c'], // red-600 → rose-700
  nis2:    ['#7c3aed', '#6b21a8'], // violet-600 → purple-700
  default: ['#0f172a', '#1e293b'], // slate-900 → slate-800
}

const PILLAR_LABEL: Record<Pillar, string> = {
  ki:      'KI-Beratung',
  it:      'IT-Beratung',
  cyber:   'Cybersecurity',
  nis2:    'NIS-2 Compliance',
  default: 'xKMU digital solutions',
}

function pickPillar(raw: string | null): Pillar {
  switch ((raw || '').toLowerCase()) {
    case 'ki': case 'it': case 'cyber': case 'nis2': return raw!.toLowerCase() as Pillar
    default: return 'default'
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('t') || 'xKMU digital solutions').slice(0, 90)
  const subtitle = (searchParams.get('s') || 'KI, IT & Cybersecurity für KMU aus Weimar').slice(0, 140)
  const pillar = pickPillar(searchParams.get('p'))
  const [from, to] = PILLAR_GRADIENTS[pillar]
  const label = PILLAR_LABEL[pillar]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 1,
              padding: '8px 18px',
              background: 'rgba(255,255,255,0.16)',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            {label}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: title.length > 50 ? 64 : 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.3,
              color: 'rgba(255,255,255,0.85)',
              maxWidth: 1040,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 26,
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          <div style={{ fontWeight: 700 }}>xKMU.de</div>
          <div>Weimar · Thüringen</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
