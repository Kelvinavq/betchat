import styled, { keyframes } from 'styled-components'

/* ── Animations ── */
const fadeScaleIn = keyframes`
  from { opacity: 0; transform: scale(0.88); }
  to   { opacity: 1; transform: scale(1); }
`
const float = keyframes`
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
`
const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
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
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 8px 0;
  animation: ${fadeScaleIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const BigEmoji = styled.div`
  font-size: 64px;
  line-height: 1;
  animation: ${float} 3s ease-in-out infinite;
  text-align: center;
`

const Title = styled.h2`
  font-size: 22px;
  font-weight: 900;
  text-align: center;
  margin: 0;
  color: ${({ won }) =>
    won === 'true' ? T.success
    : won === 'false' ? T.danger
    : T.t1};
`

const PrizeBox = styled.div`
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05));
  border: 1px solid rgba(245,158,11,0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

const PrizeEmoji = styled.div`
  font-size: 36px;
  line-height: 1;
`

const PrizeAmount = styled.div`
  font-size: 26px;
  font-weight: 900;
  background: linear-gradient(135deg, #f59e0b, #fcd34d, #f59e0b);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 2.5s linear infinite;
  line-height: 1;
`

const PrizeType = styled.div`
  font-size: 13px;
  color: rgba(245,158,11,0.75);
  font-weight: 600;
  text-transform: capitalize;
`

const MessageBox = styled.div`
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid ${T.border};
  font-size: 14px;
  color: ${T.t2};
  text-align: center;
  line-height: 1.6;
`

const ReceiptNotice = styled.div`
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.25);
  font-size: 13px;
  color: ${T.t2};
  text-align: center;
  line-height: 1.55;
`

const CloseBtn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: ${({ wonstate }) =>
    wonstate === 'true'
      ? `linear-gradient(135deg, ${T.success}, #059669)`
      : wonstate === 'false'
      ? 'rgba(255,255,255,0.08)'
      : `linear-gradient(135deg, ${T.accent}, #2563eb)`};
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  &:hover { transform: translateY(-2px); opacity: 0.9; }
  &:active { transform: scale(0.98); }
`

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  if (!prize_type) return ''
  return prize_type
}

function getEmoji(won, requiresReceipt) {
  if (won === true) return '🏆'
  if (won === false) return '😔'
  if (requiresReceipt) return '📎'
  return '⏳'
}

function getTitle(won) {
  if (won === true) return '¡Ganaste!'
  if (won === false) return 'No fue esta vez'
  return '¡Participación registrada!'
}

export default function ResultScreen({ result, onClose }) {
  if (!result) return null

  const { won, prize, requiresReceipt, message } = result
  const emoji = getEmoji(won, requiresReceipt)
  const title = getTitle(won)

  return (
    <Wrap>
      <BigEmoji>{emoji}</BigEmoji>

      <Title won={won === true ? 'true' : won === false ? 'false' : 'null'}>
        {title}
      </Title>

      {prize && (
        <PrizeBox>
          {prize.icon && <PrizeEmoji>{prize.icon}</PrizeEmoji>}
          <PrizeAmount>{prize.amount}</PrizeAmount>
          <PrizeType>{prizeLabel(prize.prize_type) || prize.label}</PrizeType>
        </PrizeBox>
      )}

      {requiresReceipt && (
        <ReceiptNotice>
          📎 Tu comprobante fue recibido. Lo revisaremos pronto y te notificaremos.
        </ReceiptNotice>
      )}

      {message && (
        <MessageBox>{message}</MessageBox>
      )}

      <CloseBtn
        type="button"
        wonstate={won === true ? 'true' : won === false ? 'false' : 'null'}
        onClick={onClose}
      >
        Cerrar
      </CloseBtn>
    </Wrap>
  )
}
