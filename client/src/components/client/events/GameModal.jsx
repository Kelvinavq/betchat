import { Suspense, lazy, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import ResultScreen from './ResultScreen'

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const slideUp = keyframes`
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`

// ─── Styled components ────────────────────────────────────────────────────────
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease both;
`

const ModalWrap = styled.div`
  position: fixed;
  z-index: 1201;
  background: #0c1220;
  border: 1px solid rgba(255, 255, 255, 0.08);
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.25s cubic-bezier(0.32, 0.72, 0, 1) both;

  /* Desktop: centered */
  @media (min-width: 540px) {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 480px;
    width: 100%;
    border-radius: 24px;
    margin: auto;
  }

  /* Mobile: sheet from bottom */
  @media (max-width: 539px) {
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 24px 24px 0 0;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #f8fafc;
  }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GAME_COMPONENTS = {
  sorteo: lazy(() => import('./games/SorteoGame')),
  quiz: lazy(() => import('./games/QuizGame')),
  scratch: lazy(() => import('./games/ScratchGame')),
  roulette: lazy(() => import('./games/RouletteGame')),
  slots: lazy(() => import('./games/SlotsGame')),
  red_black: lazy(() => import('./games/RedBlackGame')),
  briefcase: lazy(() => import('./games/BriefcaseGame')),
  treasure_chest: lazy(() => import('./games/TreasureChestGame')),
  ranking: lazy(() => import('./games/RankingGame')),
}

const GAME_EMOJI = {
  sorteo: '🎰',
  quiz: '🧠',
  scratch: '🎫',
  roulette: '⚙️',
  slots: '🎰',
  red_black: '🔴',
  briefcase: '💼',
  treasure_chest: '💎',
  ranking: '🏆',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GameModal({ event, clientId, onClose }) {
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState('game') // 'game' | 'result'

  const GameComponent = GAME_COMPONENTS[event?.type]

  useEffect(() => {
    console.log('[GameModal] mount', { eventId: event?.id, type: event?.type })
    window.postMessage({ type: 'game_event', event: 'game_opened' }, '*')
    return () => {
      console.log('[GameModal] unmount', { eventId: event?.id, type: event?.type })
      window.postMessage({ type: 'game_event', event: 'game_closed' }, '*')
    }
  }, [])

  const handleResult = (res) => {
    setResult(res)
    setPhase('result')
  }

  return createPortal(
    <>
      <Backdrop onClick={() => {
        console.log('[GameModal] backdrop close', { eventId: event?.id, type: event?.type })
        onClose?.('manual')
      }} />
      <ModalWrap>
        <ModalHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f8fafc' }}>
            <span style={{ fontSize: 20 }}>{GAME_EMOJI[event?.type] || '🎮'}</span>
            {event?.title}
          </div>
          <CloseBtn onClick={() => {
            console.log('[GameModal] button close', { eventId: event?.id, type: event?.type })
            onClose?.('manual')
          }} aria-label="Cerrar">×</CloseBtn>
        </ModalHeader>

        <div style={{ padding: '20px' }}>
          {phase === 'game' && GameComponent && (
            <Suspense fallback={<div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Cargando juego...</div>}>
              <GameComponent
                event={event}
                clientId={clientId}
                onResult={handleResult}
                onClose={onClose}
              />
            </Suspense>
          )}

          {phase === 'result' && (
            <ResultScreen result={result} onClose={onClose} />
          )}

          {!GameComponent && (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>
              Tipo de juego no disponible.
            </div>
          )}
        </div>
      </ModalWrap>
    </>,
    document.body
  )
}
