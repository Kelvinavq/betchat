import styled, { keyframes, css } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

/* ── layout ── */
export const Wrap = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-content-bg, #0d0d1a);
  display: flex;
  flex-direction: column;
  position: relative;
`

/* ── empty state ── */
export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.20);
  svg { font-size: 3rem; }
  p { font-size: 14px; }
`

/* ── header ── */
export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  background: var(--bc-admin-topbar-bg, #0d0d1a);
  position: relative;
`

export const BackBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.40);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 18px; }
  &:hover { color: rgba(255, 255, 255, 0.80); background: rgba(255, 255, 255, 0.06); }
`

export const HeaderAvatar = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
  border: 1px solid rgba(40, 140, 255, 0.30);
`

export const OnlineDot = styled.span`
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.20)'};
  border: 1.5px solid var(--bc-admin-topbar-bg, #0d0d1a);
`

export const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const HeaderName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const HeaderStatus = styled.span`
  font-size: 11px;
  color: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.30)'};
`

export const HeaderMenuWrap = styled.div`
  position: relative;
`

export const HeaderMenuBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.40);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 20px; }
  &:hover { color: rgba(255, 255, 255, 0.80); background: rgba(255, 255, 255, 0.06); }
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: rgba(12, 12, 26, 0.98);
  border: 1px solid rgba(40, 140, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.60);
  overflow: hidden;
  z-index: 50;
`

export const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  svg { font-size: 16px; color: rgba(255, 255, 255, 0.38); }
  &:hover { background: rgba(255, 255, 255, 0.06); color: #ffffff; }

  ${({ $danger }) => $danger && `
    color: rgba(239,68,68,0.82);
    svg { color: rgba(239,68,68,0.55); }
    &:hover { background: rgba(239,68,68,0.10); color: #ef4444; }
  `}
`

export const MessageActionMenu = styled.div`
  position: fixed;
  left: ${({ $x }) => `${$x}px`};
  top: ${({ $y }) => `${$y}px`};
  min-width: 148px;
  padding: 6px;
  background: rgba(12, 12, 26, 0.98);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.20);
  border-radius: 12px;
  box-shadow: 0 14px 42px rgba(0, 0, 0, 0.58);
  z-index: 120;
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

  svg { font-size: 16px; color: ${colors.primaryLighter}; }
  &:hover { background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.13); color: #ffffff; }
`

/* ── messages ── */
export const PinnedMessageBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(12, 12, 26, 0.96);
  border-bottom: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18);
`

export const PinnedMessageMain = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
`

export const PinnedMessageIcon = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${colors.primaryLighter};
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.14);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.20);

  svg { font-size: 16px; }
`

export const PinnedMessageText = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const PinnedMessageTitle = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: ${colors.primaryLighter};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PinnedMessagePreview = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.58);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PinnedMessageClose = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;

  svg { font-size: 17px; }
  &:hover { background: rgba(255, 255, 255, 0.07); color: #ffffff; }
`

export const MessagesArea = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;

  &::before, &::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 48px;
    pointer-events: none;
    z-index: 2;
  }
  &::before { top: 0; background: linear-gradient(to bottom, var(--bc-admin-content-bg, #0d0d1a) 0%, transparent 100%); }
  &::after  { bottom: 0; background: linear-gradient(to top, var(--bc-admin-content-bg, #0d0d1a) 0%, transparent 100%); }
`

const msgIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

export const MessagesList = styled.div`
  height: 100%;
  overflow-y: auto;
  padding: 16px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(var(--bc-admin-accent-rgb, 20, 70, 220), 0.10) 0%, transparent 68%),
    var(--bc-admin-content-bg, #0d0d1a);

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

export const MsgRow = styled.div`
  position: relative;
  z-index: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: ${msgIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  transform: translateX(${({ $swipeOffset }) => `${$swipeOffset || 0}px`});
  touch-action: pan-y;
  transition: ${({ $swipeOffset }) => $swipeOffset ? 'none' : 'transform 0.18s ease'};
  ${({ $sent }) => $sent && 'justify-content: flex-end;'}

  ${({ $pinnedFlash }) => $pinnedFlash && css`
    &::before {
      content: '';
      position: absolute;
      inset: -5px -8px;
      border-radius: 16px;
      background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.14);
      border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.24);
      pointer-events: none;
      z-index: -1;
    }
  `}
`

export const LoadEarlierBtn = styled.button`
  align-self: center;
  min-height: 34px;
  padding: 7px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;

  &:hover:not(:disabled) {
    background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.13);
    border-color: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.24);
    color: ${colors.primaryLighter};
  }

  &:disabled {
    opacity: 0.48;
    cursor: default;
  }
`

export const MsgAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.20);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: ${colors.primaryLighter};
  flex-shrink: 0;
`

export const MsgContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 68%;
  align-items: ${({ $sent }) => $sent ? 'flex-end' : 'flex-start'};
`

export const ReplyQuote = styled.div`
  width: 100%;
  max-width: 260px;
  padding: 7px 9px 7px 10px;
  border-radius: 10px;
  border-left: 3px solid ${({ $sent }) => $sent ? 'rgba(255,255,255,0.72)' : colors.primaryLight};
  background: ${({ $sent }) => $sent ? 'rgba(255,255,255,0.16)' : 'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.12)'};
  color: rgba(255,255,255,0.78);
  overflow: hidden;
`

export const ReplyAuthor = styled.div`
  font-size: 10px;
  font-weight: 800;
  color: ${({ $sent }) => $sent ? 'rgba(255,255,255,0.84)' : colors.primaryLighter};
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

export const MsgBubble = styled.div`
  padding: 9px 13px;
  font-size: 13.5px;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;

  p, div { margin: 0 0 5px; }
  p:last-child, div:last-child { margin-bottom: 0; }
  ul, ol { margin: 4px 0 4px 18px; padding: 0; }

  ${({ $sent }) => $sent ? css`
    background: ${gradients.btn};
    border-radius: 16px 4px 16px 16px;
    color: #ffffff;
  ` : css`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px 16px 16px 16px;
    color: rgba(255, 255, 255, 0.88);
  `}
`

export const MsgTime = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.26);
  padding: 0 3px;
`

export const FormSubmissionCard = styled.div`
  min-width: min(280px, 72vw);
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.88);
`

export const FormSubmissionTitle = styled.div`
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 8px;
`

export const FormSubmissionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 7px 0;
  border-top: 1px solid rgba(255,255,255,0.07);
`

export const FormSubmissionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.42);
`

export const FormSubmissionValue = styled.div`
  margin-top: 2px;
  font-size: 13px;
  color: #ffffff;
  white-space: pre-wrap;
`

export const FormSubmissionCopy = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.24);
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.10);
  color: ${colors.primaryLighter};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  svg { font-size: 15px; }
  &:hover { background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18); }
`

export const MsgMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 3px;
`

export const MsgStatus = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $state }) => $state === 'read' ? '#60a5fa' : $state === 'delivered' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.24)'};
`

export const TypingBubble = styled.div`
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 11px;
  margin-left: 36px;
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
  animation: adminTypingPulse 1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => `${$delay}ms`};

  @keyframes adminTypingPulse {
    0%, 100% { transform: translateY(0); opacity: 0.35; }
    50% { transform: translateY(-3px); opacity: 1; }
  }
`

const scrollBtnIn = keyframes`
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.85); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
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
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.30);
  color: ${colors.primaryLighter};
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  svg { font-size: 17px; }
  &:hover { background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.26); }
`

/* ── media messages ── */
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
  span { font-size: 12px; color: rgba(255,255,255,0.78); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
  &:hover { background: rgba(255, 255, 255, 0.11); }
`

/* ── bottom: attach panel + footer ── */
export const BottomArea = styled.div`
  position: relative;
  flex-shrink: 0;
`

const panelIn = keyframes`
  from { transform: translateY(100%); opacity: 0.4; }
  to   { transform: translateY(0); opacity: 1; }
`

export const AttachPanel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 200px;
  background: rgba(8, 8, 20, 0.90);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px 20px 0 0;
  padding: 16px 14px 12px;
  animation: ${panelIn} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
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
  &:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.90); }
`

/* ── emoji panel ── */
const emojiIn = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`

export const EmojiPanel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: rgba(8, 8, 20, 0.97);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px 20px 0 0;
  padding: 12px;
  z-index: 11;
  animation: ${emojiIn} 0.2s ease both;
`

export const EmojiCategoryBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 8px;
`

export const EmojiCategoryBtn = styled.button`
  padding: 4px 8px;
  border-radius: 8px;
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.18)' : 'none'};
  border: ${({ $active }) => $active ? '1px solid rgba(30,133,255,0.30)' : '1px solid transparent'};
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.06); }
`

export const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 34px);
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`

export const EmojiBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: none;
  border: none;
  font-size: 19px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.08); }
`

/* ── mic button (footer, no text typed) ── */
export const MicBtn = styled.button`
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.50);
  cursor: pointer; transition: all 0.22s;
  svg { font-size: 19px; }
  &:hover {
    background: rgba(239,68,68,0.10);
    border-color: rgba(239,68,68,0.24);
    color: #fca5a5;
    transform: scale(1.06);
  }
`

/* ── recording footer ── */
const recSlide = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`
const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.15; }
`
const eq = keyframes`
  0%, 100% { transform: scaleY(0.14); }
  50%       { transform: scaleY(1); }
`
const sendGlow = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.55); }
  70%  { box-shadow: 0 0 0 9px rgba(34,197,94,0);    }
  100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);    }
`

export const RecordFooter = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 13px;
  background: var(--bc-admin-content-bg, #0d0d1a);
  animation: ${recSlide} 0.26s cubic-bezier(0.16,1,0.3,1) both;
`
export const RecordCancelBtn = styled.button`
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.15s;
  svg { font-size: 17px; }
  &:hover { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.28); color: #f87171; }
`
export const RecordVisual = styled.div`
  flex: 1; display: flex; align-items: center; gap: 10px;
  height: 40px;
  background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.18);
  border-radius: 20px; padding: 0 14px; overflow: hidden;
`
export const RecordDot = styled.div`
  width: 8px; height: 8px; min-width: 8px; border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239,68,68,0.70);
  animation: ${blink} 1s ease infinite;
`
export const RecordBarsWrap = styled.div`
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 3px;
`
export const RecordBar = styled.div`
  width: 3px; height: 22px; border-radius: 1.5px;
  background: #f87171;
  transform-origin: center;
  animation: ${eq} var(--dur, 500ms) var(--del, 0ms) ease-in-out infinite;
`
export const RecordTimer = styled.span`
  font-size: 12.5px; font-weight: 700; color: #f87171;
  letter-spacing: 0.05em; font-variant-numeric: tabular-nums;
  flex-shrink: 0; min-width: 34px; text-align: right;
`
export const RecordSendBtn = styled.button`
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  animation: ${sendGlow} 1.4s ease infinite;
  svg { font-size: 20px; }
  transition: opacity 0.18s, transform 0.15s;
  &:hover { opacity: 0.85; }
  &:active { transform: scale(0.93); }
`

/* ── voice message bubble ── */
export const VoiceBubble = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; min-width: 230px; max-width: 320px;
  ${({ $sent }) => $sent ? css`
    background: ${gradients.btn};
    border-radius: 16px 4px 16px 16px;
  ` : css`
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px 16px 16px 16px;
  `}
`
export const VoicePlayBtn = styled.button`
  width: 34px; height: 34px; min-width: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: none; transition: opacity 0.18s, transform 0.15s;
  ${({ $sent }) => $sent ? css`
    background: rgba(255,255,255,0.22); color: #fff;
  ` : css`
    background: ${gradients.btn}; color: #fff;
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
  background: ${({ $sent }) => $sent ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'};
`
export const VoiceProgress = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  width: ${({ $progress = 0 }) => `${Math.max(0, Math.min(1, $progress)) * 100}%`};
  min-width: ${({ $progress = 0 }) => $progress > 0 ? '8px' : '0'};
  border-radius: inherit;
  background: ${({ $sent }) => $sent ? 'rgba(255,255,255,0.42)' : 'rgba(96,165,250,0.45)'};
  box-shadow: ${({ $sent }) => $sent ? '0 0 14px rgba(255,255,255,0.18)' : '0 0 14px rgba(96,165,250,0.22)'};
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
  ${({ $active, $sent }) => $active
    ? ($sent ? 'background: rgba(255,255,255,0.92);' : 'background: #60a5fa;')
    : ($sent ? 'background: rgba(255,255,255,0.26);' : 'background: rgba(255,255,255,0.15);')
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
    background: ${({ $sent }) => $sent ? '#ffffff' : '#60a5fa'};
    box-shadow: 0 0 0 3px ${({ $sent }) => $sent ? 'rgba(255,255,255,0.18)' : 'rgba(96,165,250,0.18)'};
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
    background: ${({ $sent }) => $sent ? '#ffffff' : '#60a5fa'};
    box-shadow: 0 0 0 3px ${({ $sent }) => $sent ? 'rgba(255,255,255,0.18)' : 'rgba(96,165,250,0.18)'};
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
  color: #fff;
  background: ${({ $sent }) => $sent ? 'rgba(255,255,255,0.18)' : 'rgba(96,165,250,0.28)'};
  transition: opacity 0.16s, transform 0.14s;

  &:hover { opacity: 0.84; }
  &:active { transform: scale(0.94); }
`
export const VoiceTime = styled.span`
  font-size: 10px; font-weight: 500; letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums; flex-shrink: 0;
  ${({ $sent }) => $sent ? 'color: rgba(255,255,255,0.72);' : 'color: rgba(255,255,255,0.36);'}
`

/* ── footer ── */
export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 13px;
  background: var(--bc-admin-content-bg, #0d0d1a);
`

export const ReplyComposer = styled.div`
  margin: 8px 14px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 12px;
  border-radius: 14px;
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.10);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18);
  border-left: 3px solid ${colors.primaryLight};
`

export const ReplyComposerText = styled.div`
  flex: 1;
  min-width: 0;
`

export const ReplyComposerTitle = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: ${colors.primaryLighter};
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

export const CommandSuggestions = styled.div`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(100% + 8px);
  z-index: 16;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(8, 8, 20, 0.98);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.22);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
`

export const CommandSuggestionBtn = styled.button`
  width: 100%;
  min-height: 54px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.34)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.14)' : 'transparent'};
  color: rgba(255,255,255,0.76);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  svg {
    width: 28px;
    height: 28px;
    padding: 6px;
    border-radius: 9px;
    color: ${colors.primaryLighter};
    background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.13);
  }

  &:hover {
    background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.14);
    border-color: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.34);
  }
`

export const CommandSuggestionMeta = styled.div`
  min-width: 0;
`

export const CommandSuggestionName = styled.div`
  font-size: 12.5px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CommandSuggestionPreview = styled.div`
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.25;
  color: rgba(255,255,255,0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CommandSuggestionTrigger = styled.span`
  max-width: 110px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: ${colors.primaryLighter};
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CommandPreview = styled.div`
  margin: 8px 14px 0;
  padding: 11px 12px;
  border-radius: 14px;
  background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.09);
  border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.20);
`

export const CommandPreviewHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
`

export const CommandPreviewKicker = styled.div`
  font-size: 10px;
  font-weight: 900;
  color: ${colors.primaryLighter};
`

export const CommandPreviewTitle = styled.div`
  margin-top: 1px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(255,255,255,0.86);
`

export const CommandPreviewBody = styled.div`
  max-height: 120px;
  overflow-y: auto;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(0,0,0,0.18);
  color: rgba(255,255,255,0.78);
  font-size: 12.5px;
  line-height: 1.45;
  word-break: break-word;

  p, div { margin: 0 0 5px; }
  p:last-child, div:last-child { margin-bottom: 0; }
  ul, ol { margin: 4px 0 4px 18px; padding: 0; }
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }
`

export const CommandPreviewClose = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg { font-size: 15px; }
  &:hover { background: rgba(255,255,255,0.10); color: #ffffff; }
`

export const FooterBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.25s;

  ${({ $active }) => $active ? css`
    background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18);
    border: 1px solid rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.35);
    color: ${colors.primaryLight};
  ` : css`
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.09);
    color: rgba(255, 255, 255, 0.50);
  `}

  ${({ $rotate }) => $rotate && css`transform: rotate(45deg);`}

  svg { font-size: 19px; }
  &:hover { background: rgba(255, 255, 255, 0.10); }
`

export const FooterInput = styled.input`
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
  &:disabled { background: rgba(255,255,255,0.07); cursor: default; opacity: 0.45; }
`

/* ── preview ── */
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`

export const PreviewOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(4, 4, 14, 0.95);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
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
`

export const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 12px 52px rgba(0,0,0,0.72);
`

export const PreviewPdfCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 36px 44px;
  background: rgba(30,133,255,0.07);
  border: 1px solid rgba(30,133,255,0.22);
  border-radius: 22px;
  svg { font-size: 3.2rem; color: ${colors.primaryLighter}; }
  span { font-size: 13px; color: rgba(255,255,255,0.72); text-align: center; word-break: break-all; max-width: 220px; }
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
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.62);
  `}
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

/* ── sending loader bubble ── */
export const SendingBubbleWrap = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px 4px 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
`

/* ── viewer (lightbox) ── */
export const ViewerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.90);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
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
  color: rgba(255,255,255,0.38);
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
  box-shadow: 0 20px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.06);
`

export const ViewerEmbed = styled.iframe`
  width: min(500px, 88vw);
  height: min(620px, 68vh);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
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
    box-shadow: 0 4px 18px rgba(13,79,232,0.42);
  ` : css`
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.68);
  `}
  svg { font-size: 17px; }
  &:hover { opacity: 0.80; }
`
