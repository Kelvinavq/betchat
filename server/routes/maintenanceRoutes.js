import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { getMaintenanceConfig, saveMaintenanceConfig, runMaintenance, purgeAllChats, exportDatabaseSql } from '../controllers/maintenanceController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin'))

router.get('/', getMaintenanceConfig)
router.put('/', saveMaintenanceConfig)
router.post('/run', runMaintenance)
router.post('/purge-chats', purgeAllChats)
router.get('/export', exportDatabaseSql)

export default router
