import { query, transaction } from '../config/database.js'

const ITEM_TYPES = ['message', 'button']

const sanitizeScreen = (screen) => ({
  id: screen.id,
  name: screen.name,
  isRoot: Boolean(screen.is_root),
  items: [],
})

const sanitizeItem = (item) => ({
  id: item.id,
  type: item.type,
  text: item.text || '',
  label: item.label || '',
  actionScreenId: item.action_screen_id || '',
  isBack: Boolean(item.is_back),
  order: Number(item.sort_order || 0),
})

function normalizeId(value) {
  return String(value || '').trim()
}

function validateFlow(body) {
  const screens = Array.isArray(body?.screens) ? body.screens : []
  const errors = []

  if (screens.length === 0) errors.push('El flujo debe tener al menos una pantalla')

  const screenIds = new Set()
  const itemIds = new Set()
  let rootCount = 0

  const normalizedScreens = screens.map((screen, screenIndex) => {
    const id = normalizeId(screen.id)
    const name = String(screen.name || '').trim()
    const isRoot = Boolean(screen.isRoot || screen.is_root || id === 'root')
    const items = Array.isArray(screen.items) ? screen.items : []

    if (!id) errors.push('Hay una pantalla sin ID')
    else if (!/^[a-z0-9_-]+$/i.test(id)) errors.push(`El ID de pantalla "${id}" no es valido`)
    else if (screenIds.has(id)) errors.push(`La pantalla "${id}" esta duplicada`)
    else screenIds.add(id)

    if (!name) errors.push(`La pantalla "${id || screenIndex + 1}" necesita nombre`)
    if (isRoot) rootCount += 1

    const normalizedItems = items.map((item, itemIndex) => {
      const itemId = normalizeId(item.id)
      const type = String(item.type || '').trim()
      const text = String(item.text || '').trim()
      const label = String(item.label || '').trim()
      const actionScreenId = normalizeId(item.actionScreenId || item.action_screen_id)
      const isBack = Boolean(item.isBack || item.is_back)

      if (!itemId) errors.push(`Hay un elemento sin ID en "${name || id}"`)
      else if (!/^[a-z0-9_-]+$/i.test(itemId)) errors.push(`El ID de elemento "${itemId}" no es valido`)
      else if (itemIds.has(itemId)) errors.push(`El elemento "${itemId}" esta duplicado`)
      else itemIds.add(itemId)

      if (!ITEM_TYPES.includes(type)) errors.push(`Tipo de elemento invalido en "${name || id}"`)
      if (type === 'message' && !text) errors.push(`Hay un mensaje vacio en "${name || id}"`)
      if (type === 'button' && !label) errors.push(`Hay un boton sin texto en "${name || id}"`)
      return {
        id: itemId,
        type,
        text,
        label,
        actionScreenId,
        isBack,
        order: itemIndex,
      }
    })

    return {
      id,
      name,
      isRoot,
      order: screenIndex,
      items: normalizedItems,
    }
  })

  for (const screen of normalizedScreens) {
    for (const item of screen.items) {
      if (item.type === 'button' && item.actionScreenId && !screenIds.has(item.actionScreenId)) {
        errors.push(`El boton "${item.label}" apunta a una pantalla inexistente`)
      }
    }
  }

  if (rootCount !== 1) errors.push('El flujo debe tener una unica pantalla de inicio')

  return { errors, screens: normalizedScreens }
}

export async function getBotFlow(req, res, next) {
  try {
    const { rows: screenRows, error: screenError } = await query(
      `SELECT id, name, is_root, sort_order
       FROM bot_screens
       ORDER BY sort_order ASC, created_at ASC`
    )
    if (screenError) return next(screenError)

    const { rows: itemRows, error: itemError } = await query(
      `SELECT id, screen_id, type, text, label, action_screen_id, is_back, sort_order
       FROM bot_items
       ORDER BY screen_id ASC, sort_order ASC, created_at ASC`
    )
    if (itemError) return next(itemError)

    const screens = (screenRows || []).map(sanitizeScreen)
    const byId = new Map(screens.map(screen => [screen.id, screen]))

    for (const item of itemRows || []) {
      const screen = byId.get(item.screen_id)
      if (screen) screen.items.push(sanitizeItem(item))
    }

    res.json({ flow: { screens } })
  } catch (error) {
    next(error)
  }
}

export async function getClientBotFlow(req, res, next) {
  return getBotFlow(req, res, next)
}

export async function saveBotFlow(req, res, next) {
  try {
    const { errors, screens } = validateFlow(req.body?.flow || req.body)
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'No se pudo guardar el flujo del bot',
        details: errors,
        code: 'INVALID_BOT_FLOW',
      })
    }

    await transaction(async (connection) => {
      await connection.execute('DELETE FROM bot_items')
      await connection.execute('DELETE FROM bot_screens')

      for (const screen of screens) {
        await connection.execute(
          `INSERT INTO bot_screens (id, name, is_root, sort_order)
           VALUES (?, ?, ?, ?)`,
          [screen.id, screen.name, screen.isRoot ? 1 : 0, screen.order]
        )
      }

      for (const screen of screens) {
        for (const item of screen.items) {
          await connection.execute(
            `INSERT INTO bot_items
              (id, screen_id, type, text, label, action_screen_id, is_back, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              screen.id,
              item.type,
              item.type === 'message' ? item.text : null,
              item.type === 'button' ? item.label : null,
              item.type === 'button' && item.actionScreenId ? item.actionScreenId : null,
              item.isBack ? 1 : 0,
              item.order,
            ]
          )
        }
      }
    })

    res.json({ success: true, flow: { screens } })
  } catch (error) {
    next(error)
  }
}
