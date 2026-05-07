import path from 'path'
import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { db } from '@/lib/db'
import { courses, courseLessons, courseLessonBlocks, courseAssets } from '@/lib/db/schema'
import { eq, max as drizzleMax } from 'drizzle-orm'
import { parseScormManifest, ScormManifestError, type ScormManifest } from './manifest-parser'
import { logger } from '@/lib/utils/logger'
import { AuditLogService } from '@/lib/services/audit-log.service'

const MOD = 'ScormImport'

/** Storage-Verzeichnis fuer entpackte SCORM-Pakete (analog Course-Assets). */
function scormDir(): string {
  return process.env.SCORM_PACKAGE_DIR
    ?? process.env.COURSE_ASSET_DIR
    ?? path.join(process.cwd(), 'public', 'uploads', 'courses')
}

export class ScormImportError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export interface ScormImportResult {
  courseId: string
  packageId: string
  manifest: ScormManifest
  /** Pro Item eine angelegte Lesson */
  lessons: Array<{ lessonId: string; itemId: string; title: string; entryPath: string }>
}

export const ScormImportService = {
  /**
   * Importiert ein SCORM-Paket in einen bestehenden Kurs:
   *   1. ZIP entpacken
   *   2. imsmanifest.xml parsen
   *   3. Files unter <SCORM_PACKAGE_DIR>/<courseId>/scorm/<packageId>/ ablegen
   *   4. Pro Manifest-Item eine courseLesson + courseLessonBlock(kind='scorm') anlegen
   *   5. Ein courseAssets-Eintrag (kind='scorm') als Sammelreferenz aufs Paket
   */
  async importToCourse(
    courseId: string,
    file: File,
    actor: { userId: string | null; userRole: string | null },
  ): Promise<ScormImportResult> {
    // 1. Course existiert?
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) {
      throw new ScormImportError('COURSE_NOT_FOUND', `Kurs ${courseId} nicht gefunden`)
    }

    // 2. ZIP einlesen
    const buffer = Buffer.from(await file.arrayBuffer())
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(buffer)
    } catch (err) {
      throw new ScormImportError(
        'ZIP_INVALID',
        `Datei ist kein gueltiges ZIP: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 3. Manifest finden + parsen
    const manifestEntry = zip.file('imsmanifest.xml') ?? findManifestNested(zip)
    if (!manifestEntry) {
      throw new ScormImportError(
        'NO_MANIFEST',
        'imsmanifest.xml im Paket nicht gefunden — kein gueltiges SCORM-Paket?',
      )
    }
    const manifestXml = await manifestEntry.async('string')
    let manifest: ScormManifest
    try {
      manifest = parseScormManifest(manifestXml)
    } catch (err) {
      if (err instanceof ScormManifestError) throw new ScormImportError(err.code, err.message)
      throw err
    }

    // 4. Files auf Disk schreiben
    const packageId = randomUUID()
    const targetRel = path.posix.join(courseId, 'scorm', packageId)
    const targetAbs = path.join(scormDir(), targetRel)
    const { mkdir, writeFile } = await import('fs/promises')
    await mkdir(targetAbs, { recursive: true })

    // Manche Pakete liegen genested in einem Unterordner — wir behalten die
    // Manifest-Pfad-Konvention (relative zu manifest.xml-Verzeichnis).
    const manifestPathInZip = manifestEntry.name // z.B. "" oder "scormcontent/imsmanifest.xml"
    const rootPrefix = manifestPathInZip.includes('/')
      ? manifestPathInZip.substring(0, manifestPathInZip.lastIndexOf('/') + 1)
      : ''

    let bytesWritten = 0
    const fileEntries = Object.values(zip.files).filter((f) => !f.dir)
    for (const entry of fileEntries) {
      // Skip files outside the manifest root (Garbage in some packages)
      if (rootPrefix && !entry.name.startsWith(rootPrefix)) continue
      const relInPackage = rootPrefix ? entry.name.substring(rootPrefix.length) : entry.name
      // Prevent path traversal
      if (relInPackage.includes('..')) continue
      const dest = path.join(targetAbs, relInPackage)
      await mkdir(path.dirname(dest), { recursive: true })
      const data = await entry.async('nodebuffer')
      await writeFile(dest, data)
      bytesWritten += data.length
    }

    // 5. courseAssets-Eintrag (Sammelreferenz)
    await db.insert(courseAssets).values({
      courseId,
      kind: 'scorm',
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'application/zip',
      sizeBytes: bytesWritten,
      path: targetRel,
      // Wir nutzen `label` fuer SCORM-Version + packageId (label ist varchar(200))
      label: `scorm-${manifest.version}|${packageId}`,
      uploadedBy: actor.userId,
    })

    // 6. Pro Item eine Lesson + scorm-Block
    const [maxRow] = await db
      .select({ max: drizzleMax(courseLessons.position) })
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
    let nextPos = (maxRow?.max ?? 0) + 1

    const result: ScormImportResult['lessons'] = []
    for (const item of manifest.items) {
      const lessonSlug = `scorm-${slugify(item.title)}-${nextPos}`
      const [lesson] = await db
        .insert(courseLessons)
        .values({
          courseId,
          position: nextPos,
          slug: lessonSlug,
          title: item.title.substring(0, 200),
        })
        .returning()

      await db.insert(courseLessonBlocks).values({
        lessonId: lesson.id,
        position: 0,
        kind: 'scorm',
        blockType: 'scorm',
        content: {
          packageId,
          itemId: item.itemId,
          entryPath: item.resourceHref,
          version: manifest.version,
        },
        settings: { height: 720 },
      })

      result.push({
        lessonId: lesson.id,
        itemId: item.itemId,
        title: item.title,
        entryPath: item.resourceHref,
      })
      nextPos += 1
    }

    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'scorm.imported',
      entityType: 'course',
      entityId: courseId,
      payload: {
        packageId,
        version: manifest.version,
        courseTitle: manifest.courseTitle,
        itemCount: manifest.items.length,
        bytes: bytesWritten,
      },
    })

    logger.info(
      `SCORM imported: ${manifest.items.length} Lessons in Kurs ${courseId}`,
      { module: MOD },
    )

    return { courseId, packageId, manifest, lessons: result }
  },

  /** Liefert den absoluten Filesystem-Pfad fuer ein Paket — fuer den serve-Endpoint. */
  packagePath(courseId: string, packageId: string): string {
    return path.join(scormDir(), courseId, 'scorm', packageId)
  },
}

function findManifestNested(zip: JSZip): JSZip.JSZipObject | null {
  // Suche in 1. Unterebene (z.B. "scormcontent/imsmanifest.xml")
  for (const name of Object.keys(zip.files)) {
    if (name.toLowerCase().endsWith('/imsmanifest.xml') && !name.includes('/.')) {
      return zip.files[name]
    }
  }
  return null
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'scorm'
}
