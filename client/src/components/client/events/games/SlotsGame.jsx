import { useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}`
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`
const glowWin = keyframes`
  0%,100% { box-shadow: 0 0 20px rgba(245,158,11,0.4); }
  50%      { box-shadow: 0 0 40px rgba(245,158,11,0.8), 0 0 80px rgba(245,158,11,0.3); }
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

const ALL_SYMBOLS = ['🍒', '⭐', '7️⃣', '🍋', '💎', '🔔', '🍀', '🎰', '💰', '🌙']

/* ── Styled Components ── */
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const Machine = styled.div`
  width: 100%;
  max-width: 300px;
  background: linear-gradient(160deg, #111827, #0c1220);
  border: 2px solid ${({ primaryColor }) => primaryColor || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 20px 16px;
  box-shadow:
    0 4px 30px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.05);
`

const MachineName = styled.div`
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${({ primaryColor }) => primaryColor || T.gold};
  margin-bottom: 16px;
  opacity: 0.85;
`

const ReelsRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 4px;
`

const ReelWrap = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  border: 2px solid ${({ won }) => (won ? T.gold : T.border)};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: ${({ won }) => (won ? glowWin : 'none')} 1.5s ease-in-out infinite;
  transition: border-color 0.3s;
`

const ReelViewport = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
`

const ReelTrack = styled.div`
  position: absolute;
  inset: 0;
  transform: translateY(${({ $offset }) => $offset || 0}px);
  transition: transform ${({ $duration }) => $duration || 0}ms cubic-bezier(0.12, 0.85, 0.16, 1);
`

const ReelSymbol = styled.div`
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  line-height: 1;
`

const WinLine = styled.div`
  width: 100%;
  height: 2px;
  background: ${T.gold};
  opacity: 0.3;
  border-radius: 2px;
  margin: 0;
`

const BigBtn = styled.button`
  width: 100%;
  max-width: 300px;
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: ${({ disabled }) =>
    disabled
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: ${({ disabled }) => (disabled ? T.t2 : '#000')};
  font-size: 18px;
  font-weight: 900;
  font-family: inherit;
  letter-spacing: 1px;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s;
  animation: ${({ disabled }) => (disabled ? 'none' : pulse)} 2s ease-in-out infinite;
  &:hover:not(:disabled) { transform: translateY(-2px); }
`

const ResultBox = styled.div`
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: ${({ won }) =>
    won ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${({ won }) =>
    won ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'};
  color: ${({ won }) => (won ? T.success : T.danger)};
  font-size: 15px;
  font-weight: 600;
  animation: ${popIn} 0.4s ease both;
  width: 100%;
  max-width: 300px;
`

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

function randomSymbol() {
  return ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
}

export default function SlotsGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const primaryColor = cfg.primary_color || T.gold
  const buttonText = cfg.button_text || 'JUGAR'

  const [phase, setPhase] = useState('ready') // 'ready' | 'spinning' | 'result'
  const [combo, setCombo] = useState(null)
  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spinState, setSpinState] = useState([
    { items: ['🎰', '⭐', '7️⃣', '🍋', '💎', '🔔', '🍀', '🎰', '💰', '🌙'], offset: 0, duration: 0 },
    { items: ['🎰', '⭐', '7️⃣', '🍋', '💎', '🔔', '🍀', '🎰', '💰', '🌙'], offset: 0, duration: 0 },
    { items: ['🎰', '⭐', '7️⃣', '🍋', '💎', '🔔', '🍀', '🎰', '💰', '🌙'], offset: 0, duration: 0 },
  ])

  const timeoutRef = useRef(null)
  const sequenceRef = useRef(0)

  const handlePlay = async () => {
    if (phase !== 'ready' || loading) return
    setPhase('spinning')
    setLoading(true)
    setError('')
    sequenceRef.current += 1
    const spinId = sequenceRef.current
    const reelsHeight = 80
    const spinItems = Array.from({ length: 30 }, () => randomSymbol())
    const baseOffsets = [0, 140, 280]
    const durations = [8600, 9200, 9800]

    setSpinState([
      { items: spinItems, offset: baseOffsets[0], duration: durations[0] },
      { items: spinItems, offset: baseOffsets[1], duration: durations[1] },
      { items: spinItems, offset: baseOffsets[2], duration: durations[2] },
    ])

    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, {})
      const finalCombo = res.result?.data?.combo || ['⭐', '⭐', '⭐']
      setCombo(finalCombo)
      setApiResult(res.result)

      const finalTracks = finalCombo.map((symbol, index) => {
        const reelSymbols = [...spinItems.slice(index * 2), ...spinItems.slice(0, index * 2), symbol, symbol, symbol]
        const finalIndex = reelSymbols.length - 3
        return {
          items: reelSymbols,
          offset: -(finalIndex * reelsHeight),
          duration: durations[index],
        }
      })

      requestAnimationFrame(() => {
        if (sequenceRef.current !== spinId) return
        setSpinState(finalTracks)
      })

      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (sequenceRef.current !== spinId) return
        setPhase('result')
        setLoading(false)
      }, 10100)
    } catch (err) {
      setError(err.message || 'Error al jugar')
      setPhase('ready')
      setLoading(false)
      setSpinState([
        { items: ['🎰', '⭐', '7️⃣'], offset: 0, duration: 0 },
        { items: ['🎰', '⭐', '7️⃣'], offset: 0, duration: 0 },
        { items: ['🎰', '⭐', '7️⃣'], offset: 0, duration: 0 },
      ])
    }
  }

  const handleViewResult = () => {
    if (apiResult) onResult(apiResult)
  }

  const isWin = apiResult?.won === true
  const allMatch = combo && combo.length === 3 && combo[0] === combo[1] && combo[1] === combo[2]
  const prizeAmount = Number(apiResult?.prize?.amount ?? event?.prize_amount ?? 0)
  const prizeType = apiResult?.prize?.prize_type || event?.prize_type || 'fichas'

  return (
    <Wrap>
      <Machine primaryColor={primaryColor}>
        <MachineName primaryColor={primaryColor}>
          {cfg.machine_name || '🎰 SLOTS'}
        </MachineName>

        <WinLine />
        <ReelsRow>
          {spinState.map((reel, i) => (
            <ReelWrap key={i} won={phase === 'result' && isWin ? 1 : 0}>
              <ReelViewport>
                <ReelTrack $offset={reel.offset} $duration={reel.duration}>
                  {reel.items.map((sym, idx) => (
                    <ReelSymbol key={`${i}-${idx}`}>{sym}</ReelSymbol>
                  ))}
                </ReelTrack>
              </ReelViewport>
            </ReelWrap>
          ))}
        </ReelsRow>
        <WinLine />
      </Machine>

      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      {phase !== 'result' && (
        <BigBtn type="button" disabled={phase === 'spinning'} onClick={handlePlay}>
          {phase === 'spinning' ? '...' : `🎰 ${buttonText}`}
        </BigBtn>
      )}

      {phase === 'result' && apiResult && (
        <>
          <ResultBox won={isWin ? 1 : 0}>
            {isWin
              ? `🎉 ¡${allMatch ? 'JACKPOT! ' : ''}Ganaste ${prizeAmount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${prizeLabel(prizeType)}!`
              : '😔 No fue esta vez. ¡Intentá de nuevo!'}
          </ResultBox>
          <BigBtn type="button" onClick={handleViewResult} disabled={false}>
            Ver resultado
          </BigBtn>
        </>
      )}
    </Wrap>
  )
}
