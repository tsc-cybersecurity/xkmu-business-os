'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface SpiderChartProps {
  categoryProgress: Record<number, number>
  categoryNames: Record<number, string>
}

// Short labels for 19 categories to fit in radar chart
const SHORT_NAMES: Record<number, string> = {
  1: 'Extern',
  2: 'Haustechnik',
  3: 'Backup',
  4: 'Buerosoftware',
  5: 'Client',
  6: 'Drucker',
  7: 'IT-Admin',
  8: 'Mobile',
  9: 'Netze',
  10: 'Orga/Personal',
  11: 'Cloud',
  12: 'Rollen/Auth',
  13: 'Serverraum',
  14: 'Server',
  15: 'Sicherheit',
  16: 'Telefonie',
  17: 'Informationen',
  18: 'Vorfaelle',
  19: 'Web',
}

export default function SpiderChart({ categoryProgress, categoryNames }: SpiderChartProps) {
  const data = Object.entries(categoryProgress).map(([catId, progress]) => ({
    topic: SHORT_NAMES[parseInt(catId)] || categoryNames[parseInt(catId)] || `Kat. ${catId}`,
    fullName: categoryNames[parseInt(catId)] || `Kategorie ${catId}`,
    value: Math.round(progress),
    fullMark: 100,
  }))

  const averageProgress = data.length > 0
    ? data.reduce((sum, item) => sum + item.value, 0) / data.length
    : 0

  const getColor = () => {
    if (averageProgress >= 80) return '#10b981'
    if (averageProgress >= 60) return '#3b82f6'
    if (averageProgress >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const chartColor = getColor()

  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="topic"
            tick={{ fill: '#374151', fontSize: 10 }}
            tickLine={{ stroke: '#9ca3af' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickCount={6}
          />
          <Radar
            name="Erfuellungsgrad"
            dataKey="value"
            stroke={chartColor}
            fill={chartColor}
            fillOpacity={0.5}
            strokeWidth={2}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const item = payload[0].payload
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-semibold text-gray-900">{item.fullName}</p>
                  <p className="text-sm text-gray-600">
                    Erfuellungsgrad: <span className="font-bold" style={{ color: chartColor }}>{item.value}%</span>
                  </p>
                </div>
              )
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
