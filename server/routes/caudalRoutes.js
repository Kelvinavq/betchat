import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requestPaymentCaudal, processImage, processPdf } from '../controllers/caudalController.js'
import { requestWithdrawal } from '../controllers/caudalWithdrawalController.js'

const RECEIPTS_DIR = path.join(process.cwd(), 'public', 'caudal-receipts')
fs.mkdirSync(RECEIPTS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
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

router.post('/report-payment',     authenticateToken, requestPaymentCaudal)
router.post('/process-image',      authenticateToken, upload.single('file'), processImage)
router.post('/process-pdf',        authenticateToken, upload.single('file'), processPdf)
router.post('/withdrawal-request', authenticateToken, requestWithdrawal)

export default router
