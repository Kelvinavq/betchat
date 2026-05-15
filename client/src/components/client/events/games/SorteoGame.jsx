import { useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api, resolveApiAsset } from '../../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.03)}`

/* ── Tokens ── */
const T = {
  bg: '#05080f',
  card: '#0c1220',
  accent: '#3b82f6',
  gold: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  t1: '#f8fafc',
  t2: '#94a3b8',
  border: 'rgba(255,255,255,0.08)',
}

/* ── Styled Components ── */
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const Banner = styled.img`
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 12px;
  display: block;
`

const PrizeBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05));
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 12px;
  padding: 14px 20px;
  font-size: 22px;
  font-weight: 900;
  color: ${T.gold};
  animation: ${pulse} 2.5s ease-in-out infinite;
`

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${T.t2};
  background: ${T.border};
  border-radius: 8px;
  padding: 10px 14px;
`

const Btn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: ${({ variant }) =>
    variant === 'success'
      ? `linear-gradient(135deg, ${T.success}, #059669)`
      : `linear-gradient(135deg, ${T.accent}, #2563eb)`};
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: transform 0.2s, opacity 0.2s;
  &:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.92; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(59,130,246,0.08);
  border: 1px dashed rgba(59,130,246,0.4);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: ${T.t2};
  word-break: break-all;
`

const SuccessBox = styled.div`
  text-align: center;
  padding: 24px 16px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 12px;
  color: ${T.success};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
`

const ErrorText = styled.p`
  color: ${T.danger};
  font-size: 13px;
  text-align: center;
  margin: 0;
`

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

export default function SorteoGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const requiresDeposit = Number(event?.min_deposit_amount) > 0

  const [phase, setPhase] = useState('intro') // 'intro' | 'uploading' | 'done'
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const bannerSrc = cfg.image_url ? resolveApiAsset(cfg.image_url) : null
  const endDate = formatDate(event?.ends_at)

  /* ── Handlers ── */
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
  }

  const handleParticipate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {})
      onResult(res.result)
      setPhase('done')
    } catch (err) {
      setError(err.message || 'Error al participar')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReceipt = async () => {
    if (!file) { setError('Seleccioná un archivo primero'); return }
    setLoading(true)
    setError('')
    try {
      // Register participation
      await api.post(`/api/client/events/${event.id}/play`, {})
      // Upload receipt
      const fd = new FormData()
      fd.append('receipt', file)
      await api.post(`/api/client/events/${event.id}/receipt`, fd)
      setPhase('done')
      onResult({
        won: null,
        prize: null,
        data: {},
        requiresReceipt: true,
        message: '¡Participaste! Revisamos tu comprobante pronto.',
      })
    } catch (err) {
      setError(err.message || 'Error al enviar comprobante')
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'done') {
    return (
      <Wrap>
        <SuccessBox>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎟️</div>
          <div>¡Participaste!</div>
          {requiresDeposit
            ? <div style={{ marginTop: 6, fontSize: 13, color: T.t2 }}>Revisamos tu comprobante pronto.</div>
            : <div style={{ marginTop: 6, fontSize: 13, color: T.t2 }}>Te notificaremos el resultado al finalizar el sorteo.</div>
          }
        </SuccessBox>
      </Wrap>
    )
  }

  return (
    <Wrap>
      {bannerSrc && <Banner src={bannerSrc} alt="Banner del sorteo" />}

      <PrizeBadge>
        🏆 {event?.prize_amount} {prizeLabel(event?.prize_type)}
      </PrizeBadge>

      {endDate && (
        <InfoRow>
          <span>🕐</span>
          <span>Finaliza el {endDate}</span>
        </InfoRow>
      )}

      {requiresDeposit && (
        <InfoRow>
          <span>💰</span>
          <span>Depósito mínimo: <strong style={{ color: T.t1 }}>${event.min_deposit_amount}</strong></span>
        </InfoRow>
      )}

      {event?.description && (
        <p style={{ fontSize: 13, color: T.t2, margin: 0, lineHeight: 1.55 }}>
          {event.description}
        </p>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {requiresDeposit ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {file ? (
            <FilePreview>
              <span>{file.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
              <span>{file.name} <span style={{ color: T.t2 }}>({(file.size / 1024).toFixed(0)} KB)</span></span>
            </FilePreview>
          ) : (
            <Btn type="button" onClick={() => fileRef.current?.click()}>
              📎 Subir comprobante de depósito
            </Btn>
          )}

          {file && (
            <Btn
              type="button"
              variant="success"
              disabled={loading}
              onClick={handleSendReceipt}
            >
              {loading ? '...' : '✔ Enviar comprobante'}
            </Btn>
          )}
        </>
      ) : (
        <Btn type="button" disabled={loading} onClick={handleParticipate}>
          {loading ? '...' : '🎟️ Participar'}
        </Btn>
      )}
    </Wrap>
  )
}
