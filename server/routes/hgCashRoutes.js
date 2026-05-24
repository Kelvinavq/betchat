import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { hgSyncTransactions, processImage, processPdf, requestPaymentHG } from '../controllers/hgCashController.js'

const HG_RECEIPTS_DIR = path.join(process.cwd(), 'public', 'hgcash-receipts')
fs.mkdirSync(HG_RECEIPTS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, HG_RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/
    const ok = allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Formato no permitido'), ok)
  },
})

const router = Router()

// Admin-triggered poll sync
router.post('/:id/sync', authenticateToken, requireRole('admin'), hgSyncTransactions)
router.post('/process-image', authenticateToken, requireRole('admin'), upload.single('file'), processImage)
router.post('/process-pdf', authenticateToken, requireRole('admin'), upload.single('file'), processPdf)
router.post('/request-payment', authenticateToken, requireRole('admin'), requestPaymentHG)

export default router
