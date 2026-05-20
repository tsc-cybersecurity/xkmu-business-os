'use client'

interface Props {
  score: number | null
  threshold?: number
  size?: number
}

/**
 * SVG-Donut 0-100. Bei null (noch keine Iteration gelaufen) zeigt nur den
 * Hintergrund-Kreis. Farbe wechselt nach Score-Schwelle:
 *   >= threshold  → grün
 *   >= threshold-20 → amber
 *   sonst         → rot
 */
export function ScoreGauge({ score, threshold = 80, size = 120 }: Props) {
  const s = score ?? 0
  const radius = size / 2 - 8
  const circumference = 2 * Math.PI * radius
  const dash = (s / 100) * circumference

  const color = score === null
    ? 'text-muted-foreground'
    : s >= threshold
      ? 'text-green-500'
      : s >= threshold - 20
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={8}
          className="stroke-muted"
        />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className={`${color} transition-all duration-500`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>
          {score === null ? '–' : score}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  )
}
