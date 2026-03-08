import { db } from '@/lib/db'
import { dinAnswers, dinRequirements } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import type { DinRequirement, DinAnswer } from '@/lib/db/schema'

export interface ScoringResult {
  currentScore: number
  maxScore: number
  topicProgress: Record<number, number>
  totalRequirements: number
  answeredRequirements: number
  fulfilledRequirements: number
  notFulfilledRequirements: number
  irrelevantRequirements: number
}

interface RequirementGroup {
  groupNumber: string
  type: string
  topicArea: number
  points: number
  components: Array<{
    requirement: DinRequirement
    answer?: DinAnswer
  }>
}

export const DinScoringService = {
  /**
   * Calculate score for an audit session according to DIN SPEC 27076.
   *
   * Scoring Rules (DIN SPEC 27076, Section 6.4.1, page 12):
   * - TOP requirements: +3 points if fulfilled, −3 if not fulfilled
   * - Regular requirements: +1 point if fulfilled, 0 if not fulfilled
   * - Points are awarded per GROUP (not per component). A group only scores
   *   if ALL its components are fulfilled.
   * - Irrelevant requirements: reduce max score by their point value
   * - Maximum possible score: 5×3 + 22×1 = 37 (dynamic based on relevance)
   * - Floor: score cannot go below 0
   *
   * Topic progress (Section 6.4.2.2, page 14):
   * - Spider diagram shows percentage of fulfilled requirements per topic
   * - Each fulfilled requirement increases progress proportionally
   */
  async calculateScore(sessionId: string): Promise<ScoringResult> {
    const answers = await db
      .select()
      .from(dinAnswers)
      .where(eq(dinAnswers.sessionId, sessionId))

    const allRequirements = await db
      .select()
      .from(dinRequirements)
      .orderBy(asc(dinRequirements.id))

    // Build answer map
    const answerMap = new Map<number, DinAnswer>()
    for (const answer of answers) {
      answerMap.set(answer.requirementId, answer)
    }

    // Group requirements by groupNumber
    const groups = this.groupRequirements(allRequirements, answerMap)

    // Standard maximum: 5 TOP requirements (3 points each) + 22 regular (1 point each) = 37
    let maxScore = 0
    let currentScore = 0

    // Topic tracking: fulfilled count / total count per topic
    const topicCounts = new Map<number, { fulfilled: number; total: number }>()
    for (let i = 1; i <= 6; i++) {
      topicCounts.set(i, { fulfilled: 0, total: 0 })
    }

    let fulfilledCount = 0
    let notFulfilledCount = 0
    let irrelevantCount = 0

    for (const group of groups) {
      const points = group.points
      const topic = topicCounts.get(group.topicArea)!

      const hasIrrelevantComponent = group.components.some(
        (c) => c.answer && c.answer.status === 'irrelevant'
      )

      if (hasIrrelevantComponent) {
        // Per DIN SPEC 6.4.1: irrelevant requirements reduce max achievable score
        irrelevantCount++
        continue
      }

      // This group is relevant - add its points to max score
      maxScore += points
      topic.total++

      const allAnswered = group.components.every((c) => c.answer !== undefined)
      if (!allAnswered) continue

      const allFulfilled = group.components.every(
        (c) => c.answer && c.answer.status === 'fulfilled'
      )
      const anyNotFulfilled = group.components.some(
        (c) => c.answer && c.answer.status === 'not_fulfilled'
      )

      if (allFulfilled) {
        // Per DIN SPEC 6.4.1: points only if ALL components fulfilled
        currentScore += points
        topic.fulfilled++
        fulfilledCount++
      } else if (anyNotFulfilled) {
        if (group.type === 'top') {
          // Per DIN SPEC 6.4.1: TOP requirements get −3 if not fulfilled
          currentScore -= points
        }
        // Regular: 0 points if not fulfilled (no change to currentScore)
        notFulfilledCount++
      }
    }

    // Per DIN SPEC 6.4.1: score cannot be negative
    currentScore = Math.max(0, currentScore)

    // Per DIN SPEC 6.4.2.2 page 14: spider diagram shows percentage of
    // fulfilled requirements per topic area
    const topicProgress: Record<number, number> = {}
    topicCounts.forEach((value, key) => {
      topicProgress[key] = value.total > 0 ? Math.round((value.fulfilled / value.total) * 100) : 0
    })

    return {
      currentScore,
      maxScore,
      topicProgress,
      totalRequirements: groups.length,
      answeredRequirements: fulfilledCount + notFulfilledCount,
      fulfilledRequirements: fulfilledCount,
      notFulfilledRequirements: notFulfilledCount,
      irrelevantRequirements: irrelevantCount,
    }
  },

  groupRequirements(
    allRequirements: DinRequirement[],
    answerMap: Map<number, DinAnswer>
  ): RequirementGroup[] {
    const groupMap = new Map<string, RequirementGroup>()

    for (const req of allRequirements) {
      // Skip status questions (componentNumber === 0)
      if (req.componentNumber === 0) continue

      const groupKey = req.groupNumber || req.number

      if (!groupMap.has(groupKey)) {
        // Use points from DB if available, otherwise derive from type
        const points = req.points ?? (req.type === 'top' ? 3 : 1)
        groupMap.set(groupKey, {
          groupNumber: groupKey,
          type: req.type,
          topicArea: req.topicArea,
          points,
          components: [],
        })
      }

      const group = groupMap.get(groupKey)!
      group.components.push({
        requirement: req,
        answer: answerMap.get(req.id),
      })
    }

    return Array.from(groupMap.values())
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
