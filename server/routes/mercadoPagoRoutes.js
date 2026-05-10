import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { mpSyncTransactions } from '../controllers/mercadoPagoController.js'

const router = Router()

router.post('/:id/sync', authenticateToken, requireRole('admin'), mpSyncTransactions)

export default router
