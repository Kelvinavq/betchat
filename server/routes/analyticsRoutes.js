import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { getChatAnalytics } from '../controllers/analyticsController.js'

const router = Router()
router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/', getChatAnalytics)

export default router
