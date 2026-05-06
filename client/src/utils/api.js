const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const normalizeUrl = (base, endpoint) => {
  const trimmedBase = base.replace(/\/+$/, '')
  const trimmedEndpoint = endpoint.replace(/^\/+/, '')
  return `${trimmedBase}/${trimmedEndpoint}`
}

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const res = await fetch(normalizeUrl(BASE_URL, endpoint), {
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
    throw error
  }

  return res.json()
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}
