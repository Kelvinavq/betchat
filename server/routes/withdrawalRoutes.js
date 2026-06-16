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
  refreshWithdrawalStatusHandler,
  reconcileHgCashLogHandler,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  getAuditLog,
} from '../controllers/withdrawalController.js'

const router = Router()
router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/',                      getAdminWithdrawals)
router.get('/config',                getWithdrawalConfig)
router.put('/config',                updateWithdrawalConfig)
router.get('/chat/:chatId',          listWithdrawals)

router.get('/blacklist',             getBlacklist)
router.post('/blacklist',            addToBlacklist)
router.delete('/blacklist/:id',      removeFromBlacklist)

router.post('/reconcile-log',        reconcileHgCashLogHandler)

router.put('/:id/resolve',           resolveWithdrawal)
router.put('/:id/pending',           setWithdrawalPending)
router.post('/:id/analyze',          analyzeWithdrawal)
router.post('/:id/refresh',          refreshWithdrawalStatusHandler)
router.get('/:id/audit',             getAuditLog)

export default router
