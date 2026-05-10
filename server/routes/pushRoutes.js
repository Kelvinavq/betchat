import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  getCredentials, updateCredentials, getFirebaseClientConfig,
  getSettings, updateSettings,
  getStats,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignNow,
  sendDirect,
  getHistory,
  registerToken, unregisterToken,
} from '../controllers/pushController.js'

const router = Router()

// Public: client-side Firebase config + token registration
router.get('/firebase-config', getFirebaseClientConfig)
router.post('/token',          registerToken)
router.delete('/token',        unregisterToken)

// Admin-only routes
router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/credentials',     getCredentials)
router.put('/credentials',     updateCredentials)
router.get('/settings',        getSettings)
router.put('/settings',        updateSettings)
router.get('/stats',           getStats)
router.get('/campaigns',       getCampaigns)
router.post('/campaigns',      createCampaign)
router.put('/campaigns/:id',   updateCampaign)
router.delete('/campaigns/:id', deleteCampaign)
router.post('/campaigns/:id/send', sendCampaignNow)
router.post('/send-direct',    sendDirect)
router.get('/history',         getHistory)

export default router
