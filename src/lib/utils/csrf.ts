/**
 * CSRF Double-Submit Cookie utilities.
 *
 * getCsrfToken() reads the csrf_token cookie set by proxy.ts.
 * installCsrfInterceptor() patches global fetch to auto-inject
 * X-CSRF-Token header on all mutation requests (POST/PUT/DELETE/PATCH).
 */

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'X-CSRF-Token'
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`${CSRF_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : ''
}

let interceptorInstalled = false

/**
 * Patches global fetch to automatically add the CSRF token header
 * to all mutation requests. Call once in the app root layout.
 * Safe to call multiple times (idempotent).
 */
export function installCsrfInterceptor(): void {
  if (typeof window === 'undefined') return
  if (interceptorInstalled) return
  interceptorInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? 'GET').toUpperCase()

    if (MUTATION_METHODS.has(method)) {
      const token = getCsrfToken()
      if (token) {
        const headers = new Headers(init?.headers)
        if (!headers.has(CSRF_HEADER)) {
          headers.set(CSRF_HEADER, token)
        }
        init = { ...init, headers }
      }
    }

    return originalFetch(input, init)
  }
}
