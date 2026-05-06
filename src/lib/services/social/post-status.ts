// src/lib/services/social/post-status.ts

export const PostStatus = {
  Draft: 'draft',
  Approved: 'approved',
  Scheduled: 'scheduled',
  Posted: 'posted',
  PartiallyFailed: 'partially_failed',
  Failed: 'failed',
} as const
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus]

export const TargetStatus = {
  Pending: 'pending',
  Publishing: 'publishing',
  Posted: 'posted',
  Failed: 'failed',
} as const
export type TargetStatus = (typeof TargetStatus)[keyof typeof TargetStatus]

const ALLOWED: Record<PostStatus, PostStatus[]> = {
  [PostStatus.Draft]: [PostStatus.Approved],
  [PostStatus.Approved]: [PostStatus.Draft, PostStatus.Scheduled, PostStatus.Posted, PostStatus.PartiallyFailed, PostStatus.Failed],
  [PostStatus.Scheduled]: [PostStatus.Approved, PostStatus.Posted, PostStatus.PartiallyFailed, PostStatus.Failed],
  [PostStatus.Posted]: [],
  [PostStatus.PartiallyFailed]: [],
  [PostStatus.Failed]: [],
}

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * Derives the post-level status from target statuses.
 * Returns null when at least one target is still pending or publishing.
 */
export function deriveOverallStatus(targetStatuses: TargetStatus[]): PostStatus | null {
  if (targetStatuses.length === 0) return null
  if (targetStatuses.some(s => s === TargetStatus.Pending || s === TargetStatus.Publishing)) return null
  const allPosted = targetStatuses.every(s => s === TargetStatus.Posted)
  if (allPosted) return PostStatus.Posted
  const allFailed = targetStatuses.every(s => s === TargetStatus.Failed)
  if (allFailed) return PostStatus.Failed
  return PostStatus.PartiallyFailed
}
