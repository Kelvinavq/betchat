import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  resolveWithdrawal,
  setWithdrawalPending,
  listWithdrawals,
  getAdminWithdrawals,
  getWithdrawalConfig,
  updateWithdrawalConfig,
  analyzeWithdrawal,
} from '../controllers/withdrawalController.js'

const router = Router()
router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/',                    getAdminWithdrawals)
router.get('/config',              getWithdrawalConfig)
router.put('/config',              updateWithdrawalConfig)
router.get('/chat/:chatId',        listWithdrawals)
router.put('/:id/resolve',         resolveWithdrawal)
router.put('/:id/pending',         setWithdrawalPending)
router.post('/:id/analyze',        analyzeWithdrawal)

export default router
