interface DevRequirement {
  tool: string
  neededFunction: string
  approach: string
  effort: string
  priority: string
}

interface Step {
  nr: number | string
  action: string
  tool?: string
  hint?: string
}

interface DevTask {
  id: string
  taskKey: string
  title: string
  subprocess: string | null
  purpose: string | null
  trigger: string | null
  timeEstimate: string | null
  tools: string[]
  steps: Step[]
  expectedOutput: string | null
  appStatus: string | null
  appModule: string | null
  appNotes: string | null
  devRequirements: DevRequirement[]
  processKey: string
  processName: string
}

export function generateMarkdown(tasks: DevTask[], filters: { effort: string; priority: string; appStatus: string; tool: string }): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]
  lines.push(`# Programmierauftraege xKMU BusinessOS`)
  lines.push(``)
  lines.push(`**Generiert:** ${date}`)
  lines.push(`**Filter:** Aufwand=${filters.effort || 'alle'}, Prioritaet=${filters.priority || 'alle'}, Status=${filters.appStatus || 'alle'}, Tool=${filters.tool || 'alle'}`)
  lines.push(`**Anzahl Aufgaben:** ${tasks.length}`)
  lines.push(``)
  const totalReqs = tasks.reduce((sum, t) => sum + t.devRequirements.length, 0)
  const byEffort = { S: 0, M: 0, L: 0, XL: 0 }
  const byPriority = { hoch: 0, mittel: 0, niedrig: 0 }
  for (const t of tasks) {
    for (const r of t.devRequirements) {
      if (r.effort in byEffort) byEffort[r.effort as keyof typeof byEffort]++
      if (r.priority in byPriority) byPriority[r.priority as keyof typeof byPriority]++
    }
  }
  lines.push(`## Uebersicht\n`)
  lines.push(`| Kennzahl | Wert |`)
  lines.push(`|----------|------|`)
  lines.push(`| Programmieranforderungen gesamt | ${totalReqs} |`)
  lines.push(`| Aufwand S (klein) | ${byEffort.S} |`)
  lines.push(`| Aufwand M (mittel) | ${byEffort.M} |`)
  lines.push(`| Aufwand L (gross) | ${byEffort.L} |`)
  lines.push(`| Aufwand XL (sehr gross) | ${byEffort.XL} |`)
  lines.push(`| Prioritaet hoch | ${byPriority.hoch} |`)
  lines.push(`| Prioritaet mittel | ${byPriority.mittel} |`)
  lines.push(`| Prioritaet niedrig | ${byPriority.niedrig} |`)
  lines.push(`\n---\n`)
  const grouped = new Map<string, DevTask[]>()
  for (const task of tasks) {
    const key = `${task.processKey} ${task.processName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(task)
  }
  for (const [processName, processTasks] of grouped) {
    lines.push(`## ${processName}\n`)
    for (const task of processTasks) {
      lines.push(`### ${task.taskKey}: ${task.title}\n`)
      if (task.subprocess) lines.push(`**Teilprozess:** ${task.subprocess}`)
      lines.push(`**App-Status:** ${task.appStatus === 'full' ? 'Voll abgedeckt' : task.appStatus === 'partial' ? 'Teilweise abgedeckt' : 'Fehlt'}`)
      if (task.appModule) lines.push(`**App-Modul:** ${task.appModule}`)
      if (task.appNotes) lines.push(`**Aktueller Stand:** ${task.appNotes}`)
      lines.push(``)
      for (const req of task.devRequirements) {
        lines.push(`#### ${req.tool}: ${req.neededFunction}\n`)
        lines.push(`- **Aufwand:** ${req.effort} | **Prioritaet:** ${req.priority}`)
        lines.push(`- **Umsetzungsansatz:** ${req.approach}\n`)
      }
      lines.push(`---\n`)
    }
  }
  return lines.join('\n')
}

export function generateSingleTaskMd(task: DevTask, req: DevRequirement): string {
  const lines: string[] = []
  const date = new Date().toISOString().split('T')[0]
  lines.push(`# Programmierauftrag: ${req.tool} - ${req.neededFunction}\n`)
  lines.push(`**Datum:** ${date}`)
  lines.push(`**Aufwand:** ${req.effort} | **Prioritaet:** ${req.priority}`)
  lines.push(`**Prozess:** ${task.processKey} ${task.processName}`)
  lines.push(`**Aufgabe:** ${task.taskKey} - ${task.title}`)
  if (task.subprocess) lines.push(`**Teilprozess:** ${task.subprocess}`)
  if (task.timeEstimate) lines.push(`**Zeitaufwand Prozessschritt:** ${task.timeEstimate}`)
  lines.push(`\n## Prozesskontext\n`)
  if (task.purpose) lines.push(`**Zweck der Aufgabe:** ${task.purpose}`)
  if (task.trigger) lines.push(`**Ausloeser:** ${task.trigger}`)
  lines.push(`**Externe Tools:** ${(task.tools || []).join(', ') || 'keine'}\n`)
  if (Array.isArray(task.steps) && task.steps.length > 0) {
    lines.push(`**Prozessschritte:**`)
    task.steps.forEach(s => lines.push(`${s.nr}. ${s.action}${s.tool ? ` [${s.tool}]` : ''}${s.hint ? ` *(${s.hint})*` : ''}`))
    lines.push(``)
  }
  if (task.expectedOutput) lines.push(`**Erwartetes Ergebnis:** ${task.expectedOutput}\n`)
  lines.push(`## Aktueller App-Stand\n`)
  lines.push(`- **Status:** ${task.appStatus === 'full' ? 'Voll abgedeckt' : task.appStatus === 'partial' ? 'Teilweise abgedeckt' : 'Fehlt'}`)
  if (task.appModule) lines.push(`- **Vorhandenes Modul:** ${task.appModule}`)
  if (task.appNotes) lines.push(`- **Details:** ${task.appNotes}`)
  lines.push(`\n## Programmieranforderung\n`)
  lines.push(`**Tool das ersetzt/integriert wird:** ${req.tool}\n`)
  lines.push(`**Benoetigte Funktion:** ${req.neededFunction}\n`)
  lines.push(`## Umsetzungsansatz\n`)
  lines.push(req.approach)
  return lines.join('\n')
}

export function downloadMd(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildAiPrompt(task: DevTask): string {
  const stepsWithoutTools = Array.isArray(task.steps) && task.steps.length > 0
    ? task.steps.map(s => `  ${s.nr}. ${s.action}`).join('\n') : ''
  const taskContext = [
    `Prozess: ${task.processKey} ${task.processName}`,
    task.subprocess ? `Teilprozess: ${task.subprocess}` : '',
    `Aufgabe: ${task.taskKey} - ${task.title}`,
    task.purpose ? `Zweck: ${task.purpose}` : '',
    task.trigger ? `Ausloeser: ${task.trigger}` : '',
    stepsWithoutTools ? `Schritte:\n${stepsWithoutTools}` : '',
    task.appStatus ? `Aktueller App-Status: ${task.appStatus === 'full' ? 'Vorhanden' : task.appStatus === 'partial' ? 'Teilweise' : 'Fehlt'}` : '',
    task.appModule ? `Vorhandenes App-Modul: ${task.appModule}` : '',
    task.appNotes ? `App-Notizen: ${task.appNotes}` : '',
  ].filter(Boolean).join('\n')

  return `Erstelle eine Programmieranforderung zur Erweiterung der App xKMU BusinessOS.

PRAEMISSE: Die beschriebene Funktionalitaet soll vollstaendig IN DER APP bereitgestellt werden. Keine externen Tools empfehlen — alles wird als App-Feature gebaut.

Die App hat bereits: CRM (Firmen, Personen, Leads, Aktivitaeten), Finance (Rechnungen, Angebote, PDF-Export), Blog (KI-Generierung, SEO), Social Media (Posts, Content-Plan), Marketing (Kampagnen, KI Marketing Agent), Bildgenerierung (Multi-Provider), Business Intelligence (SWOT-Analyse), Chat (Multi-Provider KI), Cybersecurity (DIN-Audit, WiBA-Check), CMS (Seiten, Blocks), n8n-Workflows, Cockpit (Monitoring), Prozesshandbuch, Einstellungen (KI-Provider, Prompt-Templates, Webhooks, API-Keys, Rollen).

Techstack: Next.js 16, React 19, PostgreSQL, Drizzle ORM, Tailwind CSS, shadcn/ui, sonner (Toasts).

=== AUFGABE ===
${taskContext}

=== AUFTRAG ===
Erstelle eine detaillierte Programmieranforderung:
1. Wie kann die Funktionalitaet in der App bereitgestellt werden?
2. Welches bestehende App-Modul kann erweitert werden?
3. Welche neuen DB-Tabellen/Felder sind noetig?
4. Welche API-Endpoints muessen erstellt werden?
5. Welche UI-Komponenten werden gebraucht?
6. Geschaetzter Aufwand: S(1-2h), M(3-8h), L(1-3 Tage), XL(3+ Tage)

Antworte als JSON-Array:
[{"neededFunction":"Praezise Beschreibung der Funktion", "approach":"Detaillierter Umsetzungsansatz: Modul, DB-Tabellen, API-Endpoints, UI-Komponenten, Ablauf", "effort":"S|M|L|XL", "priority":"hoch|mittel|niedrig"}]`
}
