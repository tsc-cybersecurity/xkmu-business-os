import path from 'path'
import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { marked } from 'marked'
import { db } from '@/lib/db'
import {
  courses,
  courseLessons,
  courseLessonBlocks,
  type CourseLessonBlock,
} from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { AuditLogService } from '@/lib/services/audit-log.service'

const MOD = 'ScormExport'

export class ScormExportError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export const ScormExportService = {
  /**
   * Erzeugt ein SCORM-1.2-konformes ZIP eines Kurses:
   *   - imsmanifest.xml mit Organization > Items pro Lesson
   *   - Pro Lesson eine HTML-Seite (Markdown + einfache Bloecke gerendert)
   *   - shared.css fuer ein bisschen Lesbarkeit
   *
   * Bewusst nicht: Sequencing, Navigation, Quizzes, Asset-Bundling
   * (CMS-Bilder/Videos werden als externe URLs zur Quelle referenziert).
   */
  async exportCourse(
    courseId: string,
    actor: { userId: string | null; userRole: string | null },
  ): Promise<{ filename: string; buffer: Buffer }> {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) {
      throw new ScormExportError('COURSE_NOT_FOUND', `Kurs ${courseId} nicht gefunden`)
    }

    const lessons = await db
      .select()
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(asc(courseLessons.position))
    if (lessons.length === 0) {
      throw new ScormExportError('NO_LESSONS', 'Kurs hat keine Lektionen — nichts zu exportieren')
    }

    const zip = new JSZip()

    // shared.css
    zip.file('shared.css', SHARED_CSS)

    // SCORM 1.2 API-Wrapper-Stub (clients ohne LMS verlieren keine Inhalte)
    zip.file('scorm-stub.js', SCORM_STUB_JS)

    // Pro Lesson eine HTML-Seite
    const items: { id: string; title: string; href: string }[] = []
    for (let i = 0; i < lessons.length; i += 1) {
      const lesson = lessons[i]
      const blocks = await db
        .select()
        .from(courseLessonBlocks)
        .where(eq(courseLessonBlocks.lessonId, lesson.id))
        .orderBy(asc(courseLessonBlocks.position))
      const fileName = `lesson-${i + 1}-${slugForFile(lesson.slug)}.html`
      const html = renderLessonHtml(lesson.title, blocks)
      zip.file(fileName, html)
      items.push({
        id: `ITEM-${i + 1}`,
        title: lesson.title,
        href: fileName,
      })
    }

    // imsmanifest.xml (SCORM 1.2)
    const manifestId = randomUUID()
    zip.file('imsmanifest.xml', buildManifest12(manifestId, course.title, items))

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

    await AuditLogService.log({
      userId: actor.userId,
      userRole: actor.userRole,
      action: 'scorm.exported',
      entityType: 'course',
      entityId: courseId,
      payload: { lessonCount: lessons.length, bytes: buffer.length },
    })
    logger.info(`SCORM exported: Kurs ${courseId} (${lessons.length} Lessons, ${buffer.length} bytes)`, { module: MOD })

    return {
      filename: `${slugForFile(course.slug)}-scorm.zip`,
      buffer,
    }
  },
}

// ============================================
// HTML-Rendering pro Lesson
// ============================================
function renderLessonHtml(title: string, blocks: CourseLessonBlock[]): string {
  const body = blocks
    .filter((b) => b.isVisible)
    .map((b) => renderBlock(b))
    .join('\n')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="shared.css" />
  <script src="scorm-stub.js"></script>
</head>
<body>
  <main class="lesson">
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`
}

function renderBlock(block: CourseLessonBlock): string {
  if (block.kind === 'markdown') {
    const html = marked.parse(block.markdownBody ?? '', { async: false }) as string
    return `<section class="block block-markdown">${html}</section>`
  }
  if (block.kind === 'scorm') {
    // Nested SCORM-Paket — nicht im Export enthalten, nur Hinweis
    return `<section class="block block-scorm-placeholder"><p><em>SCORM-Inhalt (nur in der Original-Plattform verfuegbar)</em></p></section>`
  }
  // Generische CMS-Bloecke: minimal-render (heading, text, image, video, cta)
  const content = (block.content as Record<string, unknown>) ?? {}
  const blockType = block.blockType ?? ''
  switch (blockType) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(content.level ?? 2)))
      return `<h${level}>${escapeHtml(String(content.text ?? ''))}</h${level}>`
    }
    case 'text': {
      const html = marked.parse(String(content.content ?? ''), { async: false }) as string
      return `<section class="block">${html}</section>`
    }
    case 'image': {
      const src = String(content.src ?? '')
      const alt = escapeHtml(String(content.alt ?? ''))
      const caption = content.caption ? `<figcaption>${escapeHtml(String(content.caption))}</figcaption>` : ''
      return src ? `<figure class="block"><img src="${escapeHtml(src)}" alt="${alt}" />${caption}</figure>` : ''
    }
    case 'video': {
      const src = String(content.src ?? '')
      return src
        ? `<section class="block"><video controls src="${escapeHtml(src)}"></video></section>`
        : ''
    }
    case 'cta': {
      const headline = escapeHtml(String(content.headline ?? ''))
      const desc = escapeHtml(String(content.description ?? ''))
      return `<section class="block block-cta"><h2>${headline}</h2><p>${desc}</p></section>`
    }
    default:
      // Fallback: JSON kompakt anzeigen, damit Inhalte nicht verloren gehen
      return `<section class="block block-unknown" data-type="${escapeHtml(blockType)}"><!-- ${escapeHtml(JSON.stringify(content))} --></section>`
  }
}

// ============================================
// imsmanifest.xml — SCORM 1.2 Minimal-Template
// ============================================
function buildManifest12(
  manifestId: string,
  courseTitle: string,
  items: { id: string; title: string; href: string }[],
): string {
  const orgItems = items
    .map(
      (it) =>
        `      <item identifier="${it.id}" identifierref="RES-${it.id}"><title>${escapeXml(it.title)}</title></item>`,
    )
    .join('\n')
  const resources = items
    .map(
      (it) =>
        `    <resource identifier="RES-${it.id}" type="webcontent" adlcp:scormtype="sco" href="${escapeXml(it.href)}"><file href="${escapeXml(it.href)}"/></resource>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-DEFAULT">
    <organization identifier="ORG-DEFAULT">
      <title>${escapeXml(courseTitle)}</title>
${orgItems}
    </organization>
  </organizations>
  <resources>
${resources}
    <resource identifier="RES-SHARED" type="webcontent" adlcp:scormtype="asset"><file href="shared.css"/><file href="scorm-stub.js"/></resource>
  </resources>
</manifest>
`
}

// ============================================
// Helpers
// ============================================
function slugForFile(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 80) || 'lesson'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeXml(s: string): string {
  return escapeHtml(s).replace(/'/g, '&apos;')
}

const SHARED_CSS = `body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;background:#fff;margin:0;padding:0}
.lesson{max-width:780px;margin:2rem auto;padding:0 1rem}
h1,h2,h3{line-height:1.2}
img,video{max-width:100%;height:auto}
.block{margin:1.5rem 0}
.block-cta{background:#f5f5f5;padding:1rem;border-radius:0.5rem}
pre,code{font-family:ui-monospace,monospace;background:#f5f5f5;padding:0.1rem 0.3rem;border-radius:0.25rem}
pre{padding:0.75rem;overflow-x:auto}`

const SCORM_STUB_JS = `// SCORM 1.2 API-Stub: signalisiert "completed" beim ersten Laden,
// damit der Inhalt auch ausserhalb eines LMS sinnvoll bleibt.
(function(){
  function findApi(win){
    var depth = 0;
    while(win && win.API == null && win.parent && win.parent !== win && depth < 7){
      win = win.parent; depth += 1;
    }
    return win ? win.API : null;
  }
  var api = findApi(window);
  if(!api) return;
  try{
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.lesson_status','completed');
    api.LMSCommit('');
    api.LMSFinish('');
  }catch(e){/* noop */}
})();`
