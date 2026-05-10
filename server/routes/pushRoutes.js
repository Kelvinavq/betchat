import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  getCredentials, updateCredentials, getFirebaseClientConfig,
  getSettings, updateSettings,
  getStats,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignNow,
  sendDirect,
  getHistory,
  registerToken, unregisterToken,
  uploadImage,
} from '../controllers/pushController.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/push'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'push-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

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
router.post('/upload-image', upload.single('image'), uploadImage)
router.get('/history', getHistory)

export default router
