import { useCallback, useEffect, useState } from 'react'
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
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ pct }) => pct}%;
  background: ${({ pct }) =>
    pct >= 100
      ? `linear-gradient(90deg, ${T.success}, #34d399)`
      : `linear-gradient(90deg, ${T.accent}, ${T.success})`};
  border-radius: 6px;
  transition: width 0.8s ease;
`

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${T.t2};
`

const EnrolledBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.22);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${T.success};
  animation: ${popIn} 0.4s ease both;
`

const RefreshBtn = styled.button`
  align-self: center;
  background: none;
  border: 1px solid ${T.border};
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 12px;
  color: ${T.t2};
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  &:hover { border-color: ${T.accent}; color: ${T.accent}; }
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

const PERIOD_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  all_time: 'Total',
  custom: 'Personalizado',
}

function goalText(cfg, progress) {
  const goal = cfg.goal_amount ?? '?'
  const cur = progress ?? 0
  switch (cfg.mission_type) {
    case 'deposit_count':  return { label: `Meta: ${goal} depósitos`, cur, goal }
    case 'deposit_amount': return { label: `Meta: $${goal} depositados`, cur: `$${cur}`, goal: `$${goal}` }
    case 'charge_count':   return { label: `Meta: ${goal} cargas`, cur, goal }
    default:               return { label: `Meta: ${goal}`, cur, goal }
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

  // If already enrolled, start at progress phase
  const [phase, setPhase] = useState(event?.has_played ? 'progress' : 'info')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  const [progressData, setProgressData] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(false)

  const fetchProgress = useCallback(async () => {
    setLoadingProgress(true)
    try {
      const data = await api.get(`/api/client/events/${event.id}/ranking-progress`)
      setProgressData(data)
    } catch {
      // silently ignore — keep stale data
    } finally {
      setLoadingProgress(false)
    }
  }, [event.id])

  useEffect(() => {
    if (phase === 'progress') {
      fetchProgress()
    }
  }, [phase, fetchProgress])

  const handleEnroll = async () => {
    if (enrolling) return
    setEnrolling(true)
    setEnrollError('')
    try {
      await api.post(`/api/client/events/${event.id}/play`, {})
      setPhase('progress')
    } catch (err) {
      setEnrollError(err.message || 'Error al inscribirse')
    } finally {
      setEnrolling(false)
    }
  }

  const gt = goalText(cfg, progressData?.progress)
  const pct = progressData?.pct ?? 0
  const completed = pct >= 100

  if (phase === 'progress') {
    return (
      <Wrap>
        <BigEmoji>{emoji}</BigEmoji>

        <MissionTitle>{event?.title || 'Misión de Ranking'}</MissionTitle>

        {event?.description && (
          <MissionDesc>{event.description}</MissionDesc>
        )}

        <EnrolledBanner>
          <span>✅</span>
          <span>¡Estás inscripto! Cumplí la misión para ganar.</span>
        </EnrolledBanner>

        <GoalBadge>
          <span>🎯</span>
          <span>{gt.label}</span>
        </GoalBadge>

        <PrizeLine>
          🏆 {event?.prize_amount} {prizeLabel(event?.prize_type)}
        </PrizeLine>

        <ProgressWrap>
          <ProgressLabel>
            <span>Tu progreso</span>
            <span style={{ color: completed ? T.success : T.t1, fontWeight: 700 }}>
              {loadingProgress ? '...' : `${gt.cur} / ${gt.goal}`}
            </span>
          </ProgressLabel>
          <ProgressBar>
            <ProgressFill pct={loadingProgress ? 0 : pct} />
          </ProgressBar>
          {completed && (
            <div style={{ textAlign: 'center', fontSize: 13, color: T.success, fontWeight: 700 }}>
              ¡Meta alcanzada! 🎉
            </div>
          )}
        </ProgressWrap>

        <RefreshBtn type="button" onClick={fetchProgress} disabled={loadingProgress}>
          {loadingProgress ? 'Actualizando...' : '↻ Actualizar progreso'}
        </RefreshBtn>
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
        <span>{gt.label}</span>
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
          <ProgressFill pct={0} />
        </ProgressBar>
      </ProgressWrap>

      {enrollError && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{enrollError}</p>
      )}

      <EnrollBtn type="button" disabled={enrolling} onClick={handleEnroll}>
        {enrolling ? '...' : '⚡ Inscribirme'}
      </EnrollBtn>
    </Wrap>
  )
}
