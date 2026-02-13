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
  topicProgress: Record<number, number>
  topicNames: Record<number, string>
}

export default function SpiderChart({ topicProgress, topicNames }: SpiderChartProps) {
  const data = Object.entries(topicProgress).map(([topicId, progress]) => ({
    topic: topicNames[parseInt(topicId)] || `Thema ${topicId}`,
    value: Math.round(progress),
    fullMark: 100,
  }))

  const averageProgress = data.reduce((sum, item) => sum + item.value, 0) / data.length

  const getColor = () => {
    if (averageProgress >= 80) return '#10b981'
    if (averageProgress >= 60) return '#3b82f6'
    if (averageProgress >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const chartColor = getColor()

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="topic"
            tick={{ fill: '#374151', fontSize: 12 }}
            tickLine={{ stroke: '#9ca3af' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
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
                  <p className="font-semibold text-gray-900">{item.topic}</p>
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
