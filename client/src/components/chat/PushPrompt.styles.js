import styled, { keyframes } from 'styled-components'

/* ── animations ─────────────────────────────────────────────────── */
const slideDown = keyframes`
  from { transform: translateY(-110%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
`

const slideUp = keyframes`
  from { transform: translateY(0);     opacity: 1; }
  to   { transform: translateY(-110%); opacity: 0; }
`

const backdropIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const cardIn = keyframes`
  from { transform: scale(0.9) translateY(20px); opacity: 0; }
  to   { transform: scale(1)   translateY(0);    opacity: 1; }
`

const bellRing = keyframes`
  0%,100% { transform: rotate(0deg); }
  12%     { transform: rotate(18deg); }
  28%     { transform: rotate(-15deg); }
  44%     { transform: rotate(10deg); }
  58%     { transform: rotate(-6deg); }
  72%     { transform: rotate(3deg); }
`

const ripplePulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(99,102,241,.5); }
  70%  { box-shadow: 0 0 0 18px rgba(99,102,241,0); }
  100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
`

const successPop = keyframes`
  0%   { transform: scale(0.6); opacity: 0; }
  65%  { transform: scale(1.18); }
  100% { transform: scale(1);   opacity: 1; }
`

/* ── banner (top, slides down) ───────────────────────────────────── */
export const Banner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: linear-gradient(135deg, #1e1b4b 0%, #1a2a4a 60%, #172554 100%);
  border-bottom: 1px solid rgba(99,102,241,.30);
  box-shadow: 0 4px 20px rgba(0,0,0,.50);
  animation: ${({ $hiding }) => $hiding ? slideUp : slideDown} 0.42s cubic-bezier(0.16,1,0.3,1) both;
  user-select: none;
  pointer-events: all;

  /* desktop: compact pill centered at top */
  @media (min-width: 600px) {
    top: 12px;
    left: 0;
    right: 0;
    width: fit-content;
    min-width: 360px;
    max-width: 480px;
    margin: 0 auto;
    border-radius: 14px;
    border: 1px solid rgba(99,102,241,.32);
    box-shadow: 0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(99,102,241,.08);
    padding: 10px 14px;
  }
`

export const BannerBell = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(99,102,241,.20);
  border: 1px solid rgba(99,102,241,.38);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #a5b4fc;
  animation: ${bellRing} 2.6s ease-in-out 1s both;
`

export const BannerText = styled.div`
  flex: 1;
  min-width: 0;
`

export const BannerTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #e0e7ff;
  line-height: 1.25;
`

export const BannerSub = styled.div`
  font-size: 11px;
  color: rgba(165,180,252,.65);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const BannerActivate = styled.button`
  flex-shrink: 0;
  padding: 7px 14px;
  border-radius: 20px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(99,102,241,.45);
  transition: opacity .15s, transform .12s;
  -webkit-tap-highlight-color: transparent;
  &:hover  { opacity: .88; }
  &:active { transform: scale(.95); }
`

export const BannerDismiss = styled.button`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,.07);
  color: rgba(255,255,255,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .15s, color .15s;
  -webkit-tap-highlight-color: transparent;
  &:hover  { background: rgba(255,255,255,.13); color: rgba(255,255,255,.7); }
  &:active { background: rgba(255,255,255,.18); }
`

/* ── modal overlay ───────────────────────────────────────────────── */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,.68);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 env(safe-area-inset-bottom, 12px);
  animation: ${backdropIn} .22s ease both;

  @media (min-width: 480px) {
    align-items: center;
    padding: 20px;
  }
`

export const Card = styled.div`
  background: #13131f;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px 24px 0 0;
  width: 100%;
  padding: 28px 22px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -12px 60px rgba(0,0,0,.6);
  animation: ${cardIn} .32s cubic-bezier(0.16,1,0.3,1) both;
  position: relative;

  @media (min-width: 480px) {
    max-width: 370px;
    border-radius: 24px;
    box-shadow: 0 24px 80px rgba(0,0,0,.7);
  }
`

export const DragHandle = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,.12);
  margin-bottom: 20px;

  @media (min-width: 480px) { display: none; }
`

export const CloseBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .15s, color .15s;
  -webkit-tap-highlight-color: transparent;
  &:hover  { background: rgba(255,255,255,.11); color: rgba(255,255,255,.65); }
  &:active { background: rgba(255,255,255,.16); }
`

export const BellWrap = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(79,70,229,.26));
  border: 1.5px solid rgba(99,102,241,.32);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  color: #a5b4fc;
  animation: ${ripplePulse} 2s ease-out .6s infinite, ${bellRing} 1.4s ease-in-out .3s both;
`

export const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 6px;
  text-align: center;
  letter-spacing: -0.3px;
`

export const ModalSub = styled.p`
  font-size: 13px;
  color: rgba(255,255,255,.44);
  margin: 0 0 20px;
  text-align: center;
  line-height: 1.55;
  max-width: 280px;
`

export const BenefitsList = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 22px;
`

export const BenefitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px;
  padding: 10px 11px;
`

export const BenefitEmoji = styled.span`
  font-size: 17px;
  line-height: 1;
  flex-shrink: 0;
`

export const BenefitText = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,.70);
  font-weight: 500;
  line-height: 1.3;
`

export const ActivateBtn = styled.button`
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 22px rgba(99,102,241,.42);
  transition: transform .14s, box-shadow .14s, opacity .14s;
  margin-bottom: 10px;
  -webkit-tap-highlight-color: transparent;
  &:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,.52); }
  &:active:not(:disabled) { transform: scale(.97); }
  &:disabled { opacity: .5; cursor: default; }
`

export const SkipBtn = styled.button`
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,.28);
  font-size: 13px;
  cursor: pointer;
  transition: color .15s;
  -webkit-tap-highlight-color: transparent;
  &:hover { color: rgba(255,255,255,.5); }
`

export const Note = styled.p`
  font-size: 10.5px;
  color: rgba(255,255,255,.18);
  margin: 7px 0 0;
  text-align: center;
`

export const SuccessWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0 8px;
  animation: ${successPop} .38s cubic-bezier(0.16,1,0.3,1) both;
`

export const SuccessEmoji = styled.div`
  font-size: 54px;
  line-height: 1;
`

export const SuccessText = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: #4ade80;
  text-align: center;
`

export const SuccessSub = styled.div`
  font-size: 12.5px;
  color: rgba(255,255,255,.36);
  text-align: center;
  max-width: 240px;
  line-height: 1.5;
`
