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
const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`
const goldPulse = keyframes`
  0%,100% { box-shadow: 0 0 24px rgba(255,215,0,.3), 0 0 50px rgba(255,215,0,.1); }
  50%     { box-shadow: 0 0 40px rgba(255,215,0,.6), 0 0 80px rgba(255,215,0,.2); }
`
const neonFlicker = keyframes`
  0%,19%,21%,23%,25%,54%,56%,100% { box-shadow: 0 0 5px #0ff, 0 0 15px #0ff, 0 0 30px rgba(0,255,255,.5); }
  20%,24%,55%                     { box-shadow: none; }
`
const neonTextGlow = keyframes`
  0%,100% { text-shadow: 0 0 5px #0ff, 0 0 15px rgba(0,255,255,.8); }
  50%     { text-shadow: 0 0 10px #0ff, 0 0 25px rgba(0,255,255,1); }
`
const firePulse = keyframes`
  0%   { box-shadow: 0 0 30px rgba(255,69,0,.4), 0 0 60px rgba(255,69,0,.2); }
  50%  { box-shadow: 0 0 50px rgba(255,140,0,.7), 0 0 100px rgba(255,69,0,.4); }
  100% { box-shadow: 0 0 30px rgba(255,69,0,.4), 0 0 60px rgba(255,69,0,.2); }
`
const diamondPulse = keyframes`
  0%,100% { box-shadow: 0 0 30px rgba(139,92,246,.4), 0 0 70px rgba(139,92,246,.2); }
  50%     { box-shadow: 0 0 50px rgba(167,139,250,.7), 0 0 100px rgba(167,139,250,.4); }
`
const darkGlow = keyframes`
  0%,100% { box-shadow: 0 0 20px rgba(255,255,255,.05); }
  50%     { box-shadow: 0 0 40px rgba(255,255,255,.12); }
`
const sweep = keyframes`
  0%   { left: -100%; }
  100% { left: 100%; }
`

/* ─────────────────────────────────────────────────────────
   Common Components
───────────────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background: rgba(0,0,0,.8);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} .25s ease both;
`

export const CloseBtn = styled.button`
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; line-height: 1;
  cursor: pointer; transition: all .2s;
  border: 1px solid transparent; padding: 0; flex-shrink: 0;
  z-index: 10;
`

export const PopupImg = styled.img`
  width: 100%; display: block;
  max-height: 150px; object-fit: cover;
`

export const PopupContainer = styled.div`
  width: 100%; max-width: 360px;
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both;
  box-sizing: border-box;
`

/* ════════════════════════════════════
   1. DESIGN: ROYAL GOLD (VIP)
════════════════════════════════════ */
const GoldWrap = styled(PopupContainer)`
  background: linear-gradient(160deg, #141108 0%, #0a0804 100%);
  border: 1px solid rgba(255,215,0,0.3);
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both, ${goldPulse} 3s ease-in-out infinite;
  
  &::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, transparent, #FFD700, #FFF8DC, #FFD700, transparent);
    background-size: 200% auto; animation: ${shimmer} 3s linear infinite;
  }
`
const GoldInner = styled.div`
  padding: 24px 22px; display: flex; flex-direction: column; gap: 12px; position: relative;
`
const GoldTitle = styled.h2`
  font-size: 20px; font-weight: 900; text-align: center; margin: 0;
  background: linear-gradient(135deg, #FFD700, #FFF8DC, #FFD700, #DAA520);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  animation: ${shimmer} 4s linear infinite; line-height: 1.25;
`
const GoldBody = styled.p`
  font-size: 14px; color: rgba(255,248,220,.8); text-align: center; line-height: 1.5; margin: 0;
`
const GoldBtn = styled.button`
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #DAA520, #FFD700, #DAA520);
  background-size: 200% auto; animation: ${shimmer} 3s linear infinite;
  color: #1a1100; font-size: 15px; font-weight: 900; font-family: inherit;
  cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(218,165,32,.5); transition: all .2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(218,165,32,.7); }
  &:active { transform: scale(.98); }
`
const GoldClose = styled(CloseBtn)`
  background: rgba(255,215,0,.1); border-color: rgba(255,215,0,.2); color: #FFD700;
  &:hover { background: rgba(255,215,0,.2); color: #FFF; }
`

export function GoldDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <GoldWrap>
      {src && <PopupImg src={src} alt="" />}
      <GoldInner>
        <div style={{ textAlign: 'center', fontSize: 20, marginBottom: -6 }}>👑</div>
        <GoldTitle>{popup.title}</GoldTitle>
        {popup.body && <GoldBody>{popup.body}</GoldBody>}
        {popup.ctaLabel && <GoldBtn type="button" onClick={onCta}>{popup.ctaLabel}</GoldBtn>}
      </GoldInner>
      <GoldClose type="button" onClick={onDismiss}>✕</GoldClose>
    </GoldWrap>
  )
}

/* ════════════════════════════════════
   2. DESIGN: CYBER NEON
════════════════════════════════════ */
const NeonWrap = styled(PopupContainer)`
  background: #020205; border: 1.5px solid #0ff;
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both, ${neonFlicker} 6s step-start infinite;
  box-shadow: 0 0 20px rgba(0,255,255,.2);
`
const NeonHeader = styled.div`
  background: linear-gradient(90deg, rgba(0,255,255,.1), transparent);
  padding: 10px 16px; display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid rgba(0,255,255,.3);
  font-size: 11px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: #0ff;
`
const NeonInner = styled.div`
  padding: 22px; display: flex; flex-direction: column; gap: 14px;
`
const NeonTitle = styled.h2`
  font-size: 20px; font-weight: 900; margin: 0; line-height: 1.2;
  color: #0ff; animation: ${neonTextGlow} 2s ease-in-out infinite;
`
const NeonBody = styled.p`
  font-size: 14px; color: rgba(255,255,255,.7); line-height: 1.5; margin: 0;
`
const NeonBtn = styled.button`
  width: 100%; padding: 14px; border-radius: 8px;
  background: rgba(0,255,255,.05); border: 1.5px solid #0ff;
  color: #0ff; font-size: 15px; font-weight: 800; font-family: inherit;
  cursor: pointer; letter-spacing: 1px; text-transform: uppercase;
  box-shadow: inset 0 0 10px rgba(0,255,255,.2), 0 0 10px rgba(0,255,255,.2);
  transition: all .2s;
  &:hover { background: rgba(0,255,255,.15); box-shadow: inset 0 0 15px rgba(0,255,255,.4), 0 0 20px rgba(0,255,255,.4); text-shadow: 0 0 8px #0ff; }
`
const NeonClose = styled(CloseBtn)`
  background: transparent; color: #0ff;
  &:hover { background: rgba(0,255,255,.1); }
`

export function NeonDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <NeonWrap>
      <NeonHeader><div style={{ width: 6, height: 6, background: '#0ff', borderRadius: '50%', boxShadow: '0 0 8px #0ff' }}/> JACKPOT LIVE</NeonHeader>
      {src && <PopupImg src={src} alt="" />}
      <NeonInner>
        <NeonTitle>{popup.title}</NeonTitle>
        {popup.body && <NeonBody>{popup.body}</NeonBody>}
        {popup.ctaLabel && <NeonBtn type="button" onClick={onCta}>{popup.ctaLabel}</NeonBtn>}
      </NeonInner>
      <NeonClose type="button" onClick={onDismiss}>✕</NeonClose>
    </NeonWrap>
  )
}

/* ════════════════════════════════════
   3. DESIGN: INFERNO (HOT STREAK)
════════════════════════════════════ */
const FireWrap = styled(PopupContainer)`
  background: #120300;
  border: 1px solid #ff4500;
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both, ${firePulse} 2s ease-in-out infinite;
  &::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at bottom, rgba(255,69,0,0.2) 0%, transparent 70%);
  }
`
const FireInner = styled.div`
  padding: 24px 22px; display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1;
`
const FireTitle = styled.h2`
  font-size: 22px; font-weight: 900; margin: 0; line-height: 1.2; text-align: center;
  background: linear-gradient(135deg, #FF4500, #FF8C00, #FFD700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
`
const FireBody = styled.p`
  font-size: 14px; color: rgba(255,200,150,.8); text-align: center; line-height: 1.5; margin: 0;
`
const FireBtn = styled.button`
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #FF4500, #FF8C00);
  color: #fff; font-size: 15px; font-weight: 900; font-family: inherit; letter-spacing: 0.5px;
  cursor: pointer; text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(255,69,0,.5); transition: transform .2s, box-shadow .2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,69,0,.7); }
`
const FireClose = styled(CloseBtn)`
  background: rgba(255,69,0,.15); color: #FF8C00;
  &:hover { background: rgba(255,69,0,.3); color: #FFF; }
`

export function FireDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <FireWrap>
      {src && <PopupImg src={src} alt="" />}
      <FireInner>
        {!src && <div style={{ textAlign: 'center', fontSize: 26, marginBottom: -4 }}>🔥</div>}
        <FireTitle>{popup.title}</FireTitle>
        {popup.body && <FireBody>{popup.body}</FireBody>}
        {popup.ctaLabel && <FireBtn type="button" onClick={onCta}>{popup.ctaLabel}</FireBtn>}
      </FireInner>
      <FireClose type="button" onClick={onDismiss}>✕</FireClose>
    </FireWrap>
  )
}

/* ════════════════════════════════════
   4. DESIGN: DIAMOND PREMIUM
════════════════════════════════════ */
const DiamondWrap = styled(PopupContainer)`
  background: linear-gradient(160deg, #100b21 0%, #080512 100%);
  border: 1px solid rgba(139,92,246,0.3);
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both, ${diamondPulse} 3s ease-in-out infinite;
  backdrop-filter: blur(10px);
`
const DiamondInner = styled.div`
  padding: 24px 22px; display: flex; flex-direction: column; gap: 12px; position: relative;
`
const DiamondTitle = styled.h2`
  font-size: 20px; font-weight: 900; margin: 0; line-height: 1.25; text-align: center;
  background: linear-gradient(135deg, #a78bfa, #c084fc, #e879f9);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
`
const DiamondBody = styled.p`
  font-size: 14px; color: rgba(196,181,253,.8); text-align: center; line-height: 1.5; margin: 0;
`
const DiamondBtn = styled.button`
  position: relative; overflow: hidden;
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #7c3aed, #9333ea);
  color: #fff; font-size: 15px; font-weight: 800; font-family: inherit; letter-spacing: 0.5px;
  cursor: pointer; text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(124,58,237,.4); transition: transform .2s;
  &::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: skewX(-20deg);
  }
  &:hover { transform: translateY(-2px); }
  &:hover::after { animation: ${sweep} .8s ease-in-out; }
`
const DiamondClose = styled(CloseBtn)`
  background: rgba(139,92,246,.15); color: #c084fc;
  &:hover { background: rgba(139,92,246,.3); color: #FFF; }
`

export function DiamondDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <DiamondWrap>
      {src && <PopupImg src={src} alt="" />}
      <DiamondInner>
        {!src && <div style={{ textAlign: 'center', fontSize: 24, marginBottom: -4 }}>💎</div>}
        <DiamondTitle>{popup.title}</DiamondTitle>
        {popup.body && <DiamondBody>{popup.body}</DiamondBody>}
        {popup.ctaLabel && <DiamondBtn type="button" onClick={onCta}>{popup.ctaLabel}</DiamondBtn>}
      </DiamondInner>
      <DiamondClose type="button" onClick={onDismiss}>✕</DiamondClose>
    </DiamondWrap>
  )
}

/* ════════════════════════════════════
   5. DESIGN: DARK ELEGANCE
════════════════════════════════════ */
const DarkWrap = styled(PopupContainer)`
  background: #09090b;
  border: 1px solid rgba(255,255,255,0.1);
  animation: ${slideUp} .4s cubic-bezier(0.16, 1, 0.3, 1) both, ${darkGlow} 4s ease-in-out infinite;
`
const DarkInner = styled.div`
  padding: 24px 22px; display: flex; flex-direction: column; gap: 14px; position: relative;
`
const DarkTitle = styled.h2`
  font-size: 21px; font-weight: 700; margin: 0; line-height: 1.25; text-align: center; color: #fff;
  letter-spacing: -0.5px;
`
const DarkBody = styled.p`
  font-size: 14px; color: rgba(255,255,255,.6); text-align: center; line-height: 1.55; margin: 0;
`
const DarkBtn = styled.button`
  width: 100%; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05); color: #fff;
  font-size: 14px; font-weight: 600; font-family: inherit; letter-spacing: 0.5px;
  cursor: pointer; transition: all .2s;
  &:hover { background: #fff; color: #000; }
`
const DarkClose = styled(CloseBtn)`
  background: rgba(255,255,255,.05); color: #aaa;
  &:hover { background: rgba(255,255,255,.15); color: #fff; }
`

export function DarkDesign({ popup, onDismiss, onCta }) {
  const src = popup.img ? resolveApiAsset(popup.img) : ''
  return (
    <DarkWrap>
      {src && <PopupImg src={src} alt="" />}
      <DarkInner>
        <DarkTitle>{popup.title}</DarkTitle>
        {popup.body && <DarkBody>{popup.body}</DarkBody>}
        {popup.ctaLabel && <DarkBtn type="button" onClick={onCta}>{popup.ctaLabel}</DarkBtn>}
      </DarkInner>
      <DarkClose type="button" onClick={onDismiss}>✕</DarkClose>
    </DarkWrap>
  )
}

/* ─────────────────────────────────────────────────────────
   Design Registry & Options
───────────────────────────────────────────────────────── */
export const DESIGNS = {
  gold: GoldDesign,
  neon: NeonDesign,
  fire: FireDesign,
  diamond: DiamondDesign,
  dark: DarkDesign
}

export const DESIGN_OPTIONS = [
  { value: 'gold', label: '✨ Royal Gold', bg: 'linear-gradient(135deg, #FFD700, #DAA520)', accent: '#FFD700', desc: 'Lujo dorado VIP' },
  { value: 'neon', label: '⚡ Cyber Neon', bg: 'linear-gradient(135deg, #0ff, #0055ff)', accent: '#0ff', desc: 'Llamativo y vibrante' },
  { value: 'fire', label: '🔥 Inferno', bg: 'linear-gradient(135deg, #FF4500, #FF8C00)', accent: '#FF4500', desc: 'Alerta ardiente' },
  { value: 'diamond', label: '💎 Diamond', bg: 'linear-gradient(135deg, #9333ea, #c084fc)', accent: '#c084fc', desc: 'Cristal premium' },
  { value: 'dark', label: '🌙 Elegance', bg: '#1a1a1a', accent: '#ffffff', desc: 'Oscuro y exclusivo' }
]

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

  const Design = DESIGNS[visiblePopup.design] || DESIGNS.gold

  return createPortal(
    <Overlay onClick={e => e.target === e.currentTarget && handleDismiss()}>
      <Design popup={visiblePopup} onDismiss={handleDismiss} onCta={handleCta} />
    </Overlay>,
    document.body
  )
}
