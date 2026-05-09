import { query } from '../config/database.js'

const RECEIPT_MODEL = 'google/gemini-3.1-flash-lite'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const EXTRACTION_PROMPT = `Extrae SOLO estos datos del texto de un comprobante y devuelve JSON ESTRICTO:
{"amount": number|null, "transaction_id": string|null, "id_type":"numerico"|"alfanumerico"|"indefinido"}

REGLAS:
- amount: buscar importe/monto/$/ars. Quitar separadores de miles. Si hay decimales, redondear al entero más cercano. Si no es claro, null.
- transaction_id: buscar "número de operación", "Id Op", "número de comprobante de alta", "código de referencia", "id transacción", "id coelsa", "coelsa id", "Número de transacción" o similar.
  * Si es numérico de 12 dígitos => id_type="numerico"
  * Si es alfanumérico entre 17 y 22 caracteres (o contiene letras y números) => id_type="alfanumerico"
  * Si no está claro => transaction_id=null e id_type="indefinido"

Devuelve únicamente el JSON, sin explicaciones.`

async function getApiKey() {
  const { rows, error } = await query('SELECT api_key FROM config_openrouter WHERE id = 1 LIMIT 1')
  if (error) throw error
  const key = rows?.[0]?.api_key
  if (!key) throw new Error('OpenRouter API key no configurada')
  return key
}

export async function extractReceiptData(dataUrl) {
  const apiKey = await getApiKey()

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('dataUrl inválida')
  const [, mimeType] = match

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://betchat.app',
    },
    body: JSON.stringify({
      model: RECEIPT_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content || ''

  const jsonMatch = content.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('La IA no devolvió JSON válido')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    amount: parsed.amount != null ? Number(parsed.amount) : null,
    transaction_id: parsed.transaction_id || null,
    id_type: parsed.id_type || 'indefinido',
    mimeType,
    rawResponse: content,
  }
}
