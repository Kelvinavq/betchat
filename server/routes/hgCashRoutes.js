import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { hgWebhook, hgSyncTransactions } from '../controllers/hgCashController.js'

const router = Router()

// Webhook receives raw body; HMAC-SHA256 is the only auth
router.post('/webhook', hgWebhook)

// Admin-triggered poll sync
router.post('/:id/sync', authenticateToken, requireRole('admin'), hgSyncTransactions)

export default router
