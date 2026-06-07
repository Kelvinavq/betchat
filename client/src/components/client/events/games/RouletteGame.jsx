import { useMemo, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'

const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`

const T = {
  card: '#0c1220',
  accent: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  t1: '#f8fafc',
  t2: '#94a3b8',
  border: 'rgba(255,255,255,0.08)',
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const WheelFrame = styled.div`
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Pointer = styled.div`
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 24px solid #fff;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.55));
  z-index: 4;
`

const WheelSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 0 18px rgba(59,130,246,0.2));
`

const WheelGroup = styled.g`
  transform-origin: 50% 50%;
`

const CenterCap = styled.div`
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle, #1e2a3a, #0c1220 70%);
  border: 3px solid rgba(255,255,255,0.12);
  box-shadow: 0 0 12px rgba(0,0,0,0.75), inset 0 0 10px rgba(255,255,255,0.04);
  z-index: 3;
`

const SegmentLabels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 280px;
`

const SegLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${T.t2};
  background: ${T.card};
  border: 1px solid ${T.border};
  border-radius: 20px;
  padding: 4px 10px;
`

const ColorDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ color }) => color};
  flex-shrink: 0;
`

const BigBtn = styled.button`
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: ${({ disabled }) => disabled ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
  color: ${({ disabled }) => (disabled ? T.t2 : '#fff')};
  font-size: 17px;
  font-weight: 900;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s;
  animation: ${({ disabled }) => (disabled ? 'none' : pulse)} 2s ease-in-out infinite;
  &:hover:not(:disabled) { transform: translateY(-2px); }
`

const ResultOverlay = styled.div`
  background: rgba(16,185,129,0.10);
  border: 1px solid rgba(16,185,129,0.3);
  border-radius: 14px;
  padding: 18px;
  text-align: center;
  animation: ${popIn} 0.4s ease both;
  width: 100%;
`

const ErrorText = styled.p`
  color: ${T.danger};
  font-size: 13px;
  text-align: center;
  margin: 0;
`

function prizeLabel(prizeType) {
  if (prizeType === 'fichas') return 'fichas'
  if (prizeType === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function describeSector(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle)
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle)
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle)
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerEnd.x} ${outerEnd.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerStart.x} ${outerStart.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function normalizeSegments(segments) {
  const fallback = [
    { label: 'Premio Mayor', color: '#ef4444', icon: '🏆', probability: 1, prize_type: 'fichas', amount: 500 },
    { label: 'Premio Medio', color: '#f59e0b', icon: '🥈', probability: 1, prize_type: 'fichas', amount: 200 },
    { label: 'Premio Menor', color: '#10b981', icon: '🥉', probability: 1, prize_type: 'fichas', amount: 50 },
    { label: 'Bonus 200%', color: '#2563eb', icon: '🎁', probability: 1, prize_type: 'bono_200', amount: 0 },
    { label: 'Sin premio', color: '#7c3aed', icon: '⚪', probability: 1, prize_type: 'none', amount: 0 },
  ]
  return (segments?.length ? segments : fallback).map((seg, index) => ({
    label: seg.label || `Sector ${index + 1}`,
    color: seg.color || fallback[index % fallback.length].color,
    icon: seg.icon || fallback[index % fallback.length].icon,
    probability: Number(seg.probability) || 1,
    prize_type: seg.prize_type || 'none',
    amount: Number(seg.amount ?? seg.prize_amount ?? 0) || 0,
  }))
}

function buildWheelRotation(segments, index, extraTurns = 5) {
  const safeIndex = Math.max(0, Math.min(index, segments.length - 1))
  const segmentAngle = 360 / Math.max(segments.length, 1)
  const before = safeIndex * segmentAngle
  const current = segmentAngle
  const center = before + current / 2
  return extraTurns * 360 + (360 - center)
}

export default function RouletteGame({ event, clientId, onResult }) {
  const cfg = event?.config_json || {}
  const segments = useMemo(() => normalizeSegments(cfg.segments), [cfg.segments])

  const [phase, setPhase] = useState('ready')
  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rotation, setRotation] = useState(0)
  const [transitionEnabled, setTransitionEnabled] = useState(false)
  const equalAngle = 360 / Math.max(segments.length, 1)

  const handleSpin = async () => {
    if (phase !== 'ready' || loading) return
    setPhase('spinning')
    setLoading(true)
    setError('')

    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {})
      const serverIndex = Number(res?.result?.data?.segmentIndex)
      const safeIndex = Number.isInteger(serverIndex) && serverIndex >= 0
        ? serverIndex
        : Math.floor(Math.random() * Math.max(segments.length, 1))
      const nextRotation = buildWheelRotation(segments, safeIndex, 5)

      requestAnimationFrame(() => {
        setTransitionEnabled(true)
        setRotation(nextRotation)
      })

      setTimeout(() => {
        setApiResult(res.result)
        setPhase('result')
        setLoading(false)
      }, 9200)
    } catch (err) {
      setError(err.message || 'Error al girar')
      setPhase('ready')
      setLoading(false)
    }
  }

  const handleViewResult = () => {
    if (apiResult) onResult(apiResult)
  }

  const rOuter = 110
  const rInner = 34
  const center = 130

  return (
    <Wrap>
      <WheelFrame>
        <Pointer />
        <WheelSvg viewBox="0 0 260 260" aria-label="Ruleta">
          <defs>
            <radialGradient id="wheelShade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="75%" stopColor="rgba(0,0,0,0.0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
            </radialGradient>
          </defs>

          <WheelGroup
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: transitionEnabled ? 'transform 9s cubic-bezier(0.17, 0.67, 0.12, 1)' : 'none',
            }}
          >
            {segments.map((seg, index) => {
              const startAngle = index * equalAngle
              const span = equalAngle
              const endAngle = startAngle + span

              return (
                <g key={`${seg.label}-${index}`}>
                  <path
                    d={describeSector(center, center, rOuter, rInner, startAngle, endAngle)}
                    fill={seg.color}
                    stroke="#0c1220"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </g>
              )
            })}
            <circle cx={center} cy={center} r={rInner} fill="url(#wheelShade)" />
          </WheelGroup>
        </WheelSvg>
        <CenterCap />
      </WheelFrame>

      {segments.length > 0 && (
        <SegmentLabels>
          {segments.map((seg, i) => (
            <SegLabel key={i}>
              <ColorDot color={seg.color} />
              <span>{seg.icon}</span>
              <span>{seg.label}</span>
            </SegLabel>
          ))}
        </SegmentLabels>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {phase !== 'result' && (
        <BigBtn type="button" disabled={phase === 'spinning'} onClick={handleSpin}>
          {phase === 'spinning' ? '...' : 'GIRAR'}
        </BigBtn>
      )}

      {phase === 'result' && apiResult && (
        <>
          <ResultOverlay>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {apiResult.won ? '🏆' : '😔'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 6 }}>
              {apiResult.won
                ? `¡Ganaste! ${apiResult.prize?.amount ?? event?.prize_amount ?? 0} ${prizeLabel(apiResult.prize?.prize_type || event?.prize_type)}`
                : 'No fue esta vez'}
            </div>
            {apiResult.message && (
              <div style={{ fontSize: 13, color: T.t2 }}>{apiResult.message}</div>
            )}
          </ResultOverlay>
          <BigBtn type="button" onClick={handleViewResult}>
            Ver resultado
          </BigBtn>
        </>
      )}
    </Wrap>
  )
}
