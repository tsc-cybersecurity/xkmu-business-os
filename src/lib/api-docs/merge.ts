import type { ApiEndpoint, ApiService, AuthType, DiscoveredEndpoint, HttpMethod } from './types'
import { apiServices } from './registry'
import { DISCOVERED_ENDPOINTS } from './discovered'

/**
 * Merged-Layer: nimmt die FS-discovered Endpoints als Source-of-Truth
 * und ueberlagert sie mit handgepflegten Registry-Annotationen.
 *
 * - Vollstaendige Liste = DISCOVERED_ENDPOINTS (Realtime aus dem Code)
 * - Bessere Doku (Summary, Body, cURL, Description) = Registry-Eintraege
 *   gemappt via (method, path)
 */

interface RegistryIndexValue {
  service: ApiService
  endpoint: ApiEndpoint
}

function buildEndpointIndex(): Map<string, RegistryIndexValue> {
  const idx = new Map<string, RegistryIndexValue>()
  for (const s of apiServices) {
    for (const e of s.endpoints) {
      idx.set(`${e.method} ${e.path}`, { service: s, endpoint: e })
    }
  }
  return idx
}

function serviceSlugFromPath(p: string): string {
  const cleaned = p.replace(/^\/api(\/v\d+)?\//, '')
  return cleaned.split('/')[0] || 'misc'
}

function basePathFromSlug(slug: string, samplePath: string): string {
  // Default: alles bis zum ersten dynamischen Segment oder zweite Slug-Ebene
  const cleaned = samplePath.replace(/\/\{[^}]+\}.*$/, '')
  return cleaned.includes(`/${slug}`) ? cleaned.split(`/${slug}`)[0] + `/${slug}` : `/api/v1/${slug}`
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function authFromDiscovered(d: DiscoveredEndpoint): AuthType {
  return d.auth?.type ?? 'session'
}

/**
 * Erzeugt eine vollstaendige Service-Liste aus dem FS-Scan,
 * angereichert mit Registry-Annotationen wo verfuegbar.
 */
export function mergedServices(): ApiService[] {
  const annotationIndex = buildEndpointIndex()
  const byService = new Map<string, { service: ApiService; samplePath: string; auths: Set<AuthType> }>()

  for (const d of DISCOVERED_ENDPOINTS) {
    const slug = serviceSlugFromPath(d.path)
    const key = `${d.method} ${d.path}`
    const annotation = annotationIndex.get(key)

    const endpoint: ApiEndpoint = annotation
      ? annotation.endpoint
      : {
          method: d.method as HttpMethod,
          path: d.path,
          summary: `${d.method} ${d.path}`,
          description: d.auth?.module
            ? `Permission: ${d.auth.module}:${d.auth.action ?? '?'}`
            : undefined,
          curl: '',
        }

    let bucket = byService.get(slug)
    if (!bucket) {
      const registryService = annotation?.service ?? apiServices.find((s) => s.slug === slug)
      const service: ApiService = registryService
        ? { ...registryService, endpoints: [] }
        : {
            name: humanizeSlug(slug),
            slug,
            description: 'Auto-generiert aus dem Filesystem. Keine handgepflegte Beschreibung verfuegbar.',
            basePath: basePathFromSlug(slug, d.path),
            auth: authFromDiscovered(d),
            endpoints: [],
          }
      bucket = { service, samplePath: d.path, auths: new Set<AuthType>() }
      byService.set(slug, bucket)
    }
    bucket.service.endpoints.push(endpoint)
    bucket.auths.add(authFromDiscovered(d))
  }

  // Auth eines Services: bevorzuge 'public' wenn vorhanden, sonst 'api-key', sonst 'session'
  for (const { service, auths } of byService.values()) {
    if (auths.has('public') && auths.size === 1) service.auth = 'public'
    else if (auths.has('api-key') && !auths.has('session')) service.auth = 'api-key'
    else service.auth = 'session'
  }

  return [...byService.values()]
    .map((b) => b.service)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export const MERGED_SERVICES = mergedServices()
