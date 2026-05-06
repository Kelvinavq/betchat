const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const loadSavedAuth = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('betchat_auth') || 'null')
    return saved?.token || ''
  } catch (error) {
    return ''
  }
}

let authToken = loadSavedAuth()

export const setApiAuthToken = (token) => {
  authToken = token || ''

  try {
    const saved = JSON.parse(localStorage.getItem('betchat_auth') || 'null') || {}
    if (token) {
      localStorage.setItem('betchat_auth', JSON.stringify({ ...saved, token }))
    } else {
      localStorage.removeItem('betchat_auth')
    }
  } catch (error) {
    if (!token) {
      localStorage.removeItem('betchat_auth')
    }
  }
}

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

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
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
