import styled, { css, keyframes } from 'styled-components'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: translateY(0); }
`
const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`
const slideRight = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
`
const bubbleIn = keyframes`
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
`

/* ──────────────────────────────────
   LIST VIEW
────────────────────────────────── */
export const TicketsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
`

export const TicketsTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`

export const TicketsCount = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
`

export const NewTicketBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.18s;
  white-space: nowrap;
  flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.97); }
`

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export const FilterTab = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.30)' : 'rgba(255,255,255,0.07)'};
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.10)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.36)'};
  font-size: 12px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s;
  white-space: nowrap;
  &:hover:not([disabled]) {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.65);
    border-color: rgba(255,255,255,0.12);
  }
`

export const FilterCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: currentColor;
  color: inherit;
  opacity: 0.18;
  ${FilterTab}:hover & { opacity: 0.28; }
`

/* individual ticket card */
export const TicketRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 15px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.022);
  cursor: pointer;
  transition: all 0.16s;
  animation: ${fadeUp} 0.24s ease both;
  animation-delay: ${({ $i }) => Math.min($i * 30, 150)}ms;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: ${({ $priority }) =>
      $priority === 'high'   ? '#ef4444' :
      $priority === 'medium' ? '#f59e0b' :
      'rgba(255,255,255,0.12)'};
    border-radius: 0 3px 3px 0;
    opacity: 0.7;
  }

  &:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.10);
    transform: translateY(-1px);
    box-shadow: 0 4px 18px rgba(0,0,0,0.20);
  }

  & + & { margin-top: 6px; }
`

export const TkIconWrap = styled.div`
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  background: ${({ $status }) =>
    $status === 'open'        ? 'rgba(30,133,255,0.12)'  :
    $status === 'in_progress' ? 'rgba(245,158,11,0.12)'  :
    $status === 'resolved'    ? 'rgba(16,185,129,0.12)'  :
    'rgba(100,116,139,0.10)'};
  color: ${({ $status }) =>
    $status === 'open'        ? '#3b9eff' :
    $status === 'in_progress' ? '#f59e0b' :
    $status === 'resolved'    ? '#10b981' :
    '#64748b'};
`

export const TkBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const TkTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`

export const TkNumber = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.04em;
  flex-shrink: 0;
`

export const TkStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;

  ${({ $status }) => {
    if ($status === 'open')        return css`background: rgba(30,133,255,0.12); color: #3b9eff; border: 1px solid rgba(30,133,255,0.22);`
    if ($status === 'in_progress') return css`background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.22);`
    if ($status === 'resolved')    return css`background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.22);`
    return css`background: rgba(100,116,139,0.10); color: #64748b; border: 1px solid rgba(100,116,139,0.18);`
  }}

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
`

export const TkTitle = styled.p`
  font-size: 13.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.86);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 5px;
  line-height: 1.3;
`

export const TkMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const TkMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: rgba(255,255,255,0.26);
  svg { font-size: 12px; }
  white-space: nowrap;
`

export const TkPriorityDot = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $priority }) =>
    $priority === 'high'   ? '#ef4444' :
    $priority === 'medium' ? '#f59e0b' :
    'rgba(255,255,255,0.28)'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
`

export const TkChevron = styled.div`
  display: flex;
  align-items: center;
  color: rgba(255,255,255,0.15);
  flex-shrink: 0;
  margin-top: 10px;
  transition: color 0.15s;
  ${TicketRow}:hover & { color: rgba(255,255,255,0.35); }
`

export const TicketsEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
  color: rgba(255,255,255,0.16);
  animation: ${fadeUp} 0.24s ease;
`

export const EmptyGlyph = styled.div`
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 4px;
`

export const EmptyTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.25);
`

export const EmptySub = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.14);
  max-width: 280px;
  line-height: 1.5;
`

/* ──────────────────────────────────
   DETAIL VIEW
────────────────────────────────── */
export const DetailWrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: ${slideRight} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
`

export const DetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s;
  flex-shrink: 0;
  svg { font-size: 14px; }
  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.80); }
`

export const DetailTitleBlock = styled.div`
  flex: 1;
  min-width: 0;
`

export const DetailNumber = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 3px;
`

export const DetailTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
`

export const DetailStatusSelect = styled.select`
  height: 32px;
  padding: 0 28px 0 10px;
  border-radius: 8px;
  appearance: none;
  -webkit-appearance: none;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: all 0.16s;
  flex-shrink: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath fill='rgba(255,255,255,0.40)' d='M4.5 5L0 0h9z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;

  ${({ $status }) => {
    if ($status === 'open')        return css`background-color: rgba(30,133,255,0.12); border: 1px solid rgba(30,133,255,0.28); color: #3b9eff;`
    if ($status === 'in_progress') return css`background-color: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.28); color: #f59e0b;`
    if ($status === 'resolved')    return css`background-color: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.28); color: #10b981;`
    return css`background-color: rgba(100,116,139,0.10); border: 1px solid rgba(100,116,139,0.22); color: #64748b;`
  }}
  option { background: #0d0d20; color: #fff; }
`

export const DetailMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.22s ease 0.05s both;
`

export const MetaChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  svg { font-size: 14px; }

  strong {
    color: rgba(255,255,255,0.65);
    font-weight: 500;
  }
`

export const MetaDivider = styled.div`
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.07);
  flex-shrink: 0;
`

/* thread */
export const ThreadWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  background: rgba(0,0,0,0.15);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 200px;
  max-height: 340px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
`

export const MessageBubble = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 78%;
  animation: ${bubbleIn} 0.22s ease-out;

  ${({ $isStaff }) => $isStaff ? css`
    align-self: flex-start;
  ` : css`
    align-self: flex-end;
    align-items: flex-end;
  `}
`

export const MsgHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  ${({ $isStaff }) => !$isStaff && css`flex-direction: row-reverse;`}
`

export const MsgSenderAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  flex-shrink: 0;

  ${({ $isStaff }) => $isStaff ? css`
    background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
    color: #fff;
  ` : css`
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.60);
  `}
`

export const MsgSender = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.38);
`

export const MsgTime = styled.span`
  font-size: 10.5px;
  color: rgba(255,255,255,0.20);
`

export const MsgBody = styled.div`
  padding: 9px 13px;
  border-radius: ${({ $isStaff }) => $isStaff ? '3px 13px 13px 13px' : '13px 3px 13px 13px'};
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;

  ${({ $isStaff }) => $isStaff ? css`
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.80);
  ` : css`
    background: rgba(30,133,255,0.15);
    border: 1px solid rgba(30,133,255,0.25);
    color: rgba(255,255,255,0.90);
  `}
`

export const MsgAttachments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`

export const MsgThumb = styled.div`
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  position: relative;
  cursor: zoom-in;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const MsgThumbLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 60px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 10px;
  color: rgba(255,255,255,0.30);
  gap: 4px;
  svg { font-size: 14px; }
`

export const StatusEvent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: center;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
`

/* reply area */
export const ReplyBar = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  overflow: hidden;
  animation: ${fadeUp} 0.24s ease 0.1s both;
`

export const AttachPreviewBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 14px 0;
  flex-wrap: wrap;
`

export const AttachThumb = styled.div`
  position: relative;
  width: 56px;
  height: 44px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const AttachRemoveBtn = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.65);
  color: rgba(255,255,255,0.80);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  padding: 0;
  &:hover { background: rgba(239,68,68,0.70); }
`

export const ReplyTextarea = styled.textarea`
  width: 100%;
  padding: 13px 16px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  min-height: 72px;
  max-height: 160px;
  color: rgba(255,255,255,0.85);
  font-size: 13.5px;
  font-family: inherit;
  line-height: 1.55;
  box-sizing: border-box;
  &::placeholder { color: rgba(255,255,255,0.18); }
`

export const ReplyFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
`

export const ReplyLeftActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

export const ReplyIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.28);
  cursor: pointer;
  transition: all 0.15s;
  svg { font-size: 18px; }
  &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65); }
`

export const ReplySendBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.18s, transform 0.14s;
  svg { font-size: 16px; }
  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.96); }
  &:disabled { opacity: 0.30; cursor: not-allowed; }
`

/* ──────────────────────────────────
   CREATE TICKET MODAL
────────────────────────────────── */
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0,0,0,0.74);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

export const ModalCard = styled.div`
  background: #0d0e1e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05);
  animation: ${scaleIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
`

export const ModalHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 0;
  flex-shrink: 0;
  gap: 12px;
`

export const ModalTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 3px;
`

export const ModalSub = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  margin: 0;
`

export const ModalCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.75); }
`

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
`

export const ModalField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const ModalFieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`

export const ModalLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
`

export const ModalInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 13px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.18s, background 0.18s;
  box-sizing: border-box;
  &::placeholder { color: rgba(255,255,255,0.18); }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.04); }
`

export const ModalTextarea = styled.textarea`
  width: 100%;
  padding: 11px 13px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 90px;
  line-height: 1.55;
  transition: border-color 0.18s, background 0.18s;
  box-sizing: border-box;
  &::placeholder { color: rgba(255,255,255,0.18); }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.04); }
`

export const ModalSelect = styled.select`
  width: 100%;
  height: 40px;
  padding: 0 32px 0 13px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.18s;
  box-sizing: border-box;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  &:focus { border-color: rgba(30,133,255,0.45); }
  option { background: #0d0d20; color: #fff; }
`

export const AttachZone = styled.div`
  border: 1.5px dashed rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
  background: rgba(255,255,255,0.02);

  &:hover {
    border-color: rgba(30,133,255,0.35);
    background: rgba(30,133,255,0.04);
  }
`

export const AttachZoneIcon = styled.div`
  font-size: 22px;
  color: rgba(255,255,255,0.20);
  margin-bottom: 2px;
  svg { font-size: 24px; }
`

export const AttachZoneText = styled.p`
  font-size: 12.5px;
  color: rgba(255,255,255,0.30);
  margin: 0;
`

export const AttachZoneSub = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.16);
  margin: 0;
`

export const AttachPreviewList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`

export const ModalFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
`

export const ModalCancelBtn = styled.button`
  height: 36px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.16s;
  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); }
`

export const ModalSubmitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.18s;
  svg { font-size: 15px; }
  &:hover { opacity: 0.86; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

/* ──────────────────────────────────
   IMAGE LIGHTBOX
────────────────────────────────── */
export const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: zoom-out;
  animation: ${fadeUp} 0.18s ease;
`

export const LightboxImg = styled.img`
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.60);
  object-fit: contain;
  animation: ${scaleIn} 0.2s ease;
`

export const LightboxClose = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.70);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  svg { font-size: 18px; }
  &:hover { background: rgba(255,255,255,0.18); color: #fff; }
`
