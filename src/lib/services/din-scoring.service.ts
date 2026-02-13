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
  components: Array<{
    requirement: DinRequirement
    answer?: DinAnswer
  }>
}

export const DinScoringService = {
  /**
   * Calculate score for an audit session according to DIN SPEC 27076
   *
   * Scoring Rules (DIN SPEC 27076 page 12):
   * - TOP requirements: 3 points if fulfilled, -3 if not fulfilled
   * - Regular requirements: 1 point if fulfilled, 0 if not fulfilled
   * - Requirements with components: Points only awarded if ALL components fulfilled
   * - Irrelevant requirements: reduce max score by their point value
   * - Floor logic: minimum score is 0
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
    let maxScore = 37
    let currentScore = 0

    const topicScores = new Map<number, { current: number; max: number }>()
    for (let i = 1; i <= 6; i++) {
      topicScores.set(i, { current: 0, max: 0 })
    }

    let fulfilledCount = 0
    let notFulfilledCount = 0
    let irrelevantCount = 0

    for (const group of groups) {
      const points = group.type === 'top' ? 3 : 1
      const topic = topicScores.get(group.topicArea)!

      const hasIrrelevantComponent = group.components.some(
        (c) => c.answer && c.answer.status === 'irrelevant'
      )

      if (hasIrrelevantComponent) {
        maxScore -= points
        irrelevantCount++
        continue
      }

      const allAnswered = group.components.every((c) => c.answer !== undefined)
      if (!allAnswered) continue

      const allFulfilled = group.components.every(
        (c) => c.answer && c.answer.status === 'fulfilled'
      )
      const anyNotFulfilled = group.components.some(
        (c) => c.answer && c.answer.status === 'not_fulfilled'
      )

      if (allFulfilled) {
        currentScore += points
        topic.current += points
        topic.max += points
        fulfilledCount++
      } else if (anyNotFulfilled) {
        if (group.type === 'top') {
          currentScore -= 3
          topic.current -= 3
        }
        topic.max += points
        notFulfilledCount++
      }

      topicScores.set(group.topicArea, topic)
    }

    currentScore = Math.max(0, currentScore)

    const topicProgress: Record<number, number> = {}
    topicScores.forEach((value, key) => {
      topicProgress[key] = value.max > 0 ? Math.round((value.current / value.max) * 100) : 0
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
        groupMap.set(groupKey, {
          groupNumber: groupKey,
          type: req.type,
          topicArea: req.topicArea,
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
