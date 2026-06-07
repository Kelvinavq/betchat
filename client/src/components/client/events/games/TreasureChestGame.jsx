import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'
import ReceiptUpload from '../ReceiptUpload.jsx'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`
const glowPulse = keyframes`
  0%,100% { box-shadow: 0 0 12px rgba(245,158,11,0.2); }
  50%      { box-shadow: 0 0 28px rgba(245,158,11,0.55), 0 0 50px rgba(245,158,11,0.2); }
`

/* ── Tokens ── */
const T = {
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
  gap: 18px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const RuleBox = styled.div`
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 13px;
  color: ${T.t2};
  line-height: 1.55;
  text-align: center;
`

const DepositInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${T.border};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: ${T.t2};
`

const OptionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
`

const OptionCard = styled.button`
  flex: 1;
  min-width: 90px;
  max-width: 140px;
  min-height: 110px;
  border-radius: 16px;
  border: 2px solid ${({ selected, optcolor }) =>
    selected ? (optcolor || T.gold) : T.border};
  background: ${({ selected, optcolor }) =>
    selected
      ? `linear-gradient(160deg, ${optcolor || T.gold}22, ${optcolor || T.gold}0a)`
      : `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
  animation: ${({ selected }) => (selected ? glowPulse : 'none')} 1.8s ease-in-out infinite;
  &:hover:not(:disabled) {
    transform: scale(1.05);
    border-color: ${({ optcolor }) => optcolor || T.gold};
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  }
`

const OptionIcon = styled.div`
  font-size: 52px;
  line-height: 1;
`

const OptionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${T.t1};
  text-align: center;
  line-height: 1.3;
`

const ConfirmBtn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: ${({ disabled }) =>
    disabled
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: ${({ disabled }) => (disabled ? T.t2 : '#000')};
  font-size: 16px;
  font-weight: 800;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s, opacity 0.2s;
  &:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.92; }
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
  line-height: 1.6;
  animation: ${popIn} 0.4s ease both;
`

const DEFAULT_OPTIONS = [
  { icon: '📦', label: 'Caja A', color: T.accent },
  { icon: '💰', label: 'Caja B', color: T.gold },
  { icon: '💎', label: 'Caja C', color: '#a78bfa' },
]

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

export default function TreasureChestGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const options = cfg.options?.length ? cfg.options : DEFAULT_OPTIONS
  const requiresDeposit = Number(event?.min_deposit_amount) > 0
  const initialReceiptStatus = String(event?.receipt_status || '').toLowerCase()

  const [phase, setPhase] = useState(
    requiresDeposit && initialReceiptStatus !== 'paid' ? 'awaiting_receipt' : 'choosing'
  )
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiptStatus, setReceiptStatus] = useState(initialReceiptStatus)

  useEffect(() => {
    const nextReceiptStatus = String(event?.receipt_status || '').toLowerCase()
    setReceiptStatus(nextReceiptStatus)
    setPhase(requiresDeposit && nextReceiptStatus !== 'paid' ? 'awaiting_receipt' : 'choosing')
    setSelected(null)
    setError('')
  }, [event?.id, event?.receipt_status, requiresDeposit])

  const handleConfirm = async () => {
    if (!selected || loading) return
    if (requiresDeposit && receiptStatus !== 'paid') {
      setError('Primero tenés que acreditar tu depósito para poder votar.')
      setPhase('awaiting_receipt')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {
        vote_key: selected.label,
      })
      setPhase('voted')
      onResult({
        won: null,
        prize: null,
        data: { voted: selected.label },
        requiresReceipt: false,
        message: `¡Elegiste ${selected.label}! Te avisaremos si ganás.`,
        ...(res.result || {}),
      })
    } catch (err) {
      setError(err.message || 'Error al elegir')
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptUploaded = (res) => {
    const status = String(res?.receipt_status || res?.data?.receipt_status || 'pending').toLowerCase()
    setReceiptStatus(status)
    if (status === 'paid') {
      setPhase('choosing')
    }
  }

  if (requiresDeposit && receiptStatus !== 'paid') {
    return (
      <Wrap>
        <div style={{ textAlign: 'center', fontSize: 28, marginBottom: -6 }}>💎</div>

        <RuleBox>
          Primero subí tu comprobante de depósito.
          <br />
          Cuando quede acreditado, vas a poder elegir tu cofre.
        </RuleBox>

        <ReceiptUpload
          eventId={event.id}
          clientId={clientId}
          onUploaded={handleReceiptUploaded}
          initialStatus={receiptStatus}
        />
      </Wrap>
    )
  }

  if (phase === 'voted') {
    return (
      <Wrap>
        <SuccessBox>
          <div style={{ fontSize: 42, marginBottom: 10 }}>
            {selected?.icon || '💎'}
          </div>
          <div>¡Elegiste <strong>{selected?.label}</strong>!</div>
          <div style={{ marginTop: 8, fontSize: 13, color: T.t2 }}>
            Te avisaremos si ganás cuando termine el evento.
          </div>
        </SuccessBox>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <div style={{ textAlign: 'center', fontSize: 28, marginBottom: -6 }}>💎</div>

      <RuleBox>
        La opción con <strong style={{ color: T.t1 }}>MENOS votos</strong> al finalizar gana.
        <br />Pensá bien antes de elegir.
      </RuleBox>

      <DepositInfo>
        <span>💰</span>
        <span>Depósito mínimo requerido: <strong style={{ color: T.t1 }}>${event.min_deposit_amount}</strong></span>
      </DepositInfo>

      <div style={{ fontSize: 13, color: T.t2, textAlign: 'center' }}>
        Seleccioná una opción:
      </div>

      <OptionsRow>
        {options.map((opt, i) => (
          <OptionCard
            key={i}
            type="button"
            selected={selected?.label === opt.label ? 1 : 0}
            optcolor={opt.color}
            disabled={loading}
            onClick={() => setSelected(opt)}
          >
            <OptionIcon>{opt.icon}</OptionIcon>
            <OptionLabel>{opt.label}</OptionLabel>
          </OptionCard>
        ))}
      </OptionsRow>

      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      <ConfirmBtn
        type="button"
        disabled={!selected || loading}
        onClick={handleConfirm}
      >
        {loading ? '...' : selected ? `Elegir ${selected.label}` : 'Seleccioná una opción'}
      </ConfirmBtn>

      <div style={{ fontSize: 12, color: T.t2, textAlign: 'center' }}>
        Premio: <strong style={{ color: T.gold }}>
          {event?.prize_amount} {prizeLabel(event?.prize_type)}
        </strong>
      </div>
    </Wrap>
  )
}
