import { api } from '../../../../utils/api.js'

const BASE = '/api/events'

export const eventsApi = {
  listEvents: (params = {}) => {
    const q = new URLSearchParams()
    if (params.type) q.set('type', params.type)
    if (params.status) q.set('status', params.status)
    if (params.date_from) q.set('date_from', params.date_from)
    if (params.date_to) q.set('date_to', params.date_to)
    return api.get(`${BASE}?${q}`)
  },
  getEvent: (id) => api.get(`${BASE}/${id}`),
  createEvent: (body) => api.post(BASE, body),
  updateEvent: (id, body) => api.put(`${BASE}/${id}`, body),
  deleteEvent: (id) => api.delete(`${BASE}/${id}`),
  activateEvent: (id) => api.post(`${BASE}/${id}/activate`),
  finishEvent: (id) => api.post(`${BASE}/${id}/finish`),
  cancelEvent: (id) => api.post(`${BASE}/${id}/cancel`),
  participate: (id, body) => api.post(`${BASE}/${id}/participate`, body),
  participants: (id) => api.get(`${BASE}/${id}/participants`),
  rewardsByEvent: (id, status) => {
    const q = status ? `?status=${status}` : ''
    return api.get(`${BASE}/${id}/rewards${q}`)
  },
  templates: {
    list: () => api.get(`${BASE}/templates`),
    create: (body) => api.post(`${BASE}/templates`, body),
    remove: (id) => api.delete(`${BASE}/templates/${id}`),
  },
  automations: {
    list: () => api.get(`${BASE}/automations`),
    create: (body) => api.post(`${BASE}/automations`, body),
    update: (id, body) => api.put(`${BASE}/automations/${id}`, body),
    remove: (id) => api.delete(`${BASE}/automations/${id}`),
    toggle: (id) => api.post(`${BASE}/automations/${id}/toggle`),
  },
  stats: (period = 'today') => api.get(`${BASE}/stats?period=${period}`),
  rewards: (params = {}) => {
    const q = new URLSearchParams()
    if (params.status)   q.set('status',   params.status)
    if (params.eventId)  q.set('eventId',  String(params.eventId))
    if (params.dateFrom) q.set('dateFrom', params.dateFrom)
    if (params.dateTo)   q.set('dateTo',   params.dateTo)
    if (params.page)     q.set('page',     String(params.page))
    if (params.limit)    q.set('limit',    String(params.limit))
    const qs = q.toString()
    return api.get(`${BASE}/rewards${qs ? `?${qs}` : ''}`)
  },
  payReward: (id) => api.post(`${BASE}/rewards/${id}/pay`),
  discardReward: (id, reason) => api.post(`${BASE}/rewards/${id}/discard`, { reason }),
  eventDetail: (id) => api.get(`${BASE}/${id}/detail`),
  resetParticipation: (eventId, participantId) => api.delete(`${BASE}/${eventId}/participants/${participantId}`),
  payBriefcaseWinners: (eventId, voteKeys) => api.post(`${BASE}/${eventId}/pay-briefcase-winners`, { vote_keys: voteKeys }),
  sendVoteReminder: (eventId) => api.post(`${BASE}/${eventId}/send-vote-reminder`),
  rankingParticipants: (eventId) => api.get(`${BASE}/${eventId}/ranking-participants`),
}
