import styled, { keyframes, css } from 'styled-components'
import { shadows } from '../../styles/theme'

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
  background: var(--bc-client-body-bg, #000000);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.22);
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
    radial-gradient(ellipse at 50% 130%, rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.22) 0%, transparent 65%),
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
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.30);
  box-shadow: 0 0 36px rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.30), ${shadows.glassBubble};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  svg { color: #ffffff; font-size: 1.9rem; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
  background: var(--bc-client-body-bg, #0b0b18);
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
    border-color: var(--bc-client-accent, #1e85ff);
    box-shadow: 0 0 0 3px rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.14);
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
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: var(--bc-client-accent, #1e85ff);
  text-decoration: none;
  cursor: pointer;
  margin-top: -4px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.70; }
  &[href="#"] { display: none; }
`

export const HelpOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0,0,0,0.58);
  backdrop-filter: blur(10px);
`

export const HelpCard = styled.div`
  width: min(360px, 100%);
  border-radius: 18px;
  background: rgba(13, 13, 28, 0.96);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 24px 80px rgba(0,0,0,0.45);
  padding: 18px;
`

export const HelpHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

export const HelpTitle = styled.p`
  font-size: 15px;
  font-weight: 800;
  color: #fff;
`

export const HelpSub = styled.p`
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(255,255,255,0.42);
`

export const HelpClose = styled.button`
  width: 30px;
  height: 30px;
  min-width: 30px;
  border: 0;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  svg { font-size: 17px; }
`

export const HelpOptionGrid = styled.div`
  display: grid;
  gap: 8px;
`

export const HelpOption = styled.button`
  width: 100%;
  border: 1px solid ${({ $active }) => $active ? 'rgba(var(--bc-client-accent-rgb, 70,170,255),0.45)' : 'rgba(255,255,255,0.08)'};
  border-radius: 13px;
  padding: 12px 13px;
  background: ${({ $active }) => $active ? 'rgba(var(--bc-client-accent-rgb, 70,170,255),0.14)' : 'rgba(255,255,255,0.04)'};
  color: rgba(255,255,255,0.82);
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

export const HelpTextarea = styled.textarea`
  width: 100%;
  min-height: 92px;
  resize: vertical;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px;
  padding: 12px;
  margin-top: 10px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-family: inherit;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.24); }
`

export const HelpActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
`

export const HelpBtn = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 10px 15px;
  background: ${({ $primary }) => $primary ? 'var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%))' : 'rgba(255,255,255,0.08)'};
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  &:disabled { opacity: 0.45; cursor: default; }
`

export const ActionBtn = styled.button`
  width: 100%;
  min-height: 50px;
  border-radius: 50px;
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
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
    color: var(--bc-client-accent, #1e85ff);
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
  background: var(--bc-client-header-bg, #0b0b18);
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
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
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
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
  border-radius: 20px;
  padding: 6px 10px 6px 10px;
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.30);
  box-shadow: 0 0 18px rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.22);
`

export const HeaderPillText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--bc-client-header-color, #ffffff);
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
    background: linear-gradient(to bottom, var(--bc-client-body-bg, #0b0b18) 0%, transparent 100%);
  }

  &::after {
    bottom: 0;
    background: linear-gradient(to top, var(--bc-client-body-bg, #0b0b18) 0%, transparent 100%);
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
    radial-gradient(ellipse at 50% 30%, rgba(var(--bc-client-accent-rgb, 20, 70, 220), 0.13) 0%, transparent 68%),
    var(--bc-client-body-bg, #0b0b18);

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
  transform: translateX(${({ $swipeOffset }) => `${$swipeOffset || 0}px`});
  touch-action: pan-y;
  transition: ${({ $swipeOffset }) => $swipeOffset ? 'none' : 'transform 0.18s ease'};
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
    background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.13);
    border-color: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.24);
    color: var(--bc-client-accent, #46aaff);
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
  background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.20);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--bc-client-accent, #46aaff);
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: ${({ $wide }) => $wide ? '74%' : 'auto'};
  max-width: 74%;
  align-items: ${({ $received }) => $received ? 'flex-start' : 'flex-end'};
`

export const MessageActionMenu = styled.div`
  position: fixed;
  left: ${({ $x }) => `${$x}px`};
  top: ${({ $y }) => `${$y}px`};
  min-width: 148px;
  padding: 6px;
  background: rgba(8, 8, 20, 0.98);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.22);
  border-radius: 12px;
  box-shadow: 0 14px 42px rgba(0, 0, 0, 0.58);
  z-index: 2200;
`

export const MessageActionItem = styled.button`
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: none;
  color: rgba(255,255,255,0.76);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  svg { font-size: 16px; color: var(--bc-client-accent, #46aaff); }
  &:hover { background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.13); color: #ffffff; }
`

export const ReplyQuote = styled.div`
  width: 100%;
  max-width: 246px;
  padding: 7px 9px 7px 10px;
  margin-bottom: 6px;
  border-radius: 10px;
  border-left: 3px solid ${({ $received }) => $received ? 'var(--bc-client-accent, #46aaff)' : 'rgba(255,255,255,0.74)'};
  background: ${({ $received }) => $received ? 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.12)' : 'rgba(255,255,255,0.16)'};
  color: rgba(255,255,255,0.78);
  overflow: hidden;
`

export const ReplyAuthor = styled.div`
  font-size: 10px;
  font-weight: 800;
  color: ${({ $received }) => $received ? 'var(--bc-client-accent, #46aaff)' : 'rgba(255,255,255,0.86)'};
  margin-bottom: 2px;
`

export const ReplyText = styled.div`
  font-size: 11.5px;
  line-height: 1.25;
  color: rgba(255,255,255,0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const MessageBubble = styled.div`
  padding: 9px 13px;
  font-size: 13.5px;
  line-height: 1.45;
  word-break: break-word;

  p, div { margin: 0 0 5px; }
  p:last-child, div:last-child { margin-bottom: 0; }
  ul, ol { margin: 4px 0 4px 18px; padding: 0; }

  ${({ $received }) => $received ? css`
    background: var(--bc-client-recv-bubble, rgba(255, 255, 255, 0.08));
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px 16px 16px 16px;
    color: var(--bc-client-recv-text, rgba(255, 255, 255, 0.88));
  ` : css`
    background: var(--bc-client-sent-bubble, #1e40af);
    border-radius: 16px 4px 16px 16px;
    color: var(--bc-client-sent-text, #ffffff);
  `}
`

export const MessageTime = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.26);
  padding: 0 3px;
`

export const VoiceBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  min-width: 230px;
  max-width: 320px;

  ${({ $received }) => $received ? css`
    background: var(--bc-client-recv-bubble, rgba(255, 255, 255, 0.08));
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px 16px 16px 16px;
  ` : css`
    background: var(--bc-client-sent-bubble, #1e40af);
    border-radius: 16px 4px 16px 16px;
  `}
`

export const VoicePlayBtn = styled.button`
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.18s, transform 0.15s;

  ${({ $received }) => $received ? css`
    background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.22);
    color: #ffffff;
  `}

  svg { font-size: 19px; }
  &:hover { opacity: 0.80; }
  &:active { transform: scale(0.92); }
`

export const VoiceWave = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 3px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ $received }) => $received ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)'};
`

export const VoiceProgress = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  width: ${({ $progress = 0 }) => `${Math.max(0, Math.min(1, $progress)) * 100}%`};
  min-width: ${({ $progress = 0 }) => $progress > 0 ? '8px' : '0'};
  border-radius: inherit;
  background: ${({ $received }) => $received ? 'rgba(70,170,255,0.45)' : 'rgba(255,255,255,0.42)'};
  box-shadow: ${({ $received }) => $received ? '0 0 14px rgba(70,170,255,0.22)' : '0 0 14px rgba(255,255,255,0.18)'};
  transition: width 0.08s linear;
  pointer-events: none;
`

export const VoiceBar = styled.div`
  position: relative;
  z-index: 1;
  width: 3px;
  height: ${({ $h }) => Math.max(3, Math.round($h * 24))}px;
  border-radius: 1.5px;
  transition: background 0.10s;
  ${({ $active, $received }) => $active
    ? ($received ? 'background: var(--bc-client-accent, #46aaff);' : 'background: rgba(255,255,255,0.92);')
    : ($received ? 'background: rgba(255,255,255,0.15);' : 'background: rgba(255,255,255,0.26);')
  }
`

export const VoiceSeek = styled.input`
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  appearance: none;
  background: transparent;

  &:disabled {
    cursor: default;
  }

  &::-webkit-slider-runnable-track {
    height: 100%;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    margin-top: 9px;
    border-radius: 50%;
    background: ${({ $received }) => $received ? 'var(--bc-client-accent, #46aaff)' : '#ffffff'};
    box-shadow: 0 0 0 3px ${({ $received }) => $received ? 'rgba(70,170,255,0.18)' : 'rgba(255,255,255,0.18)'};
    opacity: ${({ $progress = 0 }) => $progress > 0 ? 1 : 0};
  }

  &::-moz-range-track {
    height: 100%;
    background: transparent;
  }

  &::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border: 0;
    border-radius: 50%;
    background: ${({ $received }) => $received ? 'var(--bc-client-accent, #46aaff)' : '#ffffff'};
    box-shadow: 0 0 0 3px ${({ $received }) => $received ? 'rgba(70,170,255,0.18)' : 'rgba(255,255,255,0.18)'};
    opacity: ${({ $progress = 0 }) => $progress > 0 ? 1 : 0};
  }
`

export const VoiceSpeedBtn = styled.button`
  height: 24px;
  min-width: 34px;
  padding: 0 7px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  background: ${({ $received }) => $received ? 'rgba(70,170,255,0.28)' : 'rgba(255,255,255,0.18)'};
  transition: opacity 0.16s, transform 0.14s;

  &:hover { opacity: 0.84; }
  &:active { transform: scale(0.94); }
`

export const VoiceTime = styled.span`
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  color: ${({ $received }) => $received ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.72)'};
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
  border: 1px solid ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.30)' : 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.28)'};
  background: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.08)' : 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.10)'};
  color: ${({ $isBack }) => $isBack ? '#f8b84e' : 'var(--bc-client-accent, #46aaff)'};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.14s;

  &:hover {
    background: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.14)' : 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.17)'};
    border-color: ${({ $isBack }) => $isBack ? 'rgba(245, 158, 11, 0.45)' : 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.42)'};
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
  background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.18);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.30);
  color: var(--bc-client-accent, #46aaff);
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;

  svg { font-size: 17px; }
  &:hover { background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.26); }
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
  background: var(--bc-client-body-bg, #0b0b18);
`

export const ReplyComposer = styled.div`
  margin: 8px 12px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 12px;
  border-radius: 14px;
  background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.10);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.18);
  border-left: 3px solid var(--bc-client-accent, #46aaff);
`

export const ReplyComposerText = styled.div`
  flex: 1;
  min-width: 0;
`

export const ReplyComposerTitle = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: var(--bc-client-accent, #46aaff);
`

export const ReplyComposerBody = styled.div`
  margin-top: 1px;
  font-size: 12px;
  color: rgba(255,255,255,0.58);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ReplyComposerClose = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg { font-size: 15px; }
  &:hover { background: rgba(255,255,255,0.10); color: #ffffff; }
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
    $isActive ? 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.18)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${({ $isActive }) =>
    $isActive ? 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.35)' : 'rgba(255, 255, 255, 0.09)'};
  color: ${({ $isActive }) =>
    $isActive ? 'var(--bc-client-accent, #1e85ff)' : 'rgba(255, 255, 255, 0.50)'};

  svg { font-size: 19px; }
  &:hover { background: rgba(255, 255, 255, 0.10); }
`

export const ChatInput = styled.input`
  flex: 1;
  height: 36px;
  padding: 0 13px;
  background: var(--bc-client-input-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  color: #ffffff;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.22); }
  &:focus { border-color: var(--bc-client-accent, #1e85ff); }
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

  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
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
  background: rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.07);
  border: 1px solid rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.22);
  border-radius: 22px;
  box-shadow: 0 0 40px rgba(30,133,255,0.08);
  svg { font-size: 3.2rem; color: var(--bc-client-accent, #46aaff); }
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
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
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
  background: ${({ $danger }) => $danger ? 'rgba(248, 113, 113, 0.10)' : 'rgba(var(--bc-client-accent-rgb, 30, 133, 255), 0.16)'};
  color: ${({ $danger }) => $danger ? '#fecaca' : 'var(--bc-client-accent, #46aaff)'};
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

  svg { font-size: 1.6rem; color: var(--bc-client-accent, #46aaff); flex-shrink: 0; }
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
    background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
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
