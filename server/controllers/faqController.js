import { query } from '../config/database.js'

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS faq_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      question    VARCHAR(500) NOT NULL,
      answer      TEXT NOT NULL,
      sort_order  INT DEFAULT 0,
      is_active   TINYINT(1) DEFAULT 1,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

export async function listFaqItems(req, res, next) {
  try {
    await ensureTable()
    const isAdmin = Boolean(req.user)
    const { rows, error } = await query(
      `SELECT id, question, answer, sort_order, is_active, created_at, updated_at
       FROM faq_items
       ${isAdmin ? '' : 'WHERE is_active = 1'}
       ORDER BY sort_order ASC, id ASC`
    )
    if (error) throw error
    res.json({ items: rows || [] })
  } catch (err) {
    next(err)
  }
}

export async function createFaqItem(req, res, next) {
  try {
    await ensureTable()
    const { question, answer, sort_order = 0 } = req.body || {}
    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: 'Pregunta y respuesta son requeridas' })
    }
    const { rows, error } = await query(
      'INSERT INTO faq_items (question, answer, sort_order, is_active) VALUES (?, ?, ?, 1)',
      [question.trim(), answer.trim(), Number(sort_order) || 0]
    )
    if (error) throw error
    res.json({ id: rows.insertId, ok: true })
  } catch (err) {
    next(err)
  }
}

export async function updateFaqItem(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID requerido' })
    const { question, answer, sort_order, is_active } = req.body || {}
    const sets = []
    const params = []
    if (question !== undefined) { sets.push('question = ?'); params.push(String(question).trim()) }
    if (answer !== undefined)   { sets.push('answer = ?');   params.push(String(answer).trim()) }
    if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(Number(sort_order) || 0) }
    if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0) }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' })
    params.push(id)
    const { error } = await query(`UPDATE faq_items SET ${sets.join(', ')} WHERE id = ?`, params)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function deleteFaqItem(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID requerido' })
    const { error } = await query('DELETE FROM faq_items WHERE id = ?', [id])
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
