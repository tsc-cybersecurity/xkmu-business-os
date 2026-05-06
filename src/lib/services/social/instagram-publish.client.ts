import type { PublishResult } from './social-provider'

const GRAPH_IG = 'https://graph.instagram.com/v23.0'

export interface InstagramPublishInput {
  igUserId: string
  accessToken: string
  caption: string
  imageUrl: string | null
}

async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams(params)
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body: json }
}

function asFailure(status: number, body: any): { ok: false; error: string; revokeAccount: boolean } {
  const msg = body?.error?.message ?? `instagram_http_${status}`
  return { ok: false, error: msg, revokeAccount: status === 401 || status === 403 }
}

export const InstagramPublishClient = {
  async publishImage(input: InstagramPublishInput): Promise<PublishResult> {
    const { igUserId, accessToken, caption, imageUrl } = input
    if (!imageUrl) {
      return { ok: false, error: 'instagram_requires_image', revokeAccount: false }
    }

    const step1 = await postForm(`${GRAPH_IG}/${igUserId}/media`, {
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    })
    if (!step1.ok) return asFailure(step1.status, step1.body)
    const containerId = step1.body.id

    const step2 = await postForm(`${GRAPH_IG}/${igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: accessToken,
    })
    if (!step2.ok) return asFailure(step2.status, step2.body)
    return { ok: true, externalPostId: step2.body.id, externalUrl: null }
  },
}
