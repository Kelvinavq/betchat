import { Router } from 'express'
import {
  getClients,
  getClientStats,
  getClientReferralDetails,
  createClient,
  updateClient,
  deleteClient,
  updateClientPassword,
  adjustClientBalance,
  forceLogoutClient,
} from '../controllers/clientsController.js'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'

const router = Router()

// Todas las rutas requieren autenticación de admin
router.use(authenticateToken)
router.use(requireRole('admin'))

router.get('/stats', getClientStats)
router.get('/', getClients)
router.get('/:id/referral', getClientReferralDetails)
router.post('/', createClient)
router.put('/:id', updateClient)
router.delete('/:id', deleteClient)
router.put('/:id/password', updateClientPassword)
router.post('/:id/balance', adjustClientBalance)
router.post('/:id/logout', forceLogoutClient)

export default router
