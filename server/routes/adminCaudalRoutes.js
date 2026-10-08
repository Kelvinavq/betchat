import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  listTransactionEvents,
  getTransactionDetail,
  getMetrics,
  resolveTransaction,
  assignTransactionToClient,
  clearTransactionClientAssignment,
  getWithdrawalStatus,
  simulateTransaction,
  getClientCaudalDeposits,
  getClientCaudalWithdrawals,
} from '../controllers/adminCaudalController.js'

const router = Router()

router.use(authenticateToken, requireRole('admin'))

router.get('/events',                                    listTransactionEvents)
router.get('/events/:externalTransactionId',             getTransactionDetail)
router.get('/metrics',                                   getMetrics)
router.post('/events/:externalTransactionId/resolve',    resolveTransaction)
router.post('/events/:externalTransactionId/assign',     assignTransactionToClient)
router.delete('/events/:externalTransactionId/assign',   clearTransactionClientAssignment)
router.get('/withdrawals/:externalId/status',            getWithdrawalStatus)
router.post('/simulate', requireRole('superadmin'),      simulateTransaction)
router.get('/client/:clientId/deposits',    getClientCaudalDeposits)
router.get('/client/:clientId/withdrawals', getClientCaudalWithdrawals)

export default router
