import express from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'

const router = express.Router()
const SUPPORT_API_URL = (process.env.SUPPORT_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '')
const INTERNAL_API_KEY = process.env.SUPPORT_INTERNAL_API_KEY || ''

function forwardHeaders(req) {
  return {
    'Content-Type': req.headers['content-type'] || 'application/json',
    ...(INTERNAL_API_KEY ? { 'x-internal-api-key': INTERNAL_API_KEY } : {}),
    ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
  }
}

async function proxy(req, res, path) {
  const url = `${SUPPORT_API_URL}${path}`
  const init = {
    method: req.method,
    headers: forwardHeaders(req),
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = JSON.stringify(req.body ?? {})
  }

  const response = await fetch(url, init)
  const text = await response.text()
  const contentType = response.headers.get('content-type') || 'application/json'
  res.status(response.status).setHeader('content-type', contentType).send(text)
}

router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/stats', (req, res, next) => { proxy(req, res, '/tickets/stats').catch(next) })
router.get('/tickets', (req, res, next) => {
  const qs = new URLSearchParams(req.query).toString()
  proxy(req, res, `/tickets${qs ? `?${qs}` : ''}`).catch(next)
})
router.get('/tickets/:id', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}`).catch(next))
router.put('/tickets/:id', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}`).catch(next))
router.post('/tickets', (req, res, next) => proxy(req, res, '/tickets').catch(next))
router.delete('/tickets/:id', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}`).catch(next))
router.get('/tickets/:id/messages', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}/messages`).catch(next))
router.post('/tickets/:id/messages', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}/messages`).catch(next))
router.get('/tickets/:id/history', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}/history`).catch(next))
router.post('/tickets/:id/attachments', (req, res, next) => proxy(req, res, `/tickets/${req.params.id}/attachments`).catch(next))
router.get('/tickets/meta/tags', (req, res, next) => proxy(req, res, '/tickets/meta/tags').catch(next))

export default router
