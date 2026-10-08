import express, { Router } from 'express'
import { cashGatewayWebhook } from '../controllers/hgCashController.js'
import { handleCaudalWebhook } from '../controllers/caudalWebhookController.js'

const router = Router()

router.post('/provider/hgcash/:token', express.raw({ type: 'application/json', limit: '2mb' }), (req, res, next) => {
  req.headers['x-gateway-token'] = req.params.token
  return cashGatewayWebhook(req, res, next)
})

router.post('/provider/hgcash/:token/update', express.raw({ type: 'application/json', limit: '2mb' }), (req, res, next) => {
  req.headers['x-gateway-token'] = req.params.token
  return cashGatewayWebhook(req, res, next)
})

router.post('/provider/caudal', express.raw({ type: 'application/json', limit: '2mb' }), handleCaudalWebhook)

export default router
