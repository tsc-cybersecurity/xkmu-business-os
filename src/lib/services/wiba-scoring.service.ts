import { db } from '@/lib/db'
import { wibaAnswers, wibaRequirements } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export interface WibaScoringResult {
  currentScore: number
  maxScore: number
  categoryProgress: Record<number, number>
  totalRequirements: number
  answeredRequirements: number
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
}

export const WibaScoringService = {
  /**
   * Calculate score for a WiBA audit session.
   *
   * Scoring Rules (WiBA / Weg in die Basis-Absicherung):
   * - Each question = 1 point if 'ja', 0 if 'nein'
   * - 'nicht_relevant' questions are excluded from max score
   * - No grouping - flat per-question scoring
   * - Category progress shows percentage per category (19 categories)
   */
  async calculateScore(sessionId: string): Promise<WibaScoringResult> {
    const answers = await db
      .select()
      .from(wibaAnswers)
      .where(eq(wibaAnswers.sessionId, sessionId))

    const allRequirements = await db
      .select()
      .from(wibaRequirements)
      .orderBy(asc(wibaRequirements.id))

    const answerMap = new Map<number, string>()
    for (const answer of answers) {
      answerMap.set(answer.requirementId, answer.status)
    }

    let maxScore = 0
    let currentScore = 0
    let jaCount = 0
    let neinCount = 0
    let nichtRelevantCount = 0

    const categoryCounts = new Map<number, { ja: number; total: number }>()

    for (const req of allRequirements) {
      if (!categoryCounts.has(req.category)) {
        categoryCounts.set(req.category, { ja: 0, total: 0 })
      }

      const status = answerMap.get(req.id)

      if (status === 'nicht_relevant') {
        nichtRelevantCount++
        continue
      }

      maxScore += 1
      const category = categoryCounts.get(req.category)!
      category.total++

      if (!status) continue

      if (status === 'ja') {
        currentScore += 1
        category.ja++
        jaCount++
      } else if (status === 'nein') {
        neinCount++
      }
    }

    const categoryProgress: Record<number, number> = {}
    categoryCounts.forEach((value, key) => {
      categoryProgress[key] = value.total > 0 ? Math.round((value.ja / value.total) * 100) : 0
    })

    return {
      currentScore,
      maxScore,
      categoryProgress,
      totalRequirements: allRequirements.length,
      answeredRequirements: jaCount + neinCount + nichtRelevantCount,
      jaCount,
      neinCount,
      nichtRelevantCount,
    }
  },

  getRiskLevel(currentScore: number, maxScore: number): { level: string; color: string; description: string } {
    if (maxScore === 0) {
      return { level: 'Unbekannt', color: 'gray', description: 'Keine Bewertung moeglich' }
    }

    const percentage = (currentScore / maxScore) * 100

    if (percentage >= 90) {
      return { level: 'Sehr gut', color: 'green', description: 'Ihr Unternehmen hat ein sehr gutes IT-Sicherheitsniveau.' }
    } else if (percentage >= 75) {
      return { level: 'Gut', color: 'lightgreen', description: 'Ihr Unternehmen hat ein gutes IT-Sicherheitsniveau, mit kleineren Verbesserungspotenzialen.' }
    } else if (percentage >= 50) {
      return { level: 'Mittel', color: 'yellow', description: 'Ihr Unternehmen hat ein mittleres IT-Sicherheitsniveau. Es bestehen erhebliche Verbesserungspotenziale.' }
    } else if (percentage >= 25) {
      return { level: 'Niedrig', color: 'orange', description: 'Ihr Unternehmen hat ein niedriges IT-Sicherheitsniveau. Dringender Handlungsbedarf besteht.' }
    } else {
      return { level: 'Kritisch', color: 'red', description: 'Ihr Unternehmen hat ein kritisches IT-Sicherheitsniveau. Sofortiger Handlungsbedarf!' }
    }
  },
}
