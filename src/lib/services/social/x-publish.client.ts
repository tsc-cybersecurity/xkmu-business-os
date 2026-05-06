// X (Twitter) Publishing — Free Tier.
// POST /2/tweets mit JSON-Body { text }. Bilder waeren via v1.1 media/upload
// moeglich, das ist im Free Tier nicht standardmaessig erlaubt — wir posten
// daher text-only und ignorieren imageUrl mit Hinweis im Result.

import type { PublishResult } from './social-provider'

const TWEETS_ENDPOINT = 'https://api.x.com/2/tweets'

export interface PublishTweetParams {
  accessToken: string
  text: string
}

export const XPublishClient = {
  async publish(params: PublishTweetParams): Promise<PublishResult> {
    try {
      const res = await fetch(TWEETS_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: params.text }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const error = body?.error_description
          ?? body?.detail
          ?? body?.errors?.[0]?.message
          ?? body?.title
          ?? `x_http_${res.status}`
        // 401/403 deuten auf Token-Probleme hin → Account revoken
        const revokeAccount = res.status === 401 || res.status === 403
        return { ok: false, error: String(error), revokeAccount }
      }
      const tweetId = body?.data?.id
      if (!tweetId) return { ok: false, error: 'x_no_tweet_id', revokeAccount: false }
      return {
        ok: true,
        externalPostId: String(tweetId),
        externalUrl: `https://x.com/i/web/status/${tweetId}`,
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'x_publish_unknown'
      return { ok: false, error: message, revokeAccount: false }
    }
  },
}
