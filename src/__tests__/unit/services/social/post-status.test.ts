import { describe, it, expect } from 'vitest'
import {
  PostStatus, TargetStatus, canTransition, deriveOverallStatus,
} from '@/lib/services/social/post-status'

describe('canTransition', () => {
  it('allows draft → approved', () => {
    expect(canTransition(PostStatus.Draft, PostStatus.Approved)).toBe(true)
  })
  it('forbids draft → posted (must approve first)', () => {
    expect(canTransition(PostStatus.Draft, PostStatus.Posted)).toBe(false)
  })
  it('allows approved → scheduled', () => {
    expect(canTransition(PostStatus.Approved, PostStatus.Scheduled)).toBe(true)
  })
  it('allows scheduled → posted', () => {
    expect(canTransition(PostStatus.Scheduled, PostStatus.Posted)).toBe(true)
  })
  it('allows scheduled → partially_failed and failed', () => {
    expect(canTransition(PostStatus.Scheduled, PostStatus.PartiallyFailed)).toBe(true)
    expect(canTransition(PostStatus.Scheduled, PostStatus.Failed)).toBe(true)
  })
  it('forbids transitions out of terminal states', () => {
    expect(canTransition(PostStatus.Posted, PostStatus.Draft)).toBe(false)
    expect(canTransition(PostStatus.Failed, PostStatus.Approved)).toBe(false)
  })
})

describe('deriveOverallStatus', () => {
  it('returns posted when all targets posted', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Posted])).toBe(PostStatus.Posted)
  })
  it('returns failed when all targets failed', () => {
    expect(deriveOverallStatus([TargetStatus.Failed, TargetStatus.Failed])).toBe(PostStatus.Failed)
  })
  it('returns partially_failed when at least one posted and at least one failed', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Failed])).toBe(PostStatus.PartiallyFailed)
  })
  it('returns null when any target still pending or publishing', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Pending])).toBeNull()
    expect(deriveOverallStatus([TargetStatus.Publishing, TargetStatus.Failed])).toBeNull()
  })
  it('returns null for empty array (defensive)', () => {
    expect(deriveOverallStatus([])).toBeNull()
  })
})
