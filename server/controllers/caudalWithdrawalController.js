import { createWithdrawalRequest } from '../services/caudalWithdrawalService.js'

export async function requestWithdrawal(req, res) {
  try {
    const { chatId, amount, holderName, method, cbu, dni, clientReferenceId } = req.body

    if (!chatId || !amount) {
      return res.status(400).json({ ok: false, message: 'chatId y amount son obligatorios.' })
    }

    const result = await createWithdrawalRequest({
      req,
      chatId: Number(chatId),
      amount: Number(amount),
      holderName,
      method,
      cbu,
      dni,
      clientReferenceId,
    })

    return res.status(Number(result?.httpStatus || 200)).json({ ok: true, ...(result?.body || {}) })
  } catch (error) {
    const httpStatus = Number(error?.httpStatus || 500)
    console.error('[caudal withdrawal] Error:', error?.message || error)
    return res.status(httpStatus).json({ ok: false, message: error?.message, code: error?.code })
  }
}
