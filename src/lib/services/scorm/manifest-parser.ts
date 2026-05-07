import { XMLParser } from 'fast-xml-parser'

/**
 * Minimaler SCORM-1.2-/SCORM-2004-Manifest-Parser.
 * Liest `imsmanifest.xml` und extrahiert:
 *   - Kurs-Titel (default-organization > title)
 *   - SCORM-Version (1.2 / 2004 — heuristisch ueber adlcp namespace)
 *   - Liste der Lernobjekte (Items) mit ihrem Resource-Eintrittspfad
 *
 * Bewusst nicht implementiert: Sequencing, Prerequisites, Mehrfach-Manifests.
 * Wir behandeln SCORM-Pakete als linearen Container mit n SCOs.
 */

export type ScormVersion = '1.2' | '2004' | 'unknown'

export interface ScormManifestItem {
  /** identifier des items aus dem manifest */
  itemId: string
  /** Anzeige-Titel (z.B. "Lesson 1: Intro") */
  title: string
  /** Pfad zur HTML-Entry-Datei relativ zum SCORM-Root (z.B. "lesson1/index.html") */
  resourceHref: string
  /** Optionaler resource-identifier */
  resourceId: string | null
}

export interface ScormManifest {
  version: ScormVersion
  /** Kurs-Titel laut Manifest (organisations.organisation.title) */
  courseTitle: string
  /** Nach Reihenfolge der Items im default-organization */
  items: ScormManifestItem[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  allowBooleanAttributes: true,
})

export class ScormManifestError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export function parseScormManifest(xml: string): ScormManifest {
  let doc: unknown
  try {
    doc = parser.parse(xml)
  } catch (err) {
    throw new ScormManifestError(
      'XML_PARSE_FAILED',
      `imsmanifest.xml ist kein gueltiges XML: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const root = pick(doc, 'manifest')
  if (!isObject(root)) {
    throw new ScormManifestError('NO_MANIFEST_ROOT', '<manifest>-Wurzel fehlt')
  }

  const version = detectVersion(root)
  const orgs = pick(root, 'organizations')
  const defaultOrgId = isObject(orgs) ? str(orgs['@_default']) : ''
  const orgList = arr(isObject(orgs) ? orgs.organization : null)
  const defaultOrg =
    orgList.find((o) => isObject(o) && str(o['@_identifier']) === defaultOrgId) ?? orgList[0]

  const courseTitle = isObject(defaultOrg) ? str(defaultOrg.title) || 'Unbenannter Kurs' : 'Unbenannter Kurs'

  // Resource-Map fuer href-Lookup
  const resources = pick(root, 'resources')
  const resourceList = arr(isObject(resources) ? resources.resource : null)
  const resourceById = new Map<string, { id: string; href: string }>()
  for (const res of resourceList) {
    if (!isObject(res)) continue
    const id = str(res['@_identifier'])
    const href = str(res['@_href'])
    if (id && href) resourceById.set(id, { id, href })
  }

  // Items rekursiv flach sammeln
  const items: ScormManifestItem[] = []
  if (isObject(defaultOrg)) {
    collectItems(defaultOrg.item, resourceById, items)
  }

  if (items.length === 0) {
    throw new ScormManifestError(
      'NO_ITEMS',
      'Manifest enthaelt keine zuordbaren Items mit Resource-href',
    )
  }

  return { version, courseTitle, items }
}

// ============================================
// Helpers
// ============================================

function collectItems(
  raw: unknown,
  resources: Map<string, { id: string; href: string }>,
  out: ScormManifestItem[],
): void {
  for (const item of arr(raw)) {
    if (!isObject(item)) continue
    const itemId = str(item['@_identifier']) || `item-${out.length}`
    const title = str(item.title) || 'Ohne Titel'
    const idref = str(item['@_identifierref'])
    if (idref) {
      const res = resources.get(idref)
      if (res?.href) {
        out.push({ itemId, title, resourceHref: res.href, resourceId: res.id })
      }
    }
    // Nested items (SCORM 2004 unterstuetzt geschachtelte Items)
    if (item.item) collectItems(item.item, resources, out)
  }
}

function detectVersion(manifestRoot: Record<string, unknown>): ScormVersion {
  const xmlns = str(manifestRoot['@_xmlns'])
  if (xmlns.includes('imscp_v1p1') || xmlns.includes('1.2')) return '1.2'
  if (xmlns.includes('2004') || hasAttr(manifestRoot, 'xmlns:adlseq')) return '2004'
  // Fallback: schemaversion
  const meta = pick(manifestRoot, 'metadata')
  const schemaversion = isObject(meta) ? str(pick(meta, 'schemaversion')) : ''
  if (schemaversion.startsWith('1.2')) return '1.2'
  if (schemaversion.startsWith('2004')) return '2004'
  return 'unknown'
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function arr<T = unknown>(v: T | T[] | null | undefined): T[] {
  if (v === null || v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function str(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  // Whitespace-only text-nodes oder objects mit @_value/text
  if (isObject(v)) {
    if (typeof v['#text'] === 'string') return v['#text']
    if (typeof v['@_value'] === 'string') return v['@_value']
  }
  return ''
}

function pick(obj: unknown, key: string): unknown {
  return isObject(obj) ? obj[key] : undefined
}

function hasAttr(obj: Record<string, unknown>, attr: string): boolean {
  return Object.keys(obj).some((k) => k === `@_${attr}` || k.startsWith(`@_${attr}`))
}
