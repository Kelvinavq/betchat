export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const normalizeUrl = (base, endpoint) => {
  const trimmedBase = base.replace(/\/+$/, '')
  const trimmedEndpoint = endpoint.replace(/^\/+/, '')
  return `${trimmedBase}/${trimmedEndpoint}`
}

export const resolveApiAsset = (url = '') => {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url
  return normalizeUrl(API_BASE_URL, url)
}

const request = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  const res = await fetch(normalizeUrl(API_BASE_URL, endpoint), {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const message = payload?.error || `HTTP ${res.status}`
    const error = new Error(message)
    error.status = res.status
    error.payload = payload
    const retryAfterHeader = res.headers.get('retry-after')
    if (retryAfterHeader) {
      const retryAfter = Number(retryAfterHeader)
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        error.retryAfter = retryAfter
      }
    }

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { code: payload?.code, data: payload },
      }))
    }

    throw error
  }

  return res.json()
}

const serializeBody = (body) => {
  if (body === undefined) return undefined
  if (body instanceof FormData) return body
  return JSON.stringify(body)
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: serializeBody(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: serializeBody(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}
