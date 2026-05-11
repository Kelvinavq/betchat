import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { resolveApiAsset } from '../../utils/api'

/* ─────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(40px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`
const goldShimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`
const goldPulse = keyframes`
  0%,100% { box-shadow: 0 0 24px rgba(245,200,66,.45), 0 0 60px rgba(245,200,66,.18), inset 0 0 30px rgba(245,200,66,.06); }
  50%     { box-shadow: 0 0 40px rgba(245,200,66,.70), 0 0 90px rgba(245,200,66,.30), inset 0 0 50px rgba(245,200,66,.10); }
`
const neonFlicker = keyframes`
  0%,19%,21%,23%,25%,54%,56%,100% { box-shadow: 0 0 4px #00f5ff, 0 0 18px #00f5ff, 0 0 40px rgba(0,245,255,.45); }
  20%,24%,55%                     { box-shadow: none; }
`
const neonTextGlow = keyframes`
  0%,100% { text-shadow: 0 0 8px #00f5ff, 0 0 20px rgba(0,245,255,.70); }
  50%     { text-shadow: 0 0 14px #00f5ff, 0 0 40px rgba(0,245,255,.90); }
`
const firePulse = keyframes`
  0%   { box-shadow: 0 0 30px rgba(255,80,0,.50), 0 0 80px rgba(255,40,0,.25); }
  50%  { box-shadow: 0 0 50px rgba(255,120,0,.75), 0 0 120px rgba(255,60,0,.40); }
  100% { box-shadow: 0 0 30px rgba(255,80,0,.50), 0 0 80px rgba(255,40,0,.25); }
`
const fireGradient = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`
const diamondSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`
const diamondPulse = keyframes`
  0%,100% { box-shadow: 0 0 30px rgba(139,92,246,.50), 0 0 80px rgba(59,130,246,.25); }
  50%     { box-shadow: 0 0 50px rgba(167,139,250,.75), 0 0 120px rgba(96,165,250,.40); }
`

/* ─────────────────────────────────────────────────────────
   Common overlay / close button
───────────────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background: rgba(0,0,0,.75);
  backdrop-filter: blur(6px);
  animation: ${fadeIn} .22s ease both;
`
const CloseBtn = styled.button`
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; line-height: 1;
  cursor: pointer; transition: all .15s;
  border: 1px solid; padding: 0; flex-shrink: 0;
`
const PopupImg = styled.img`
  width: 100%; display: block;
  border-radius: 12px 12px 0 0;
  max-height: 140px; object-fit: cover;
`

/* ════════════════════════════════════
   DESIGN 1 — GOLD (Luxury VIP)
════════════════════════════════════ */
const GoldWrap = styled.div`
  position: relative;
  width: 100%; max-width: 380px;
  border-radius: 20px;
  background: linear-gradient(160deg, #0c0b1e 0%, #120f2a 60%, #0a0817 100%);
  border: 2px solid transparent;
  background-clip: padding-box;
  animation: ${slideUp} .32s cubic-bezier(.16,1,.3,1) both, ${goldPulse} 3s ease-in-out infinite;
  &::before {
    content: '';
    position: absolute; inset: -2px;
    border-radius: 22px; z-index: -1;
    background: linear-gradient(135deg, #f5c842, #d4a017, #ffd700, #c8860a, #f5c842);
    background-size: 300% 300%;
    animation: ${goldShimmer} 4s linear infinite;
  }
`
const GoldInner = styled.div`
  padding: 22px 22px 20px;
  display: flex; flex-direction: column; gap: 12px;
`
const GoldStars = styled.div`
  font-size: 18px; letter-spacing: 4px; text-align: center;
  filter: drop-shadow(0 0 6px rgba(245,200,66,.7));
`
const GoldTitle = styled.h2`
  font-size: 20px; font-weight: 900; text-align: center; margin: 0;
  background: linear-gradient(135deg, #ffd700, #f5c842, #fff8dc, #f5c842, #d4a017);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: ${goldShimmer} 3s linear infinite;
  letter-spacing: -.01em; line-height: 1.2;
`
const GoldBody = styled.p`
  font-size: 14px; color: rgba(255,248,210,.75); text-align: center; line-height: 1.55;
  margin: 0;
`
const GoldBtn = styled.button`
  width: 100%; padding: 13px 16px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #f5c842, #d4a017, #f5c842);
  background-size: 200% auto; animation: ${goldShimmer} 2.5s linear infinite;
  color: #1a0f00; font-size: 14px; font-weight: 900; font-family: inherit;
  cursor: pointer; letter-spacing: .05em;
  box-shadow: 0 4px 20px rgba(212,160,23,.60), 0 2px 6px rgba(0,0,0,.40);
  transition: transform .15s, box-shadow .15s;
  &:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(212,160,23,.80); }
  &:active { transform: scale(.98); }
`
const GoldClose = styled(CloseBtn)`
  background: rgba(245,200,66,.12); border-color: rgba(245,200,66,.35); color: #f5c842;
  &:hover { background: rgba(245,200,66,.25); }
`

function GoldDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <GoldWrap>
      {src && <PopupImg src={src} alt="" />}
      <GoldInner>
        <GoldStars>✨ ✨ ✨</GoldStars>
        <GoldTitle>{popup.title}</GoldTitle>
        {popup.body && <GoldBody>{popup.body}</GoldBody>}
        {popup.ctaLabel && (
          <GoldBtn type="button" onClick={onCta}>
            {popup.ctaLabel}
          </GoldBtn>
        )}
      </GoldInner>
      <GoldClose type="button" onClick={onDismiss}>✕</GoldClose>
    </GoldWrap>
  )
}

/* ════════════════════════════════════
   DESIGN 2 — NEON (Electric Casino)
════════════════════════════════════ */
const NeonWrap = styled.div`
  position: relative;
  width: 100%; max-width: 380px;
  border-radius: 16px;
  background: #000508;
  border: 1.5px solid #00f5ff;
  animation: ${slideUp} .32s cubic-bezier(.16,1,.3,1) both, ${neonFlicker} 6s step-start infinite;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,245,255,.015) 2px,
      rgba(0,245,255,.015) 4px
    );
    pointer-events: none;
  }
`
const NeonHeader = styled.div`
  background: linear-gradient(90deg, #00f5ff18, #ff00ff18, #00f5ff18);
  padding: 10px 16px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid rgba(0,245,255,.25);
  font-size: 11px; font-weight: 700; letter-spacing: .15em;
  text-transform: uppercase; color: rgba(0,245,255,.60);
`
const NeonDot = styled.span`
  width: 7px; height: 7px; border-radius: 50%;
  background: #00f5ff;
  box-shadow: 0 0 8px #00f5ff, 0 0 16px #00f5ff;
  animation: ${neonFlicker} 3s step-start infinite;
`
const NeonInner = styled.div`
  padding: 20px 22px 22px;
  display: flex; flex-direction: column; gap: 12px;
`
const NeonTitle = styled.h2`
  font-size: 19px; font-weight: 900; margin: 0; line-height: 1.2;
  color: #00f5ff;
  animation: ${neonTextGlow} 2.5s ease-in-out infinite;
  letter-spacing: .02em;
`
const NeonBody = styled.p`
  font-size: 13.5px; color: rgba(0,245,255,.55); line-height: 1.55; margin: 0;
`
const NeonBtn = styled.button`
  width: 100%; padding: 12px 16px; border-radius: 8px;
  background: transparent;
  border: 1.5px solid #00f5ff;
  color: #00f5ff; font-size: 13.5px; font-weight: 800; font-family: inherit;
  cursor: pointer; letter-spacing: .08em; text-transform: uppercase;
  box-shadow: 0 0 12px rgba(0,245,255,.35), inset 0 0 12px rgba(0,245,255,.08);
  transition: all .2s;
  &:hover {
    background: rgba(0,245,255,.10);
    box-shadow: 0 0 24px rgba(0,245,255,.65), inset 0 0 24px rgba(0,245,255,.14);
  }
`
const NeonClose = styled(CloseBtn)`
  background: transparent; border-color: rgba(0,245,255,.35); color: rgba(0,245,255,.70);
  &:hover { background: rgba(0,245,255,.10); }
`

function NeonDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <NeonWrap>
      <NeonHeader>
        <NeonDot /> 🎰 Casino Live &nbsp;·&nbsp; Oferta Especial
      </NeonHeader>
      {src && <PopupImg src={src} alt="" style={{ borderRadius: 0 }} />}
      <NeonInner>
        <NeonTitle>{popup.title}</NeonTitle>
        {popup.body && <NeonBody>{popup.body}</NeonBody>}
        {popup.ctaLabel && (
          <NeonBtn type="button" onClick={onCta}>
            ⚡ {popup.ctaLabel}
          </NeonBtn>
        )}
      </NeonInner>
      <NeonClose type="button" onClick={onDismiss}>✕</NeonClose>
    </NeonWrap>
  )
}

/* ════════════════════════════════════
   DESIGN 3 — FIRE (Hot Deal)
════════════════════════════════════ */
const FireWrap = styled.div`
  position: relative;
  width: 100%; max-width: 380px;
  border-radius: 18px;
  background: #0a0302;
  border: 2px solid transparent;
  background-clip: padding-box;
  animation: ${slideUp} .32s cubic-bezier(.16,1,.3,1) both, ${firePulse} 2s ease-in-out infinite;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute; inset: -2px;
    border-radius: 20px; z-index: -1;
    background: linear-gradient(135deg, #ff4500, #ff8c00, #ff0000, #ff6b00, #ff4500);
    background-size: 300% 300%;
    animation: ${fireGradient} 3s ease infinite;
  }
  &::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 100%, rgba(255,80,0,.30) 0%, transparent 70%);
    pointer-events: none;
  }
`
const FireTop = styled.div`
  padding: 8px 16px 4px;
  text-align: center;
  font-size: 24px; letter-spacing: 6px;
  filter: drop-shadow(0 0 8px rgba(255,120,0,.8));
`
const FireInner = styled.div`
  padding: 4px 22px 22px;
  display: flex; flex-direction: column; gap: 12px;
  position: relative; z-index: 1;
`
const FireTitle = styled.h2`
  font-size: 19px; font-weight: 900; margin: 0; line-height: 1.2; text-align: center;
  background: linear-gradient(135deg, #ff8c00, #ff4500, #ffd700, #ff6b00);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: ${goldShimmer} 2.5s linear infinite;
`
const FireBody = styled.p`
  font-size: 13.5px; color: rgba(255,200,150,.70); text-align: center; line-height: 1.55; margin: 0;
`
const FireBtn = styled.button`
  width: 100%; padding: 13px 16px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #ff4500, #ff8c00, #ff4500);
  background-size: 200% auto; animation: ${fireGradient} 2s ease infinite;
  color: #fff; font-size: 14px; font-weight: 900; font-family: inherit; letter-spacing: .04em;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(255,80,0,.65), 0 2px 6px rgba(0,0,0,.50);
  transition: transform .15s;
  &:hover { transform: translateY(-1px); }
  &:active { transform: scale(.98); }
`
const FireClose = styled(CloseBtn)`
  background: rgba(255,80,0,.12); border-color: rgba(255,140,0,.40); color: #ff8c00;
  &:hover { background: rgba(255,80,0,.22); }
`

function FireDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <FireWrap>
      {src
        ? <PopupImg src={src} alt="" style={{ borderRadius: '16px 16px 0 0' }} />
        : <FireTop>🔥 🔥 🔥</FireTop>
      }
      <FireInner>
        <FireTitle>{popup.title}</FireTitle>
        {popup.body && <FireBody>{popup.body}</FireBody>}
        {popup.ctaLabel && (
          <FireBtn type="button" onClick={onCta}>
            🔥 {popup.ctaLabel}
          </FireBtn>
        )}
      </FireInner>
      <FireClose type="button" onClick={onDismiss}>✕</FireClose>
    </FireWrap>
  )
}

/* ════════════════════════════════════
   DESIGN 4 — DIAMOND (Premium)
════════════════════════════════════ */
const DiamondWrap = styled.div`
  position: relative;
  width: 100%; max-width: 380px;
  border-radius: 20px;
  background: linear-gradient(160deg, #06041a 0%, #0d0830 50%, #060420 100%);
  border: 2px solid transparent;
  background-clip: padding-box;
  animation: ${slideUp} .32s cubic-bezier(.16,1,.3,1) both, ${diamondPulse} 3s ease-in-out infinite;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute; inset: -2px;
    border-radius: 22px; z-index: -1;
    background: linear-gradient(135deg, #8b5cf6, #3b82f6, #a78bfa, #60a5fa, #8b5cf6);
    background-size: 300% 300%;
    animation: ${goldShimmer} 5s linear infinite;
  }
`
const DiamondSparkleRow = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 14px 16px 0;
  font-size: 22px;
  & span {
    display: inline-block;
    animation: ${diamondSpin} 8s linear infinite;
    filter: drop-shadow(0 0 8px rgba(139,92,246,.80));
  }
`
const DiamondInner = styled.div`
  padding: 10px 22px 22px;
  display: flex; flex-direction: column; gap: 12px;
`
const DiamondTitle = styled.h2`
  font-size: 19px; font-weight: 900; margin: 0; line-height: 1.2; text-align: center;
  background: linear-gradient(135deg, #a78bfa, #60a5fa, #e879f9, #a78bfa);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: ${goldShimmer} 3.5s linear infinite;
`
const DiamondBody = styled.p`
  font-size: 13.5px; color: rgba(167,139,250,.65); text-align: center; line-height: 1.55; margin: 0;
`
const DiamondBtn = styled.button`
  width: 100%; padding: 13px 16px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #7c3aed, #1d4ed8, #7c3aed);
  background-size: 200% auto; animation: ${goldShimmer} 3s linear infinite;
  color: #fff; font-size: 14px; font-weight: 800; font-family: inherit;
  cursor: pointer; letter-spacing: .04em;
  box-shadow: 0 4px 20px rgba(124,58,237,.65), 0 2px 6px rgba(0,0,0,.50);
  transition: transform .15s;
  &:hover { transform: translateY(-1px); }
  &:active { transform: scale(.98); }
`
const DiamondClose = styled(CloseBtn)`
  background: rgba(139,92,246,.12); border-color: rgba(139,92,246,.40); color: #a78bfa;
  &:hover { background: rgba(139,92,246,.22); }
`

function DiamondDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <DiamondWrap>
      {src && <PopupImg src={src} alt="" style={{ borderRadius: '18px 18px 0 0' }} />}
      {!src && (
        <DiamondSparkleRow>
          <span>💎</span>
          <span style={{ animationDirection: 'reverse' }}>✨</span>
          <span>💎</span>
        </DiamondSparkleRow>
      )}
      <DiamondInner>
        <DiamondTitle>{popup.title}</DiamondTitle>
        {popup.body && <DiamondBody>{popup.body}</DiamondBody>}
        {popup.ctaLabel && (
          <DiamondBtn type="button" onClick={onCta}>
            💎 {popup.ctaLabel}
          </DiamondBtn>
        )}
      </DiamondInner>
      <DiamondClose type="button" onClick={onDismiss}>✕</DiamondClose>
    </DiamondWrap>
  )
}

/* ─────────────────────────────────────────────────────────
   Design registry
───────────────────────────────────────────────────────── */
const DESIGNS = { gold: GoldDesign, neon: NeonDesign, fire: FireDesign, diamond: DiamondDesign }

/* ─────────────────────────────────────────────────────────
   Main CasinoPopup component
───────────────────────────────────────────────────────── */
const DISMISSED_KEY = 'dismissed_popups'

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') } catch { return [] }
}
function addDismissed(id) {
  const list = getDismissed()
  if (!list.includes(id)) {
    const trimmed = [...list, id].slice(-50)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed))
  }
}

export default function CasinoPopup({ popups = [], onCtaClick }) {
  const [visiblePopup, setVisiblePopup] = useState(null)

  useEffect(() => {
    if (!popups.length) { setVisiblePopup(null); return }
    const dismissed = getDismissed()
    const next = popups.find(p => !dismissed.includes(p.id))
    setVisiblePopup(next || null)
  }, [popups])

  const handleDismiss = () => {
    if (visiblePopup) {
      addDismissed(visiblePopup.id)
      const dismissed = getDismissed()
      const next = popups.find(p => !dismissed.includes(p.id))
      setVisiblePopup(next || null)
    }
  }

  const handleCta = () => {
    if (onCtaClick && visiblePopup) onCtaClick(visiblePopup)
    handleDismiss()
  }

  if (!visiblePopup) return null

  const Design = DESIGNS[visiblePopup.design] || GoldDesign

  return createPortal(
    <Overlay onClick={e => e.target === e.currentTarget && handleDismiss()}>
      <Design popup={visiblePopup} onDismiss={handleDismiss} onCta={handleCta} />
    </Overlay>,
    document.body
  )
}

/* ─────────────────────────────────────────────────────────
   Export design meta for admin picker
───────────────────────────────────────────────────────── */
export const DESIGN_OPTIONS = [
  { value: 'gold',    label: '✨ Gold',    accent: '#f5c842', bg: '#0c0b1e', desc: 'Lujo VIP' },
  { value: 'neon',    label: '⚡ Neon',    accent: '#00f5ff', bg: '#000508', desc: 'Casino Eléctrico' },
  { value: 'fire',    label: '🔥 Fire',    accent: '#ff4500', bg: '#0a0302', desc: 'Oferta Urgente' },
  { value: 'diamond', label: '💎 Diamond', accent: '#8b5cf6', bg: '#06041a', desc: 'Premium Exclusivo' },
]
