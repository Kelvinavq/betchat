import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`

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
  gap: 20px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const Title = styled.div`
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: ${T.t1};
`

const Subtitle = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${T.t2};
  margin-top: -12px;
`

const CardsRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`

const ChoiceCard = styled.button`
  flex: 1;
  min-width: 120px;
  max-width: 160px;
  min-height: 140px;
  border-radius: 16px;
  border: 2px solid ${({ resultState, color }) =>
    resultState === 'won' ? T.success
    : resultState === 'lost' ? T.danger
    : color || T.border};
  background: ${({ color, selected }) =>
    selected
      ? `linear-gradient(160deg, ${color}33, ${color}11)`
      : `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  box-shadow: ${({ resultState }) =>
    resultState === 'won'
      ? '0 0 20px rgba(16,185,129,0.4)'
      : resultState === 'lost'
      ? '0 0 20px rgba(239,68,68,0.3)'
      : 'none'};
`

const CardIcon = styled.div`
  font-size: 52px;
  line-height: 1;
`

const CardLabel = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: ${T.t1};
  letter-spacing: 0.5px;
`

const WinRateBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  color: ${T.t2};
`

const PrizeInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: ${T.gold};
  font-weight: 700;
`

const OutcomeBox = styled.div`
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: ${({ won }) => (won ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)')};
  border: 1px solid ${({ won }) => (won ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)')};
  color: ${({ won }) => (won ? T.success : T.danger)};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  animation: ${popIn} 0.4s ease both;
`

const LoadingDot = styled.div`
  text-align: center;
  color: ${T.t2};
  font-size: 14px;
  animation: ${fadeIn} 0.3s ease both;
`

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

const DEFAULT_OPTIONS = [
  { label: 'Rojo', icon: '🔴', color: '#ef4444' },
  { label: 'Negro', icon: '⚫', color: '#374151' },
]

export default function RedBlackGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const options = cfg.options?.length ? cfg.options : DEFAULT_OPTIONS
  const winRate = cfg.win_rate ?? 50

  const [phase, setPhase] = useState('choosing') // 'choosing' | 'loading' | 'result'
  const [chosen, setChosen] = useState(null)
  const [apiResult, setApiResult] = useState(null)
  const [error, setError] = useState('')

  const handleChoose = async (option) => {
    if (phase !== 'choosing') return
    setChosen(option)
    setPhase('loading')
    setError('')

    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, { chose: option.label })
      setApiResult(res.result)
      setPhase('result')
      // Short delay then call onResult
      setTimeout(() => onResult(res.result), 1800)
    } catch (err) {
      setError(err.message || 'Error al jugar')
      setPhase('choosing')
      setChosen(null)
    }
  }

  const won = apiResult?.won === true

  const getCardResultState = (option) => {
    if (phase !== 'result' || !apiResult) return null
    if (option.label === chosen?.label) return won ? 'won' : 'lost'
    return null
  }

  return (
    <Wrap>
      <div>
        <Title>Rojo o Negro</Title>
        <Subtitle>Elegí y dobla tu premio</Subtitle>
      </div>

      <WinRateBadge>
        Probabilidad de ganar: <strong style={{ color: T.t1 }}>{winRate}%</strong>
      </WinRateBadge>

      <CardsRow>
        {options.map((opt, i) => {
          const resultState = getCardResultState(opt)
          const isChosen = chosen?.label === opt.label
          return (
            <ChoiceCard
              key={i}
              type="button"
              color={opt.color}
              selected={isChosen ? 1 : 0}
              resultState={resultState}
              disabled={phase !== 'choosing'}
              onClick={() => handleChoose(opt)}
            >
              <CardIcon>{opt.icon}</CardIcon>
              <CardLabel>{opt.label}</CardLabel>
              {resultState === 'won' && <div style={{ fontSize: 18 }}>✓</div>}
              {resultState === 'lost' && <div style={{ fontSize: 18 }}>✗</div>}
            </ChoiceCard>
          )
        })}
      </CardsRow>

      <PrizeInfo>
        🏆 Premio: {event?.prize_amount} {prizeLabel(event?.prize_type)}
      </PrizeInfo>

      {phase === 'loading' && <LoadingDot>Calculando resultado...</LoadingDot>}

      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      {phase === 'result' && apiResult && (
        <OutcomeBox won={won ? 1 : 0}>
          {won
            ? `🎉 ¡Ganaste! ${event?.prize_amount} ${prizeLabel(event?.prize_type)}`
            : '😔 No fue esta vez. ¡Suerte la próxima!'}
        </OutcomeBox>
      )}
    </Wrap>
  )
}
