import styled, { keyframes, css } from 'styled-components'
import { colors, gradients, shadows } from '../../styles/theme'

const MOBILE = '@media (max-width: 768px)'

/* ── window entry animations ── */

const slideUpDesktop = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`
const slideUpMobile = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0);    }
`

export const Window = styled.div`
  position: fixed;
  bottom: 5rem;
  right: 1.5rem;
  width: 360px;
  height: 620px;
  border-radius: 24px;
  z-index: 999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #000000;
  border: 1px solid rgba(40, 140, 255, 0.16);
  box-shadow: ${shadows.glassCard};
  animation: ${slideUpDesktop} 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;

  ${MOBILE} {
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    z-index: 1001;
    animation: ${slideUpMobile} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
`

/* ── visual top section (login / register) ── */

export const VisualSection = styled.div`
  position: relative;
  flex-shrink: 0;
  height: 190px;
  background:
    radial-gradient(ellipse at 50% 130%, rgba(30, 133, 255, 0.22) 0%, transparent 65%),
    #000000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;

  ${MOBILE} { height: 32vh; }
`

export const CloseBtn = styled.button`
  position: absolute;
  top: 14px;
  left: 14px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  transition: background 0.2s;
  svg { font-size: 17px; }
  &:hover { background: rgba(255, 255, 255, 0.13); }
`

export const VisualLogo = styled.div`
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: ${gradients.btn};
  border: 1px solid rgba(40, 140, 255, 0.30);
  box-shadow: 0 0 36px rgba(30, 133, 255, 0.30), ${shadows.glassBubble};
  display: flex;
  align-items: center;
  justify-content: center;
  svg { color: #ffffff; font-size: 1.9rem; }
`

export const AppLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
`

/* ── form card (login / register) ── */

export const FormSection = styled.div`
  flex: 1;
  min-height: 0;
  background: #0b0b18;
  display: flex;
  flex-direction: column;

  ${({ $isChat }) => $isChat ? css`
    overflow: hidden;
    border-radius: 0;
    padding: 0;
    gap: 0;
  ` : css`
    overflow-y: auto;
    border-radius: 28px 28px 0 0;
    padding: 32px 24px 34px;
    gap: 18px;
    form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    &::-webkit-scrollbar { width: 6px; }
    ${MOBILE} {
      border-radius: 32px 32px 0 0;
      padding: 36px 26px 40px;
    }
  `}
`

export const FormTitle = styled.h2`
  font-size: 21px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.02em;
`

export const FormHint = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: -6px;
`

export const ErrorBanner = styled.div`
  width: 100%;
  padding: 11px 13px;
  border-radius: 12px;
  background: rgba(255, 69, 58, 0.14);
  border: 1px solid rgba(255, 109, 100, 0.34);
  color: rgba(255, 228, 226, 0.96);
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 10px 30px rgba(255, 69, 58, 0.10);
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const InputLabel = styled.label`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.40);
  text-transform: uppercase;
`

export const StyledInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #ffffff;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus {
    border-color: ${colors.primaryLight};
    box-shadow: 0 0 0 3px rgba(30, 133, 255, 0.14);
  }
`

export const PasswordWrapper = styled.div`
  position: relative;
`

export const PasswordInput = styled(StyledInput)`
  padding-right: 44px;
`

export const PasswordToggle = styled.button`
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.30);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  transition: color 0.2s;
  svg { font-size: 18px; }
  &:hover { color: rgba(255, 255, 255, 0.60); }
`

export const ForgotLink = styled.a`
  align-self: flex-end;
  font-size: 12px;
  color: ${colors.primaryLight};
  text-decoration: none;
  cursor: pointer;
  margin-top: -4px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.70; }
`

export const ActionBtn = styled.button`
  width: 100%;
  min-height: 50px;
  border-radius: 50px;
  background: ${gradients.btn};
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.2s, transform 0.15s;
  &:hover { opacity: 0.88; }
  &:active { transform: scale(0.98); opacity: 0.80; }
`

export const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.25);
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
`

export const SocialRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

export const SocialBtn = styled.button`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  img { width: 20px; height: 20px; }
  &:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.18);
  }
`

export const SwitchText = styled.p`
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.30);
  a {
    color: ${colors.primaryLight};
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    &:hover { opacity: 0.75; }
  }
`

/* ══════════════════════════════════════
   chat view
══════════════════════════════════════ */

export const ChatViewContainer = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
`

/* ── chat header ── */

export const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  flex-shrink: 0;
  background: #0b0b18;
`

export const ChatHeaderSide = styled.div`
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: ${({ $right }) => $right ? 'flex-end' : 'flex-start'};
`

export const ChatHeaderCenter = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
`

export const ChatHeaderAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
`

export const ChatHeaderName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
`

export const HeaderPill = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  background: ${gradients.btn};
  border-radius: 20px;
  padding: 6px 10px 6px 10px;
  border: 1px solid rgba(40, 140, 255, 0.30);
  box-shadow: 0 0 18px rgba(30, 133, 255, 0.22);
`

export const HeaderPillText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
`

export const HeaderPillBadge = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 2px 7px;
  letter-spacing: 0.04em;
`

export const ConnectionBanner = styled.div`
  width: min(230px, 100%);
  min-height: 22px;
  display: ${({ $visible }) => $visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => $tone === 'ok' ? 'rgba(34, 197, 94, 0.28)' : $tone === 'warn' ? 'rgba(245, 158, 11, 0.30)' : 'rgba(248, 113, 113, 0.30)'};
  background: ${({ $tone }) => $tone === 'ok' ? 'rgba(34, 197, 94, 0.12)' : $tone === 'warn' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(248, 113, 113, 0.12)'};
  color: ${({ $tone }) => $tone === 'ok' ? '#86efac' : $tone === 'warn' ? '#facc15' : '#fecaca'};
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
`

export const ChatHeaderBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.45);
  transition: color 0.2s;
  svg { font-size: 18px; }
  &:hover { color: rgba(255, 255, 255, 0.85); }
`

/* ── messages area ── */

export const MessagesArea = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;

  &::before, &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 52px;
    pointer-events: none;
    z-index: 2;
  }

  &::before {
    top: 0;
    background: linear-gradient(to bottom, #0b0b18 0%, transparent 100%);
  }

  &::after {
    bottom: 0;
    background: linear-gradient(to top, #0b0b18 0%, transparent 100%);
  }
`

const msgIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`

export const ChatMessages = styled.div`
  height: 100%;
  overflow-y: auto;
  padding: 14px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(20, 70, 220, 0.13) 0%, transparent 68%),
    #0b0b18;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.10);
    border-radius: 2px;
  }
`

export const MessageRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 7px;
  animation: ${msgIn} 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
  ${({ $received }) => !$received && 'justify-content: flex-end;'}
`

export const LoadEarlierBtn = styled.button`
  align-self: center;
  min-height: 32px;
  padding: 7px 13px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;

  &:hover:not(:disabled) {
    background: rgba(30, 133, 255, 0.13);
    border-color: rgba(30, 133, 255, 0.24);
    color: ${colors.primaryLighter};
  }

  &:disabled {
    opacity: 0.48;
    cursor: default;
  }
`

export const MessageAvatar = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(30, 133, 255, 0.20);
  border: 1px solid rgba(30, 133, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: ${colors.primaryLighter};
  flex-shrink: 0;
`

export const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: ${({ $wide }) => $wide ? '74%' : 'auto'};
  max-width: 74%;
  align-items: ${({ $received }) => $received ? 'flex-start' : 'flex-end'};
`

export const MessageBubble = styled.div`
  padding: 9px 13px;
  font-size: 13.5px;
  line-height: 1.45;
  word-break: break-word;

  ${({ $received }) => $received ? css`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px 16px 16px 16px;
    color: rgba(255, 255, 255, 0.88);
  ` : css`
    background: ${gradients.btn};
    border-radius: 16px 4px 16px 16px;
    color: #ffffff;
  `}
`

export const MessageTime = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.26);
  padding: 0 3px;
`

export const TypingBubble = styled.div`
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 11px;
  margin-left: 33px;
  border-radius: 4px 16px 16px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
`

export const TypingText = styled.span`
  margin-left: 4px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
`

export const TypingDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(96, 165, 250, 0.88);
  animation: typingPulse 1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => `${$delay}ms`};

  @keyframes typingPulse {
    0%, 100% { transform: translateY(0); opacity: 0.35; }
    50% { transform: translateY(-3px); opacity: 1; }
  }
`

export const BotButtonsWrap = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const BotOptionBtn = styled.button`
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.30)' : 'rgba(30, 133, 255, 0.28)'};
  background: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.08)' : 'rgba(30, 133, 255, 0.10)'};
  color: ${({ $isBack }) => $isBack ? '#f8b84e' : colors.primaryLighter};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.14s;

  &:hover {
    background: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.14)' : 'rgba(30, 133, 255, 0.17)'};
    border-color: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.45)' : 'rgba(30, 133, 255, 0.42)'};
  }

  &:active { transform: scale(0.98); }

  &:disabled {
    opacity: 0.48;
    cursor: wait;
    pointer-events: none;
    transform: none;
  }
`

/* ── scroll-to-bottom button ── */

const scrollBtnIn = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.85); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1);    }
`

export const ScrollDownBtn = styled.button`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  animation: ${scrollBtnIn} 0.2s ease both;

  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 12px 5px 8px;
  border-radius: 20px;
  background: rgba(30, 133, 255, 0.18);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(30, 133, 255, 0.30);
  color: ${colors.primaryLighter};
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;

  svg { font-size: 17px; }
  &:hover { background: rgba(30, 133, 255, 0.26); }
`

/* ── bottom area (attach panel + footer) ── */

export const BottomArea = styled.div`
  position: relative;
  flex-shrink: 0;
`

const panelIn = keyframes`
  from { transform: translateY(100%); opacity: 0.4; }
  to   { transform: translateY(0);    opacity: 1;   }
`

export const AttachPanel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 200px;
  background: rgba(8, 8, 20, 0.82);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px 20px 0 0;
  padding: 16px 14px 12px;
  animation: ${panelIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  z-index: 10;
`

export const AttachGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  height: 100%;
  align-content: start;
`

export const AttachOption = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 80px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  font-size: 11px;
  font-family: inherit;
  letter-spacing: 0.03em;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  svg { font-size: 22px; }

  &:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.90);
  }
`

/* ── chat footer ── */

export const ChatFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 13px;
  background: #0b0b18;
`

export const PlusBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.25s;
  transform: ${({ $isActive }) => $isActive ? 'rotate(45deg)' : 'rotate(0deg)'};

  background: ${({ $isActive }) =>
    $isActive ? 'rgba(30, 133, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${({ $isActive }) =>
    $isActive ? 'rgba(30, 133, 255, 0.35)' : 'rgba(255, 255, 255, 0.09)'};
  color: ${({ $isActive }) =>
    $isActive ? colors.primaryLight : 'rgba(255, 255, 255, 0.50)'};

  svg { font-size: 19px; }
  &:hover { background: rgba(255, 255, 255, 0.10); }
`

export const ChatInput = styled.input`
  flex: 1;
  height: 36px;
  padding: 0 13px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  color: #ffffff;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.22); }
  &:focus { border-color: ${colors.primaryLight}; }
`

export const SendBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, background 0.2s;

  background: ${gradients.btn};
  svg { color: #ffffff; font-size: 16px; }

  &:hover:not(:disabled) { opacity: 0.85; }
  &:active:not(:disabled) { transform: scale(0.93); }

  &:disabled {
    background: rgba(255, 255, 255, 0.07);
    cursor: default;
    opacity: 0.45;
  }
`

/* legacy – keeps old imports compiling */
export const ChatEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.22);
`

/* ══════════════════════════════════════
   media preview (before send)
══════════════════════════════════════ */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

export const PreviewOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(4, 4, 14, 0.95);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 28px 24px;
  animation: ${fadeIn} 0.22s ease both;
`

export const PreviewTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  letter-spacing: 0.01em;
  text-align: center;
`

export const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 290px;
  object-fit: contain;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 12px 52px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(30,133,255,0.08);
`

export const PreviewPdfCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 36px 44px;
  background: rgba(30, 133, 255, 0.07);
  border: 1px solid rgba(30, 133, 255, 0.22);
  border-radius: 22px;
  box-shadow: 0 0 40px rgba(30,133,255,0.08);
  svg { font-size: 3.2rem; color: ${colors.primaryLighter}; }
  span {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.72);
    text-align: center;
    word-break: break-all;
    max-width: 220px;
  }
`

export const PreviewActions = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 280px;
`

export const PreviewBtn = styled.button`
  flex: 1;
  height: 46px;
  border-radius: 23px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  ${({ $primary }) => $primary ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.62);
  `}

  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

/* ── sending animation bubble ── */

export const SendingBubbleWrap = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px 4px 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
`

export const PendingMediaWrap = styled.div`
  width: 210px;
  padding: 12px;
  border-radius: 16px 4px 16px 16px;
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.24);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.20);
`

export const PendingMediaTitle = styled.div`
  color: rgba(255, 255, 255, 0.90);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
`

export const PendingMediaHint = styled.div`
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
  line-height: 1.35;
`

export const PendingMediaActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 10px;
`

export const PendingMediaBtn = styled.button`
  min-height: 30px;
  border-radius: 10px;
  border: 1px solid ${({ $danger }) => $danger ? 'rgba(248, 113, 113, 0.28)' : 'rgba(96, 165, 250, 0.30)'};
  background: ${({ $danger }) => $danger ? 'rgba(248, 113, 113, 0.10)' : 'rgba(30, 133, 255, 0.16)'};
  color: ${({ $danger }) => $danger ? '#fecaca' : colors.primaryLighter};
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  transition: opacity 0.18s, transform 0.14s, border-color 0.18s;

  &:hover {
    opacity: 0.88;
    border-color: ${({ $danger }) => $danger ? 'rgba(248, 113, 113, 0.44)' : 'rgba(96, 165, 250, 0.48)'};
  }

  &:active { transform: scale(0.97); }
`

export const AuthLoadingScreen = styled.div`
  flex: 1;
  min-height: 0;
  background:
    radial-gradient(ellipse at 50% 34%, rgba(20, 70, 220, 0.16) 0%, transparent 68%),
    #0b0b18;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

/* ── media messages (image / pdf in chat) ── */

export const MediaMsgImg = styled.img`
  max-width: 200px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: opacity 0.2s, transform 0.2s;
  &:hover { opacity: 0.88; transform: scale(1.02); }
`

export const MediaMsgPdf = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  cursor: pointer;
  max-width: 210px;
  transition: background 0.2s;

  svg { font-size: 1.6rem; color: ${colors.primaryLighter}; flex-shrink: 0; }
  span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 130px;
  }
  &:hover { background: rgba(255, 255, 255, 0.11); }
`

/* ══════════════════════════════════════
   media viewer (lightbox)
══════════════════════════════════════ */

export const ViewerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.90);
  backdrop-filter: blur(22px) saturate(130%);
  -webkit-backdrop-filter: blur(22px) saturate(130%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${fadeIn} 0.22s ease both;
`

export const ViewerContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 90vw;
  max-height: 90vh;
`

export const ViewerFileName = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.04em;
  text-align: center;
  word-break: break-all;
  max-width: 320px;
`

export const ViewerImg = styled.img`
  max-width: 90vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.80), 0 0 0 1px rgba(255, 255, 255, 0.06);
`

export const ViewerEmbed = styled.iframe`
  width: min(500px, 88vw);
  height: min(620px, 68vh);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.02);
`

export const ViewerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const ViewerBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;

  ${({ $download }) => $download ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
    box-shadow: 0 4px 18px rgba(13, 79, 232, 0.42);
  ` : css`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.68);
  `}

  svg { font-size: 17px; }
  &:hover { opacity: 0.80; }
`
