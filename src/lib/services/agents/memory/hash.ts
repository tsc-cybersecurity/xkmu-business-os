/**
 * Memory Content-Hash — SHA-256 mit normalisierten Line-Endings.
 * Wird fuer Change-Detection im Re-Index-Pfad genutzt.
 */

import { createHash } from 'node:crypto'

export function computeContentHash(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
