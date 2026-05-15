import { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const timerShrink = keyframes`from{width:100%}to{width:0%}`
const popIn = keyframes`0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}`

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

const TimerBar = styled.div`
  position: relative;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  overflow: hidden;
`

const TimerFill = styled.div`
  position: absolute;
  left: 0; top: 0; bottom: 0;
  border-radius: 4px;
  background: ${({ pct }) =>
    pct > 60 ? T.success : pct > 30 ? T.gold : T.danger};
  width: ${({ pct }) => pct}%;
  transition: width 1s linear, background 1s linear;
`

const TimerDisplay = styled.div`
  text-align: center;
  font-size: 32px;
  font-weight: 900;
  color: ${({ urgent }) => (urgent ? T.danger : T.t1)};
  line-height: 1;
  transition: color 0.5s;
`

const QuestionCard = styled.div`
  background: ${T.card};
  border: 1px solid ${T.border};
  border-radius: 14px;
  padding: 20px;
  font-size: 17px;
  font-weight: 600;
  color: ${T.t1};
  line-height: 1.5;
  text-align: center;
`

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const OptionBtn = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border-radius: 12px;
  border: 2px solid ${({ state }) =>
    state === 'correct' ? T.success
    : state === 'wrong' ? T.danger
    : T.border};
  background: ${({ state }) =>
    state === 'correct' ? 'rgba(16,185,129,0.12)'
    : state === 'wrong' ? 'rgba(239,68,68,0.10)'
    : T.card};
  color: ${T.t1};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-align: left;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
  animation: ${popIn} 0.25s ease both;
  &:hover:not(:disabled) { transform: scale(1.02); border-color: ${T.accent}; }
`

const OptionKey = styled.span`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: ${T.t2};
`

const ResultBox = styled.div`
  text-align: center;
  padding: 18px;
  border-radius: 12px;
  background: ${({ won }) =>
    won ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${({ won }) =>
    won ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'};
  color: ${({ won }) => (won ? T.success : T.danger)};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  animation: ${popIn} 0.3s ease both;
`

const Btn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, ${T.accent}, #2563eb);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  &:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.92; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const KEYS = ['A', 'B', 'C', 'D']

function prizeLabel(prize_type) {
  if (prize_type === 'fichas') return 'fichas'
  if (prize_type === 'bono_200') return 'bono 200%'
  return 'premio especial'
}

export default function QuizGame({ event, clientId, onResult, onClose }) {
  const cfg = event?.config_json || {}
  const totalSeconds = cfg.answer_time_seconds || 15
  const correct = cfg.correct_option // 'A' | 'B' | 'C' | 'D'

  const [phase, setPhase] = useState('playing') // 'playing' | 'answered' | 'timeout'
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [chosen, setChosen] = useState(null) // 'A' | 'B' | ...
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const intervalRef = useRef(null)
  const calledRef = useRef(false)

  const callApi = async (answer) => {
    if (calledRef.current) return
    calledRef.current = true
    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/api/client/events/${event.id}/play`, { answer: answer || '' })
      setResult(res.result)
    } catch (err) {
      setError(err.message || 'Error al enviar respuesta')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeout = () => {
    if (calledRef.current) return
    clearInterval(intervalRef.current)
    setPhase('timeout')
    callApi('')
  }

  useEffect(() => {
    setSecondsLeft(totalSeconds)
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          handleTimeout()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswer = (key) => {
    if (phase !== 'playing' || loading || calledRef.current) return
    clearInterval(intervalRef.current)
    setChosen(key)
    setPhase('answered')
    callApi(key)
  }

  const pct = Math.round((secondsLeft / totalSeconds) * 100)
  const isAnsweredOrTimeout = phase === 'answered' || phase === 'timeout'

  const getOptionState = (key) => {
    if (!isAnsweredOrTimeout) return 'idle'
    if (key === correct) return 'correct'
    if (key === chosen && chosen !== correct) return 'wrong'
    return 'idle'
  }

  const won = chosen === correct

  return (
    <Wrap>
      {/* Timer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TimerDisplay urgent={secondsLeft <= 5 ? 1 : 0}>
          {secondsLeft}s
        </TimerDisplay>
        <TimerBar>
          <TimerFill pct={pct} />
        </TimerBar>
      </div>

      {/* Question */}
      <QuestionCard>
        {cfg.question || 'Cargando pregunta...'}
      </QuestionCard>

      {/* Options */}
      <OptionsGrid>
        {KEYS.map((key) => {
          const optionText = cfg.options?.[key] || `Opción ${key}`
          return (
            <OptionBtn
              key={key}
              state={getOptionState(key)}
              disabled={isAnsweredOrTimeout || loading}
              onClick={() => handleAnswer(key)}
            >
              <OptionKey>{key}</OptionKey>
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.3 }}>{optionText}</span>
            </OptionBtn>
          )
        })}
      </OptionsGrid>

      {/* Error */}
      {error && (
        <p style={{ color: T.danger, fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      {/* Timeout message */}
      {phase === 'timeout' && !result && (
        <ResultBox won={0}>
          ⏰ Tiempo agotado.
        </ResultBox>
      )}

      {/* Result */}
      {isAnsweredOrTimeout && result && (
        <>
          <ResultBox won={won ? 1 : 0}>
            {won
              ? `✓ ¡Correcto! Ganaste ${event?.prize_amount} ${prizeLabel(event?.prize_type)}`
              : `✗ ${phase === 'timeout' ? 'Tiempo agotado.' : 'Incorrecto.'} La respuesta correcta era ${correct}.`
            }
          </ResultBox>
          <Btn type="button" disabled={loading} onClick={() => onResult(result)}>
            {loading ? '...' : 'Ver resultado'}
          </Btn>
        </>
      )}
    </Wrap>
  )
}
