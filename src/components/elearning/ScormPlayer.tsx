'use client'

import { useEffect, useRef } from 'react'
import { logger } from '@/lib/utils/logger'

interface Props {
  courseId: string
  lessonId: string
  packageId: string
  entryPath: string
  version: '1.2' | '2004' | 'unknown'
  height?: number
  onComplete?: () => void
}

/**
 * Minimaler SCORM-1.2-/2004-Player.
 *
 * SCO-Inhalte rufen `window.API.LMSXxx()` (1.2) bzw. `window.API_1484_11.Xxx()`
 * (2004) auf dem PARENT-Window auf. Wir injizieren ein API-Objekt auf
 * `window`, das die wichtigsten Calls intern verwaltet und beim Erkennen von
 * `lesson_status: completed|passed` die Lesson-Completion an unseren Backend
 * weitergibt.
 *
 * BEWUSST nicht implementiert: cmi.interactions, cmi.objectives, suspend_data
 * mit Persistierung zwischen Sessions, Sequencing/Navigation. Das sind alles
 * Authoring-Features ueber die wir gerade NICHT verfuegen wollen.
 */
export function ScormPlayer({
  courseId,
  lessonId,
  packageId,
  entryPath,
  version,
  height = 720,
  onComplete,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const data: Record<string, string> = {
      // SCORM 1.2 cmi-Datenmodell — Defaults
      'cmi.core.lesson_status': 'not attempted',
      'cmi.core.lesson_location': '',
      'cmi.core.score.raw': '',
      'cmi.core.score.min': '0',
      'cmi.core.score.max': '100',
      'cmi.core.session_time': '0000:00:00',
      'cmi.core.entry': '',
      'cmi.core.exit': '',
      'cmi.suspend_data': '',
      // SCORM 2004 — minimaler Subset
      'cmi.completion_status': 'unknown',
      'cmi.success_status': 'unknown',
      'cmi.score.raw': '',
      'cmi.score.scaled': '',
    }
    let completed = false

    const persistComplete = async () => {
      if (completed) return
      completed = true
      try {
        await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/complete`, {
          method: 'POST',
        })
        onComplete?.()
      } catch (err) {
        logger.warn(`SCORM completion-call fuer ${lessonId} fehlgeschlagen`, {
          module: 'ScormPlayer',
          error: String(err),
        })
      }
    }

    const isCompletedValue = (key: string, val: string): boolean => {
      const v = val.toLowerCase()
      if (key === 'cmi.core.lesson_status' && (v === 'completed' || v === 'passed')) return true
      if (key === 'cmi.completion_status' && v === 'completed') return true
      if (key === 'cmi.success_status' && v === 'passed') return true
      return false
    }

    const api12 = {
      LMSInitialize: () => 'true',
      LMSFinish: () => 'true',
      LMSGetValue: (key: string) => data[key] ?? '',
      LMSSetValue: (key: string, val: string) => {
        const value = String(val ?? '')
        data[key] = value
        if (isCompletedValue(key, value)) persistComplete()
        return 'true'
      },
      LMSCommit: () => 'true',
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => '',
      LMSGetDiagnostic: () => '',
    }

    const api2004 = {
      Initialize: api12.LMSInitialize,
      Terminate: () => {
        // Bei Terminate auf completed-Status pruefen
        if (
          isCompletedValue('cmi.completion_status', data['cmi.completion_status']) ||
          isCompletedValue('cmi.success_status', data['cmi.success_status']) ||
          isCompletedValue('cmi.core.lesson_status', data['cmi.core.lesson_status'])
        ) {
          persistComplete()
        }
        return 'true'
      },
      GetValue: api12.LMSGetValue,
      SetValue: api12.LMSSetValue,
      Commit: api12.LMSCommit,
      GetLastError: api12.LMSGetLastError,
      GetErrorString: api12.LMSGetErrorString,
      GetDiagnostic: api12.LMSGetDiagnostic,
    }

    type ScormWindow = Window & { API?: unknown; API_1484_11?: unknown }
    const w = window as ScormWindow

    if (version === '2004') {
      w.API_1484_11 = api2004
    } else {
      // 1.2 ist der pragmatische Default fuer 'unknown'
      w.API = api12
    }

    return () => {
      const c = window as ScormWindow
      delete c.API
      delete c.API_1484_11
    }
  }, [courseId, lessonId, version, onComplete])

  const src = `/api/v1/courses/${courseId}/scorm/${packageId}/serve/${entryPath}`

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-background">
      <iframe
        ref={iframeRef}
        src={src}
        title="SCORM-Inhalt"
        style={{ width: '100%', height: `${height}px`, border: 'none' }}
        // Kein sandbox — SCO braucht ungeschraenkten Zugriff auf window.parent.API
        allow="autoplay; fullscreen"
      />
    </div>
  )
}
