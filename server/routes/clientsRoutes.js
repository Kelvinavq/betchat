import { Router } from 'express'
import {
  getClients,
  getClientStats,
  getClientDetail,
  getClientReferralDetails,
  createClient,
  updateClient,
  deleteClient,
  updateClientPassword,
  adjustClientBalance,
  forceLogoutClient,
  transferClientData,
} from '../controllers/clientsController.js'
import { authenticateToken, requirePermission } from '../middlewares/authMiddleware.js'

const router = Router()

// Todas las rutas requieren autenticación; los permisos se validan por acción.
router.use(authenticateToken)

router.get('/stats', requirePermission('clients', 'can_view'), getClientStats)
router.get('/', requirePermission('clients', 'can_view'), getClients)
router.get('/:id/detail', requirePermission('clients', 'can_view'), getClientDetail)
router.get('/:id/referral', requirePermission('clients', 'can_view'), getClientReferralDetails)
router.post('/', requirePermission('clients', 'can_create'), createClient)
router.put('/:id', requirePermission('clients', 'can_edit'), updateClient)
router.delete('/:id', requirePermission('clients', 'can_delete'), deleteClient)
router.put('/:id/password', requirePermission('clients', 'can_edit'), updateClientPassword)
router.post('/:id/balance', requirePermission('clients', 'can_edit'), adjustClientBalance)
router.post('/:id/logout', requirePermission('clients', 'can_edit'), forceLogoutClient)
router.post('/:id/transfer', requirePermission('clients', 'can_edit'), transferClientData)

export default router
