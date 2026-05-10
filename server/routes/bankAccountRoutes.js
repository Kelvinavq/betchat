import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  updateBankAccount,
  getBankAccountMovements,
  fetchHgCashBalance,
} from '../controllers/bankAccountController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getBankAccounts)
router.get('/:id/movements',  authenticateToken, requireRole('admin'), getBankAccountMovements)
router.get('/:id/hg-balance', authenticateToken, requireRole('admin'), fetchHgCashBalance)
router.post('/', authenticateToken, requireRole('admin'), createBankAccount)
router.put('/:id', authenticateToken, requireRole('admin'), updateBankAccount)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteBankAccount)

export default router
