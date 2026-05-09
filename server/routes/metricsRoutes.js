import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { getMetrics } from '../controllers/metricsController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/', getMetrics)

export default router
