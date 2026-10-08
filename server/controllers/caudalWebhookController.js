import { persistDetectedEvent } from '../services/caudalTransactionService.js'

export async function handleCaudalWebhook(req, res) {
  try {
    const result = await persistDetectedEvent(req)
    if (result?.ignored) {
      return res.status(200).json({ ok: true, ignored: true, event: result.eventName, reason: result.reason })
    }
    return res.status(200).json({
      ok: true,
      event: result.eventName,
      eventId: result.eventId,
      externalTransactionId: result.externalTransactionId,
      status: result.status,
      matchedClientId: result.matchedClientId || null,
    })
  } catch (error) {
    const httpStatus = Number(error?.httpStatus || 500)
    console.error('[caudal webhook] Error:', error?.message || error)
    return res.status(httpStatus).json({ ok: false, message: error?.message, code: error?.code })
  }
}
