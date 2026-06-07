import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../utils/api'

/* ── styles ── */
const S = {
  wrap: {
    display: 'flex', flexDirection: 'column', gap: 24,
  },
  header: {
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  title: {
    margin: 0, fontSize: 17, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em',
  },
  sub: {
    margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5,
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  card: {
    background: '#0e1525',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  cardRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  num: {
    width: 24, height: 24, borderRadius: 8,
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa', fontSize: 11, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  fields: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '9px 12px',
    color: '#f8fafc', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '9px 12px',
    color: '#f8fafc', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', resize: 'vertical', minHeight: 72,
    transition: 'border-color 0.15s',
  },
  cardActions: {
    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
  },
  toggle: (on) => ({
    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: on ? '#10b981' : 'rgba(255,255,255,0.12)',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  }),
  toggleDot: (on) => ({
    position: 'absolute', top: 3, left: on ? 19 : 3,
    width: 14, height: 14, borderRadius: 7, background: '#fff',
    transition: 'left 0.2s',
  }),
  deleteBtn: {
    padding: '5px 12px', borderRadius: 8,
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'rgba(239,68,68,0.08)',
    color: '#ef4444', fontSize: 12, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
  },
  addBtn: {
    padding: '10px 18px', borderRadius: 10,
    border: '1px dashed rgba(59,130,246,0.3)',
    background: 'rgba(59,130,246,0.06)',
    color: '#60a5fa', fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'background 0.15s, border-color 0.15s',
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end',
  },
  saveBtn: (saving) => ({
    padding: '10px 22px', borderRadius: 10, border: 'none',
    background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
    color: saving ? '#64748b' : '#fff',
    fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
    cursor: saving ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.2s',
  }),
  error: { fontSize: 12, color: '#ef4444' },
  status: { fontSize: 12, color: '#10b981' },
  sortRow: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  sortBtn: {
    width: 26, height: 26, borderRadius: 6, border: 'none',
    background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
    fontSize: 13, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
}

let idCounter = 0
const uid = () => `_new_${++idCounter}`

export default function FaqSection() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/faq')
      setItems((data.items || []).map(i => ({ ...i, _id: i.id, _dirty: false })))
    } catch (e) {
      setError(e.message || 'No se pudo cargar el FAQ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const update = (idx, patch) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch, _dirty: true } : it))

  const addItem = () =>
    setItems(prev => [...prev, {
      _id: uid(), question: '', answer: '',
      sort_order: prev.length, is_active: true, _isNew: true, _dirty: true,
    }])

  const removeItem = async (idx) => {
    const item = items[idx]
    if (item._isNew) {
      setItems(prev => prev.filter((_, i) => i !== idx))
      return
    }
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    try {
      await api.delete(`/api/faq/${item.id}`)
      setItems(prev => prev.filter((_, i) => i !== idx))
    } catch (e) {
      setError(e.message || 'Error al eliminar')
    }
  }

  const moveItem = (idx, dir) => {
    setItems(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next.map((it, i) => ({ ...it, sort_order: i, _dirty: true }))
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      for (const item of items) {
        if (!item._dirty) continue
        if (!item.question.trim() || !item.answer.trim()) {
          setError('Todos los ítems deben tener pregunta y respuesta.')
          setSaving(false)
          return
        }
        if (item._isNew) {
          const res = await api.post('/api/faq', {
            question: item.question, answer: item.answer,
            sort_order: item.sort_order, is_active: item.is_active,
          })
          item.id = res.id
          item._isNew = false
        } else {
          await api.put(`/api/faq/${item.id}`, {
            question: item.question, answer: item.answer,
            sort_order: item.sort_order, is_active: item.is_active,
          })
        }
        item._dirty = false
      }
      setItems([...items])
      setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: '#64748b', fontSize: 13, padding: 16 }}>Cargando FAQ...</div>

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <h2 style={S.title}>Preguntas frecuentes</h2>
        <p style={S.sub}>
          Configurá las preguntas y respuestas que verán los clientes en su menú de cuenta.
        </p>
      </div>

      <div style={S.list}>
        {items.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No hay preguntas. Agregá la primera.
          </div>
        )}

        {items.map((item, idx) => (
          <div key={item._id || item.id} style={S.card}>
            <div style={S.cardRow}>
              <div style={S.num}>{idx + 1}</div>
              <div style={S.fields}>
                <input
                  style={S.input}
                  value={item.question}
                  onChange={e => update(idx, { question: e.target.value })}
                  placeholder="Pregunta..."
                />
                <textarea
                  style={S.textarea}
                  value={item.answer}
                  onChange={e => update(idx, { answer: e.target.value })}
                  placeholder="Respuesta..."
                />
              </div>
            </div>

            <div style={S.cardActions}>
              <div style={S.sortRow}>
                <button style={S.sortBtn} type="button" onClick={() => moveItem(idx, -1)} title="Subir">↑</button>
                <button style={S.sortBtn} type="button" onClick={() => moveItem(idx, +1)} title="Bajar">↓</button>

                <button
                  type="button"
                  style={S.toggle(item.is_active)}
                  onClick={() => update(idx, { is_active: !item.is_active })}
                  title={item.is_active ? 'Desactivar' : 'Activar'}
                >
                  <span style={S.toggleDot(item.is_active)} />
                </button>
                <span style={{ fontSize: 11, color: item.is_active ? '#10b981' : '#64748b' }}>
                  {item.is_active ? 'Visible' : 'Oculta'}
                </span>
              </div>

              <button style={S.deleteBtn} type="button" onClick={() => removeItem(idx)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <button style={S.addBtn} type="button" onClick={addItem}>
        <span>+</span> Agregar pregunta
      </button>

      <div style={S.footer}>
        {error && <span style={S.error}>{error}</span>}
        {saved && <span style={S.status}>✓ Guardado</span>}
        <button style={S.saveBtn(saving)} type="button" disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando...' : 'Guardar FAQ'}
        </button>
      </div>
    </div>
  )
}
