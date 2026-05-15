import { Router } from 'express'
import {
  getActiveEvents,
  playEvent,
  uploadReceipt,
  uploadReceiptMiddleware,
} from '../controllers/clientEventsController.js'

const router = Router()

// GET /api/client/events/active — public, optional auth for has_played flag
router.get('/active', getActiveEvents)

// POST /api/client/events/:id/play — requires client JWT cookie
router.post('/:id/play', playEvent)

// POST /api/client/events/:id/receipt — requires client JWT cookie + multipart file
router.post(
  '/:id/receipt',
  (req, res, next) => {
    uploadReceiptMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Error al subir archivo.' })
      next()
    })
  },
  uploadReceipt
)

export default router
