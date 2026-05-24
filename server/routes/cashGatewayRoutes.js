import express, { Router } from 'express'
import { cashGatewayWebhook } from '../controllers/hgCashController.js'

const router = Router()

router.post('/webhook', express.raw({ type: 'application/json', limit: '2mb' }), cashGatewayWebhook)

export default router
