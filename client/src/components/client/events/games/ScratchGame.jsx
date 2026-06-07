import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { api } from '../../../../utils/api.js'

/* ── Tokens ── */
const T = {
  bg: '#0c1220',
  card: '#111827',
  gold: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  t1: '#f8fafc',
  t2: '#94a3b8',
  border: 'rgba(255,255,255,0.08)',
}

/* ── Animations ── */
const fadeIn   = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`
const pulse    = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`
const popIn    = keyframes`0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}`
const winPulse = keyframes`0%,100%{box-shadow:0 0 0 2px rgba(245,158,11,0.4)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0.15)}`

/* ── Styled ── */
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const Header = styled.div`text-align: center;`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
`

const CardWrap = styled.div`
  aspect-ratio: 1;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: ${T.card};
  border: 1.5px solid ${({ $win }) =>
    $win === 'winner' ? 'rgba(245,158,11,0.7)'
    : T.border};
  transition: border-color 0.3s;
  animation: ${({ $visible }) => $visible ? popIn : 'none'} 0.35s ease both;
  animation-delay: ${({ $delay }) => $delay}ms;
  ${({ $win }) => $win === 'winner' ? css`animation: ${winPulse} 1.5s ease-in-out infinite;` : ''}
`

const PrizeFace = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
`

const PrizeIcon = styled.div`
  font-size: 28px;
  line-height: 1;
`

const PrizeLabel = styled.div`
  font-size: 9px;
  color: ${T.t2};
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
`

const LockedCover = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, #374151, #4b5563, #374151);
  opacity: 0.85;
`

const BigBtn = styled.button`
  width: 100%;
  max-width: 320px;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: ${({ $secondary }) =>
    $secondary
      ? 'rgba(255,255,255,0.08)'
      : 'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: ${({ $secondary }) => ($secondary ? T.t2 : '#000')};
  font-size: 16px;
  font-weight: 900;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  animation: ${({ disabled, $secondary }) =>
    disabled || $secondary ? 'none' : pulse} 2s ease-in-out infinite;
  transition: opacity 0.2s, transform 0.15s;
  &:hover:not(:disabled) { transform: translateY(-2px); }
`

const ResultBox = styled.div`
  width: 100%;
  max-width: 320px;
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: ${({ $won }) => $won ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.07)'};
  border: 1px solid ${({ $won }) => $won ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'};
  color: ${({ $won }) => $won ? T.success : T.danger};
  font-weight: 600;
  font-size: 14px;
  animation: ${popIn} 0.4s ease both;
`

const HintRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${T.t2};
`

/* ── Signature helper (must match server logic) ── */
const signatureOf = (card) => {
  if (!card) return ''
  return [
    String(card.icon  || '').trim(),
    String(card.label || '').trim(),
    String(card.prize_type || '').trim(),
  ].join('|')
}

/* ── ScratchCanvas ── */
const CARD_SIZE = 96

function ScratchCanvas({ onFullyRevealed }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const revealed  = useRef(false)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE)
    grad.addColorStop(0, '#475569')
    grad.addColorStop(0.5, '#64748b')
    grad.addColorStop(1, '#475569')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(
        Math.random() * CARD_SIZE, Math.random() * CARD_SIZE,
        Math.random() * 3 + 1, Math.random() * 3 + 1
      )
    }
    ctx.font = `bold 11px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('RASPAR', CARD_SIZE / 2, CARD_SIZE / 2)
  }, [])

  const getXY = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy }
  }

  const scratch = useCallback((e) => {
    if (!drawing.current || revealed.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getXY(e, canvas)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.fill()
    const data = ctx.getImageData(0, 0, CARD_SIZE, CARD_SIZE).data
    let transparent = 0
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 128) transparent++
    }
    if (transparent / (data.length / 16) > 0.55 && !revealed.current) {
      revealed.current = true
      onFullyRevealed()
    }
  }, [onFullyRevealed])

  return (
    <canvas
      ref={canvasRef}
      width={CARD_SIZE}
      height={CARD_SIZE}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        borderRadius: 13,
        cursor: 'crosshair',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseDown={(e) => { drawing.current = true; scratch(e) }}
      onMouseMove={scratch}
      onMouseUp={() => { drawing.current = false }}
      onMouseLeave={() => { drawing.current = false }}
      onTouchStart={(e) => { e.preventDefault(); drawing.current = true; scratch(e) }}
      onTouchMove={(e) => { e.preventDefault(); scratch(e) }}
      onTouchEnd={() => { drawing.current = false }}
    />
  )
}

/* ── Main component ── */
export default function ScratchGame({ event, onResult }) {
  const [phase, setPhase]               = useState('ready') // ready | fetching | scratching | done
  const [cards, setCards]               = useState(Array(9).fill(null))
  const [revealedIndices, setRevealedIndices] = useState([])
  const [apiResult, setApiResult]       = useState(null)
  const [error, setError]               = useState('')

  const linePatterns = useMemo(() => ([
    { key: 'row_top', label: 'fila superior', positions: [0, 1, 2] },
    { key: 'row_mid', label: 'fila central', positions: [3, 4, 5] },
    { key: 'row_bot', label: 'fila inferior', positions: [6, 7, 8] },
    { key: 'col_left', label: 'columna izquierda', positions: [0, 3, 6] },
    { key: 'col_mid', label: 'columna central', positions: [1, 4, 7] },
    { key: 'col_right', label: 'columna derecha', positions: [2, 5, 8] },
    { key: 'diag_main', label: 'diagonal principal', positions: [0, 4, 8] },
    { key: 'diag_anti', label: 'diagonal secundaria', positions: [2, 4, 6] },
  ]), [])

  useEffect(() => {
    console.log('[ScratchGame] mount', { eventId: event?.id })
    return () => {
      console.log('[ScratchGame] unmount', { eventId: event?.id, phase })
    }
  }, [])

  const handleStart = async () => {
    if (phase !== 'ready') return
    setPhase('fetching')
    setError('')
    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {})
      const revealed = res.result?.data?.revealed || Array.from({ length: 9 }, () => ({ icon: '⭐', label: 'Premio', prize_type: 'none', amount: 0 }))
      setCards(revealed)
      setRevealedIndices([])
      setApiResult(res.result)
      setPhase('scratching')
    } catch (err) {
      setError(err.message || 'Error al iniciar el juego')
      setPhase('ready')
    }
  }

  const handleCardRevealed = useCallback((index) => {
    setRevealedIndices((prev) => {
      if (prev.includes(index)) return prev
      return [...prev, index]
    })
  }, [])

  const winningLine = useMemo(() => {
    if (!apiResult?.won) return null
    for (const pattern of linePatterns) {
      const lineCards = pattern.positions.map((index) => cards[index]).filter(Boolean)
      if (lineCards.length !== 3) continue
      if (lineCards.some((card) => !card || card.prize_type === 'none')) continue
      const sig = signatureOf(lineCards[0])
      if (!sig) continue
      if (lineCards.every((card) => signatureOf(card) === sig)) return pattern
    }
    return null
  }, [apiResult?.won, cards, linePatterns])
  const winningPositions = winningLine?.positions || []

  // Real-time win detection: stop as soon as the winning line is fully revealed
  useEffect(() => {
    if (phase !== 'scratching' || !apiResult) return
    if (revealedIndices.length === 0) return

    if (apiResult.won && winningPositions.length > 0) {
      const hasLine = winningPositions.every(i => revealedIndices.includes(i))
      if (hasLine) {
        setPhase('done')
        // Auto-credit fichas as soon as the winning line is fully revealed
        api.post(`/api/client/events/${event.id}/settle-reward`, {}).catch(() => {})
        return
      }
    }

    // Loss path: all 9 revealed
    if (revealedIndices.length >= 9) {
      setPhase('done')
    }
  }, [revealedIndices, phase, apiResult, winningPositions, event.id])

  const prizeText = () => {
    const p = apiResult?.prize
    if (!p) return ''
    if (p.prize_type === 'fichas') return `${Number(p.amount).toLocaleString('es-AR')} fichas`
    return p.label || 'Premio especial'
  }

  const headerPrizeText = () => {
    const rules = event?.config_json?.win_rules || []
    const bestRule = rules.filter(r => r.enabled !== false).sort((a, b) => Number(b.match_count) - Number(a.match_count))[0]
    if (bestRule) {
      const n = Number(bestRule.match_count)
      const amt = Number(bestRule.amount)
      if (amt > 0) return `¡Formá ${n} iguales en línea y ganá ${amt.toLocaleString('es-AR', { minimumFractionDigits: 0 })} fichas!`
      return `¡Formá ${n} iguales en línea y ganá!`
    }
    const amount = Number(event?.prize_amount)
    if (Number.isFinite(amount) && amount > 0) {
      return `¡Formá 3 iguales en línea y ganá ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })} fichas!`
    }
    return '¡Formá 3 iguales en línea y ganá!'
  }

  const scratching = phase === 'scratching'

  return (
    <Wrap>
      <Header>
        <div style={{ fontSize: 26, marginBottom: 2 }}>🎫</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.t1 }}>Raspa y Gana</div>
        <div style={{ fontSize: 12, color: T.t2, marginTop: 3 }}>{headerPrizeText()}</div>
      </Header>

      {/* 3×3 card grid */}
      {(phase === 'scratching' || phase === 'done') && (
        <Grid>
          {cards.map((card, i) => {
            const isScratched = revealedIndices.includes(i)
            const isWinner    = isScratched && (
              winningPositions.length > 0 && winningPositions.includes(i)
            )

            return (
              <CardWrap
                key={i}
                $win={isWinner ? 'winner' : undefined}
                $visible
                $delay={i * 40}
              >
                <PrizeFace>
                  <PrizeIcon>{card?.icon || '⭐'}</PrizeIcon>
                  <PrizeLabel>{card?.label || ''}</PrizeLabel>
                </PrizeFace>

                {/* Active scratch canvas */}
                {!isScratched && scratching && (
                  <ScratchCanvas onFullyRevealed={() => handleCardRevealed(i)} />
                )}

                {/* Locked (game ended, card not yet revealed) */}
                {!isScratched && !scratching && (
                  <LockedCover />
                )}
              </CardWrap>
            )
          })}
        </Grid>
      )}

      {error && (
        <div style={{ color: T.danger, fontSize: 13, textAlign: 'center' }}>{error}</div>
      )}

      {phase === 'ready' && (
        <BigBtn type="button" onClick={handleStart}>
          🎫 EMPEZAR A RASPAR
        </BigBtn>
      )}

      {phase === 'fetching' && (
        <BigBtn type="button" disabled>Cargando tarjeta...</BigBtn>
      )}

      {phase === 'scratching' && (
        <HintRow>✦ Buscá 3 iguales en línea horizontal, vertical o diagonal</HintRow>
      )}

      {phase === 'done' && apiResult && (
        <>
          <ResultBox $won={apiResult.won}>
            {apiResult.won
              ? `🎉 ¡Ganaste! ${prizeText()}`
              : '😔 No fue esta vez. ¡Mejor suerte la próxima!'}
          </ResultBox>
          <BigBtn type="button" onClick={() => onResult(apiResult)}>
            Ver resultado completo
          </BigBtn>
        </>
      )}
    </Wrap>
  )
}
