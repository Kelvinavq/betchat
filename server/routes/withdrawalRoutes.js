import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { resolveWithdrawal, setWithdrawalPending } from '../controllers/withdrawalController.js'

const router = Router()
router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.put('/:id/resolve', resolveWithdrawal)
router.put('/:id/pending', setWithdrawalPending)

export default router
