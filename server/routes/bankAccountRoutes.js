import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  updateBankAccount,
} from '../controllers/bankAccountController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getBankAccounts)
router.post('/', authenticateToken, requireRole('admin'), createBankAccount)
router.put('/:id', authenticateToken, requireRole('admin'), updateBankAccount)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteBankAccount)

export default router
