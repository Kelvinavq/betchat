import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { getChatClientBalance, getClientMessages, markClientChatDelivered, markClientChatRead, resetClientBotSelf, sendClientMessage } from '../controllers/chatController.js'
import { reportHgCashPaymentByClientCuil } from '../controllers/hgCashController.js'
import { requestPaymentCaudal, processImage, processPdf } from '../controllers/caudalController.js'
import { requestWithdrawal } from '../controllers/caudalWithdrawalController.js'
import { query } from '../config/database.js'
import { getValidatedClientPayload } from '../utils/clientSession.js'

const RECEIPTS_DIR = path.join(process.cwd(), 'public', 'caudal-receipts')
fs.mkdirSync(RECEIPTS_DIR, { recursive: true })

const clientUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/
    const ok = allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Formato no permitido'), ok)
  },
})

// Middleware: inject chatId + clientId from params into req.body
async function injectChatContext(req, res, next) {
  try {
    const client = await getValidatedClientPayload(req, res)
    if (!client?.sub) {
      return res.status(401).json({ ok: false, message: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    }
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ ok: false, message: 'chatId inválido' })
    const { rows, error } = await query(
      'SELECT id, client_id FROM chats WHERE id = ? AND client_id = ? AND is_archived = 0 LIMIT 1',
      [chatId, client.sub]
    )
    if (error) return next(error)
    if (!rows?.length) return res.status(404).json({ ok: false, message: 'Chat no encontrado' })
    req.body.chatId   = chatId
    req.body.clientId = rows[0].client_id
    req.client = client
    next()
  } catch (err) {
    next(err)
  }
}

const router = Router()

router.get('/:chatId/messages', getClientMessages)
router.get('/:chatId/balance', getChatClientBalance)
router.post('/:chatId/hgcash/report-payment', reportHgCashPaymentByClientCuil)
router.post('/:chatId/bot/reset', resetClientBotSelf)
router.post('/:chatId/messages', sendClientMessage)
router.put('/:chatId/delivered', markClientChatDelivered)
router.put('/:chatId/read', markClientChatRead)

// Caudal — depósitos (comprobante o reporte manual)
router.post('/:chatId/caudal/report-payment',
  injectChatContext,
  requestPaymentCaudal
)
router.post('/:chatId/caudal/process-image',
  clientUpload.single('file'),  // multer primero para parsear multipart
  injectChatContext,
  processImage
)
router.post('/:chatId/caudal/process-pdf',
  clientUpload.single('file'),  // multer primero para parsear multipart
  injectChatContext,
  processPdf
)

// Caudal — retiros
router.post('/:chatId/caudal/withdrawal-request',
  injectChatContext,
  requestWithdrawal
)

export default router
