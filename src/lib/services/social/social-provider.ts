import type { SocialMediaPost } from '@/lib/db/schema'

export interface PublishSuccess {
  ok: true
  externalPostId: string
  externalUrl: string | null
}

export interface PublishFailure {
  ok: false
  error: string
  /** True bei 401/403 — Account muss als revoked markiert werden, kein Retry. */
  revokeAccount: boolean
}

export type PublishResult = PublishSuccess | PublishFailure

export interface SocialProvider {
  /** Identifier matching `social_oauth_accounts.provider`. */
  readonly name: 'facebook' | 'instagram' | 'x' | 'linkedin'

  /**
   * Publish `post.content` (and optionally `post.imageUrl`) to the provider's
   * API. Returns PublishResult — the caller persists status + external IDs.
   *
   * Implementations must NOT throw on API errors; failures are returned as
   * PublishFailure with `revokeAccount` set when the credentials are dead.
   */
  publish(post: SocialMediaPost): Promise<PublishResult>
}
