import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'
import ReceiptUpload from '../ReceiptUpload.jsx'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.06)}`

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
  background: rgba(59,130,246,0.07);
  border: 1px solid rgba(59,130,246,0.2);
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

const NumberGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`

const NumChip = styled.button`
  width: 68px;
  height: 68px;
  border-radius: 14px;
  border: 2px solid ${({ selected }) => (selected ? T.accent : T.border)};
  background: ${({ selected }) =>
    selected
      ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.1))'
      : T.card};
  color: ${({ selected }) => (selected ? T.t1 : T.t2)};
  font-size: 22px;
  font-weight: 900;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: border-color 0.2s, background 0.2s, transform 0.15s, box-shadow 0.2s;
  animation: ${({ selected }) => (selected ? pulse : 'none')} 1.5s ease-in-out infinite;
  box-shadow: ${({ selected }) =>
    selected ? '0 0 18px rgba(59,130,246,0.4)' : 'none'};
  &:hover:not(:disabled) {
    transform: scale(1.06);
    border-color: ${T.accent};
  }
`

const ConfirmBtn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: ${({ disabled }) =>
    disabled
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
  color: ${({ disabled }) => (disabled ? T.t2 : '#fff')};
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

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

export default function BriefcaseGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const numbersCount = cfg.numbers_count || 5
  const requiresDeposit = Number(event?.min_deposit_amount) > 0
  const initialReceiptStatus = String(event?.receipt_status || '').toLowerCase()

  const [phase, setPhase] = useState(requiresDeposit && initialReceiptStatus !== 'paid' ? 'awaiting_receipt' : 'choosing') // 'awaiting_receipt' | 'choosing' | 'voted'
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiptStatus, setReceiptStatus] = useState(initialReceiptStatus)

  const numbers = Array.from({ length: numbersCount }, (_, i) => i + 1)

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
        vote_key: String(selected),
      })
      setPhase('voted')
      onResult({
        won: null,
        prize: null,
        data: { voted: selected },
        requiresReceipt: false,
        message: `¡Votaste el número ${selected}! Te avisaremos si ganás cuando termine el evento.`,
        ...(res.result || {}),
      })
    } catch (err) {
      setError(err.message || 'Error al votar')
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
        <div style={{ textAlign: 'center', fontSize: 26, marginBottom: -4 }}>💼</div>

        <RuleBox>
          Primero subí tu comprobante de depósito.
          <br />
          Cuando quede acreditado, vas a poder votar un número.
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
          <div style={{ fontSize: 40, marginBottom: 10 }}>💼</div>
          <div>¡Votaste el número <strong>{selected}</strong>!</div>
          <div style={{ marginTop: 8, fontSize: 13, color: T.t2 }}>
            Te avisaremos si ganás cuando termine el evento.
          </div>
        </SuccessBox>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <div style={{ textAlign: 'center', fontSize: 26, marginBottom: -4 }}>💼</div>

      <RuleBox>
        El número con <strong style={{ color: T.t1 }}>MENOS votos</strong> al finalizar gana.
        <br />¡Elegí sabiamente!
      </RuleBox>

      <DepositInfo>
        <span>💰</span>
        <span>Depósito mínimo requerido: <strong style={{ color: T.t1 }}>${event.min_deposit_amount}</strong></span>
      </DepositInfo>

      <div style={{ fontSize: 13, color: T.t2, textAlign: 'center' }}>
        Elegí un número del 1 al {numbersCount}:
      </div>

      <NumberGrid>
        {numbers.map((n) => (
          <NumChip
            key={n}
            type="button"
            selected={selected === n ? 1 : 0}
            disabled={loading}
            onClick={() => setSelected(n)}
          >
            {n}
          </NumChip>
        ))}
      </NumberGrid>

      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      <ConfirmBtn
        type="button"
        disabled={!selected || loading}
        onClick={handleConfirm}
      >
        {loading ? '...' : selected ? `Votar número ${selected}` : 'Seleccioná un número'}
      </ConfirmBtn>

      <div style={{ fontSize: 12, color: T.t2, textAlign: 'center' }}>
        Premio: <strong style={{ color: T.gold }}>
          {event?.prize_amount} {prizeLabel(event?.prize_type)}
        </strong>
      </div>
    </Wrap>
  )
}
