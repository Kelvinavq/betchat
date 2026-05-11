import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext  = createContext(null)
const ConfirmContext = createContext(null)

let _idSeq = 0

/* ─────────────────────────────────────────────────────────────────
   ToastProvider  —  wraps the whole app
───────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts,  setToasts]  = useState([])
  const [confirm, setConfirm] = useState(null)   // { id, title, body, confirmLabel, danger, resolve }
  const resolveRef = useRef(null)

  /* ── toast ── */
  const dismiss = useCallback((id) =>
    setToasts(p => p.map(t => t.id === id ? { ...t, leaving: true } : t)), [])

  const remove = useCallback((id) =>
    setToasts(p => p.filter(t => t.id !== id)), [])

  const show = useCallback((type, message, duration = 4000) => {
    const id = ++_idSeq
    setToasts(p => [...p.slice(-4), { id, type, message, leaving: false }])
    const t = setTimeout(() => dismiss(id), duration)
    setTimeout(() => remove(id), duration + 400)
    return () => clearTimeout(t)
  }, [dismiss, remove])

  const toast = {
    success: (msg, d)  => show('success', msg, d),
    error:   (msg, d)  => show('error',   msg, d),
    info:    (msg, d)  => show('info',    msg, d),
    warning: (msg, d)  => show('warning', msg, d),
  }

  /* ── confirm ── */
  const showConfirm = useCallback(({ title, body, confirmLabel = 'Confirmar', danger = false }) =>
    new Promise((resolve) => {
      resolveRef.current = resolve
      setConfirm({ id: ++_idSeq, title, body, confirmLabel, danger })
    }), [])

  const handleConfirm = (ok) => {
    resolveRef.current?.(ok)
    resolveRef.current = null
    setConfirm(null)
  }

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={showConfirm}>
        {children}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
        {confirm && <ConfirmModal {...confirm} onClose={handleConfirm} />}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export const useToast   = () => useContext(ToastContext)
export const useConfirm = () => useContext(ConfirmContext)

/* ─────────────────────────────────────────────────────────────────
   Toast stack (top-right)
───────────────────────────────────────────────────────────────── */
const ICONS = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️',
}

const COLORS = {
  success: { bar: '#4ade80', bg: 'rgba(52,211,153,.10)', border: 'rgba(52,211,153,.25)' },
  error:   { bar: '#f87171', bg: 'rgba(248,113,113,.10)', border: 'rgba(248,113,113,.25)' },
  info:    { bar: '#60a5fa', bg: 'rgba(96,165,250,.10)', border: 'rgba(96,165,250,.25)' },
  warning: { bar: '#fbbf24', bg: 'rgba(251,191,36,.10)', border: 'rgba(251,191,36,.25)' },
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={stackStyle}>
      {toasts.map(t => <ToastItem key={t.id} {...t} onDismiss={onDismiss} />)}
    </div>
  )
}

function ToastItem({ id, type, message, leaving, onDismiss }) {
  const c = COLORS[type] || COLORS.info
  return (
    <div style={{ ...toastStyle, background: c.bg, border: `1px solid ${c.border}`,
      animation: leaving ? 'toastOut .35s ease forwards' : 'toastIn .35s cubic-bezier(.16,1,.3,1) both' }}>
      <div style={{ width: 3, alignSelf: 'stretch', background: c.bar, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.88)', lineHeight: 1.45 }}>
        {message}
      </span>
      <button onClick={() => onDismiss(id)} style={dismissBtnStyle}>✕</button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Confirm modal
───────────────────────────────────────────────────────────────── */
function ConfirmModal({ title, body, confirmLabel, danger, onClose }) {
  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div style={confirmCardStyle}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{title}</div>
        {body && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.52)', lineHeight: 1.55, marginBottom: 22 }}>{body}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={cancelBtnStyle} onClick={() => onClose(false)}>Cancelar</button>
          <button style={{ ...confirmBtnStyle, ...(danger ? dangerStyle : primaryStyle) }}
            onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Inline styles (no styled-components needed — single use)
───────────────────────────────────────────────────────────────── */
const stackStyle = {
  position: 'fixed', top: 18, right: 18, zIndex: 99999,
  display: 'flex', flexDirection: 'column', gap: 10, width: 340, maxWidth: 'calc(100vw - 36px)',
  pointerEvents: 'none',
}

const toastStyle = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '12px 14px', borderRadius: 12,
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0,0,0,.55)',
  pointerEvents: 'all', userSelect: 'none',
}

const dismissBtnStyle = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,.3)',
  cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1, flexShrink: 0,
  transition: 'color .15s',
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 99998,
  background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  animation: 'toastIn .2s ease both',
}

const confirmCardStyle = {
  background: '#13131f', border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 18, padding: '24px 22px', width: '100%', maxWidth: 380,
  boxShadow: '0 24px 80px rgba(0,0,0,.7)',
  animation: 'confirmIn .3s cubic-bezier(.16,1,.3,1) both',
}

const cancelBtnStyle = {
  padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)',
  background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.65)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const confirmBtnStyle = {
  padding: '9px 20px', borderRadius: 9, border: 'none',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const primaryStyle = {
  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
  color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,.4)',
}

const dangerStyle = {
  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
  color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,.4)',
}
