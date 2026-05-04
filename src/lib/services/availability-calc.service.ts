export interface ComputeInput {
  slotType: {
    durationMinutes: number
    bufferBeforeMinutes: number
    bufferAfterMinutes: number
    minNoticeHours: number
    maxAdvanceDays: number
  }
  rangeStart: Date
  rangeEnd: Date
  rules: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]
  overrides: { startAt: Date; endAt: Date; kind: 'free' | 'block' }[]
  appointments: { startAt: Date; endAt: Date; bufferBeforeMinutes: number; bufferAfterMinutes: number }[]
  externalBusy: { startAt: Date; endAt: Date }[]
  userTimezone: string
  now: Date
}

interface Interval { start: number; end: number } // ms epoch

const FIFTEEN_MIN_MS = 15 * 60 * 1000
const DAY_MS = 86_400_000

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UTC-offset in minutes for the given Date in the given IANA timezone.
 * e.g. Europe/Berlin CEST = +120.
 */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  const hour = Number(parts.hour === '24' ? '0' : parts.hour)
  const asLocalUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asLocalUtc - date.getTime()) / 60_000)
}

/**
 * Converts a local wall-clock time in the given IANA timezone to a UTC Date.
 * Two-step approximation: compute approximate UTC, then correct with real offset.
 */
function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = tzOffsetMinutes(approx, timeZone)
  return new Date(approx.getTime() - offset * 60_000)
}

/**
 * Returns the weekday of the given Date in the given IANA timezone.
 * 0 = Monday … 6 = Sunday.
 */
function dayOfWeekInTz(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' })
  const wd = dtf.format(date)
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  return map[wd] ?? 0
}

/**
 * Returns the calendar date (year/month/day) of the given UTC instant in the given IANA timezone.
 */
function ymdInTz(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {})
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) }
}

function parseTime(s: string): { h: number; m: number } {
  const [hh, mm] = s.split(':')
  return { h: Number(hh), m: Number(mm) }
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

function mergeIntervals(arr: Interval[]): Interval[] {
  if (arr.length === 0) return []
  const sorted = [...arr].sort((a, b) => a.start - b.start)
  const merged: Interval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const cur = sorted[i]
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end)
    } else {
      merged.push({ ...cur })
    }
  }
  return merged
}

function subtractInterval(windows: Interval[], blocked: Interval): Interval[] {
  const result: Interval[] = []
  for (const w of windows) {
    if (blocked.end <= w.start || blocked.start >= w.end) {
      result.push(w)
      continue
    }
    if (blocked.start > w.start) {
      result.push({ start: w.start, end: blocked.start })
    }
    if (blocked.end < w.end) {
      result.push({ start: blocked.end, end: w.end })
    }
  }
  return result
}

/** Returns the smallest multiple of `step` that is >= ms. */
function ceilStep(ms: number, step: number): number {
  return Math.ceil(ms / step) * step
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export const AvailabilityCalcService = {
  computeFreeSlots(input: ComputeInput): Date[] {
    const { slotType, userTimezone } = input
    const minNoticeMs = slotType.minNoticeHours * 3_600_000
    const maxAdvanceMs = slotType.maxAdvanceDays * DAY_MS

    // Step 1: Effective range
    const effectiveStart = Math.max(
      input.rangeStart.getTime(),
      input.now.getTime() + minNoticeMs,
    )
    const effectiveEnd = Math.min(
      input.rangeEnd.getTime(),
      input.now.getTime() + maxAdvanceMs,
    )
    if (effectiveStart >= effectiveEnd) return []

    // Step 2: Build base windows from rules.
    //
    // Iterate over calendar days (in userTimezone) that overlap the effective range.
    // We use noon UTC as a stable representative instant for each calendar day
    // to avoid ambiguity at the UTC-midnight boundary.
    //
    // Key: we iterate from the calendar day that contains effectiveStart through
    // the calendar day that contains (effectiveEnd - 1ms), inclusive — no padding.
    // Any rule windows that fall outside [effectiveStart, effectiveEnd] still won't
    // produce slots because the slot-filter at step 6 enforces the range.
    let windows: Interval[] = []

    const startYmd = ymdInTz(new Date(effectiveStart), userTimezone)
    // effectiveEnd is exclusive, so the last relevant instant is effectiveEnd - 1ms
    const endYmd = ymdInTz(new Date(effectiveEnd - 1), userTimezone)

    // Noon-UTC anchors for the first and last calendar days
    let cursor = new Date(Date.UTC(startYmd.y, startYmd.m - 1, startYmd.d, 12, 0, 0))
    const lastDayNoon = new Date(Date.UTC(endYmd.y, endYmd.m - 1, endYmd.d, 12, 0, 0))

    while (cursor.getTime() <= lastDayNoon.getTime()) {
      const ymd = ymdInTz(cursor, userTimezone)
      const dow = dayOfWeekInTz(cursor, userTimezone)

      for (const rule of input.rules) {
        if (rule.dayOfWeek !== dow || !rule.isActive) continue

        const ts = parseTime(rule.startTime)
        const te = parseTime(rule.endTime)
        const wStart = localTimeToUtc(ymd.y, ymd.m, ymd.d, ts.h, ts.m, userTimezone).getTime()
        const wEnd = localTimeToUtc(ymd.y, ymd.m, ymd.d, te.h, te.m, userTimezone).getTime()

        if (wEnd > wStart) {
          windows.push({ start: wStart, end: wEnd })
        }
      }

      cursor = new Date(cursor.getTime() + DAY_MS)
    }

    // Step 3: Apply overrides
    const freeOverrides: Interval[] = []
    const blockOverrides: Interval[] = []
    for (const o of input.overrides) {
      const w: Interval = { start: o.startAt.getTime(), end: o.endAt.getTime() }
      if (o.kind === 'free') freeOverrides.push(w)
      else blockOverrides.push(w)
    }

    // Free overrides are merged into the windows; block overrides are subtracted.
    if (freeOverrides.length > 0) {
      windows = mergeIntervals([...windows, ...freeOverrides])
    } else {
      windows = mergeIntervals(windows)
    }
    for (const b of blockOverrides) {
      windows = subtractInterval(windows, b)
    }

    // Step 4: Subtract appointments (with their own per-appointment buffers)
    for (const a of input.appointments) {
      windows = subtractInterval(windows, {
        start: a.startAt.getTime() - a.bufferBeforeMinutes * 60_000,
        end: a.endAt.getTime() + a.bufferAfterMinutes * 60_000,
      })
    }

    // Step 5: Subtract externalBusy
    for (const b of input.externalBusy) {
      windows = subtractInterval(windows, {
        start: b.startAt.getTime(),
        end: b.endAt.getTime(),
      })
    }

    // Step 6: Generate slots.
    //
    // Slots start on 15-minute raster boundaries (ceil15). The advancement step
    // depends on the slot duration:
    //
    //   • For durations ≤ 30 min: step = durationMs (non-overlapping bookable blocks).
    //     e.g. a 30-min slot steps every 30 min → 09:00, 09:30, 10:00 …
    //
    //   • For durations > 30 min: step = FIFTEEN_MIN_MS (fine-grained overlapping
    //     start times so long appointments can be scheduled with precision).
    //     e.g. a 60-min slot steps every 15 min → 09:00, 09:15, 09:30 …
    //
    // A slot is valid when its full footprint [s-bufBefore, s+duration+bufAfter]
    // is contained in the window.
    const durationMs = slotType.durationMinutes * 60_000
    const bufBeforeMs = slotType.bufferBeforeMinutes * 60_000
    const bufAfterMs = slotType.bufferAfterMinutes * 60_000
    const stepMs = durationMs <= 30 * 60_000
      ? durationMs
      : FIFTEEN_MIN_MS

    const out: Date[] = []
    for (const w of windows) {
      let s = ceilStep(w.start, stepMs)
      // Valid when [s - bufBefore, s + duration + bufAfter] ⊆ [w.start, w.end]
      while (s - bufBeforeMs >= w.start && s + durationMs + bufAfterMs <= w.end) {
        // Step 7: filter to effective range (inclusive on both ends)
        if (s >= effectiveStart && s <= effectiveEnd) {
          out.push(new Date(s))
        }
        s += stepMs
      }
    }

    return out.sort((a, b) => a.getTime() - b.getTime())
  },
}
