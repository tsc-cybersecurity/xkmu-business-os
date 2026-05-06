import type { PublishResult } from './social-provider'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface FbInput {
  pageId: string
  pageAccessToken: string
  message: string
  imageUrl: string | null
}

interface IgInput {
  igUserId: string
  pageAccessToken: string
  caption: string
  imageUrl: string | null
}

async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: any }> {
  const body = new URLSearchParams(params)
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body: json }
}

function asFailure(
  status: number,
  body: any,
): { ok: false; error: string; revokeAccount: boolean } {
  const msg = body?.error?.message ?? `meta_http_${status}`
  return { ok: false, error: msg, revokeAccount: status === 401 || status === 403 }
}

export const MetaPublishClient = {
  async publishToFacebookPage(input: FbInput): Promise<PublishResult> {
    const { pageId, pageAccessToken, message, imageUrl } = input

    if (imageUrl) {
      const r = await postForm(`${GRAPH_BASE}/${pageId}/photos`, {
        url: imageUrl,
        caption: message,
        access_token: pageAccessToken,
      })
      if (!r.ok) return asFailure(r.status, r.body)
      const externalPostId = r.body.post_id ?? r.body.id
      return {
        ok: true,
        externalPostId,
        externalUrl: `https://www.facebook.com/${externalPostId}`,
      }
    }

    const r = await postForm(`${GRAPH_BASE}/${pageId}/feed`, {
      message,
      access_token: pageAccessToken,
    })
    if (!r.ok) return asFailure(r.status, r.body)
    return {
      ok: true,
      externalPostId: r.body.id,
      externalUrl: `https://www.facebook.com/${r.body.id}`,
    }
  },

  async publishToInstagram(input: IgInput): Promise<PublishResult> {
    const { igUserId, pageAccessToken, caption, imageUrl } = input

    if (!imageUrl) {
      return { ok: false, error: 'instagram_requires_image', revokeAccount: false }
    }

    const step1 = await postForm(`${GRAPH_BASE}/${igUserId}/media`, {
      image_url: imageUrl,
      caption,
      access_token: pageAccessToken,
    })
    if (!step1.ok) return asFailure(step1.status, step1.body)

    const containerId = step1.body.id

    const step2 = await postForm(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: pageAccessToken,
    })
    if (!step2.ok) return asFailure(step2.status, step2.body)

    return { ok: true, externalPostId: step2.body.id, externalUrl: null }
  },
}
