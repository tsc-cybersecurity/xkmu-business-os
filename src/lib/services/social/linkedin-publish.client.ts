// LinkedIn Posts API (versionierte REST API).
// Doku: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
// Endpoint: POST https://api.linkedin.com/rest/posts mit Header LinkedIn-Version: YYYYMM
//
// Wir posten als Person (urn:li:person:{sub}). Bilder werden im MVP nicht
// hochgeladen — der Image-Upload-Flow ist 3-stufig (registerUpload → PUT bytes
// → asset URN in Post) und braucht separate Tests. Aktuell text-only.

import type { PublishResult } from './social-provider'

const POSTS_ENDPOINT = 'https://api.linkedin.com/rest/posts'
// Versions-Header (Format YYYYMM). LinkedIn-API verlangt diesen Header bei
// /rest/-Endpoints. Aktuelle GA-Version, kann bei Bedarf hochgezogen werden.
const LINKEDIN_VERSION = '202503'

export interface PublishPostParams {
  accessToken: string
  /** Author-URN, z.B. urn:li:person:abc123 */
  authorUrn: string
  text: string
}

export const LinkedInPublishClient = {
  async publish(params: PublishPostParams): Promise<PublishResult> {
    try {
      const body = {
        author: params.authorUrn,
        commentary: params.text,
        visibility: 'PUBLIC' as const,
        distribution: {
          feedDistribution: 'MAIN_FEED' as const,
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED' as const,
        isReshareDisabledByAuthor: false,
      }
      const res = await fetch(POSTS_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': LINKEDIN_VERSION,
        },
        body: JSON.stringify(body),
      })
      // 201 Created bei Erfolg. Post-URN steht im Header x-restli-id, alternativ
      // im Response-Body als id.
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        let parsed: any = null
        try { parsed = JSON.parse(txt) } catch { /* nicht JSON */ }
        const error = parsed?.message
          ?? parsed?.error
          ?? txt.slice(0, 200)
          ?? `linkedin_http_${res.status}`
        const revokeAccount = res.status === 401
        return { ok: false, error: String(error), revokeAccount }
      }
      // 201: Post-URN extrahieren
      const postUrn = res.headers.get('x-restli-id')
        ?? res.headers.get('x-linkedin-id')
        ?? null
      if (!postUrn) {
        return { ok: false, error: 'linkedin_no_post_urn', revokeAccount: false }
      }
      // URN-Format: urn:li:share:1234567890. Public-URL fuer Feed-Anzeige:
      const externalUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/`
      return { ok: true, externalPostId: postUrn, externalUrl }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'linkedin_publish_unknown'
      return { ok: false, error: message, revokeAccount: false }
    }
  },
}
