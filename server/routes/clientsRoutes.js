import { Router } from 'express'
import {
  getClients,
  getClientStats,
  createClient,
  updateClient,
  deleteClient,
  updateClientPassword,
} from '../controllers/clientsController.js'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'

const router = Router()

// Todas las rutas requieren autenticación de admin
router.use(authenticateToken)
router.use(requireRole('admin'))

router.get('/stats', getClientStats)
router.get('/', getClients)
router.post('/', createClient)
router.put('/:id', updateClient)
router.delete('/:id', deleteClient)
router.put('/:id/password', updateClientPassword)

export default router