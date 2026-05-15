import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`
const progressGrow = keyframes`from{width:0%}to{width:var(--pct,0%)}`
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`

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

const BigEmoji = styled.div`
  text-align: center;
  font-size: 52px;
  line-height: 1;
`

const MissionTitle = styled.div`
  text-align: center;
  font-size: 19px;
  font-weight: 900;
  color: ${T.t1};
  line-height: 1.3;
`

const MissionDesc = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${T.t2};
  line-height: 1.55;
`

const GoalBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 12px;
  padding: 12px 18px;
  font-size: 15px;
  font-weight: 700;
  color: ${T.t1};
`

const PeriodBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid ${T.border};
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  color: ${T.t2};
  align-self: center;
`

const PrizeLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: ${T.gold};
`

const ProgressWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, ${T.accent}, ${T.success});
  border-radius: 6px;
  animation: ${progressGrow} 0.8s ease-out forwards;
`

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${T.t2};
`

const EnrollBtn = styled.button`
  width: 100%;
  padding: 16px;
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
  animation: ${({ disabled }) => (disabled ? 'none' : pulse)} 2s ease-in-out infinite;
  &:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
`

const SuccessBox = styled.div`
  text-align: center;
  padding: 22px 16px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 12px;
  color: ${T.success};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
  animation: ${popIn} 0.4s ease both;
`

const PERIOD_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  all_time: 'Total',
}

function goalText(cfg) {
  const goal = cfg.goal_amount ?? '?'
  switch (cfg.mission_type) {
    case 'deposit_count':  return `Meta: ${goal} depósitos`
    case 'deposit_amount': return `Meta: $${goal} depositados`
    case 'charge_count':   return `Meta: ${goal} cargas`
    default:               return `Meta: ${goal}`
  }
}

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

export default function RankingGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const emoji = cfg.emoji || '🏆'
  const periodLabel = PERIOD_LABELS[cfg.period_type] || cfg.period_type || 'Período'

  const [phase, setPhase] = useState('info') // 'info' | 'enrolled'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEnroll = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {})
      setPhase('enrolled')
      onResult({
        won: null,
        prize: null,
        data: {},
        requiresReceipt: false,
        message: '¡Te inscribiste! Cumplí la misión para ganar el premio.',
        ...(res.result || {}),
      })
    } catch (err) {
      setError(err.message || 'Error al inscribirse')
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'enrolled') {
    return (
      <Wrap>
        <SuccessBox>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{emoji}</div>
          <div>¡Te inscribiste!</div>
          <div style={{ marginTop: 8, fontSize: 13, color: T.t2 }}>
            Cumplí la misión para ganar el premio.
          </div>
        </SuccessBox>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <BigEmoji>{emoji}</BigEmoji>

      <MissionTitle>{event?.title || 'Misión de Ranking'}</MissionTitle>

      {event?.description && (
        <MissionDesc>{event.description}</MissionDesc>
      )}

      <GoalBadge>
        <span>🎯</span>
        <span>{goalText(cfg)}</span>
      </GoalBadge>

      <PeriodBadge>
        📅 Período: {periodLabel}
      </PeriodBadge>

      <PrizeLine>
        🏆 {event?.prize_amount} {prizeLabel(event?.prize_type)}
      </PrizeLine>

      <ProgressWrap>
        <ProgressLabel>
          <span>Tu progreso</span>
          <span>0 / {cfg.goal_amount ?? '?'}</span>
        </ProgressLabel>
        <ProgressBar>
          <ProgressFill style={{ '--pct': '0%' }} />
        </ProgressBar>
      </ProgressWrap>

      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      <EnrollBtn type="button" disabled={loading} onClick={handleEnroll}>
        {loading ? '...' : '⚡ Inscribirme'}
      </EnrollBtn>
    </Wrap>
  )
}
