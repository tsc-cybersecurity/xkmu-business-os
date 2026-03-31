/**
 * Liest den CSRF-Token aus dem csrf_token Cookie.
 * Wird im Frontend fuer alle mutierenden API-Calls verwendet.
 *
 * Verwendung:
 *   import { getCsrfToken } from '@/lib/utils/csrf'
 *   headers: { 'X-CSRF-Token': getCsrfToken() }
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}
