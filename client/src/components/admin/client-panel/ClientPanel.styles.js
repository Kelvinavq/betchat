import styled, { css, keyframes } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`
const pulse = keyframes`0%,100% { opacity: 1; } 50% { opacity: 0.4; }`

export const Wrap = styled.div`
  width: ${({ $width, $fullWidth }) => $fullWidth ? '100%' : $width ? `${$width}px` : '320px'};
  min-width: ${({ $width, $fullWidth }) => $fullWidth ? 0 : $width ? `${$width}px` : '320px'};
  height: var(--app-height, 100dvh);
  background: #0a0a16;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  animation: ${fadeIn} 0.22s ease both;
  container-type: inline-size;
`

/* ── panel header (avatar + username + close) ── */
export const PanelHeader = styled.div`
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  position: relative;
`

export const CloseBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 16px; }
  &:hover { color: rgba(255,255,255,0.80); background: rgba(255,255,255,0.06); }
`

export const PanelAvatar = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  border: 2px solid rgba(40, 140, 255, 0.35);
  box-shadow: 0 0 24px rgba(30, 133, 255, 0.20);
`

export const PanelOnlineDot = styled.span`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.20)'};
  border: 2px solid #0a0a16;
`

export const PanelUsername = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
`

export const PanelStatus = styled.span`
  font-size: 12px;
  color: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.30)'};
`

/* ── tabs ── */
export const TabBar = styled.div`
  display: flex;
  padding: 8px 8px 0;
  gap: 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

export const Tab = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border: none;
  background: none;
  border-radius: 8px 8px 0 0;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, background 0.2s;
  border-bottom: 2px solid ${({ $active }) => $active ? colors.primaryLight : 'transparent'};
  color: ${({ $active }) => $active ? '#ffffff' : 'rgba(255,255,255,0.38)'};
  letter-spacing: 0.02em;
  svg { font-size: 14px; flex-shrink: 0; }

  /* hide label, keep icon when panel is very narrow */
  span.tab-label {
    overflow: hidden;
    max-width: 60px;
    transition: max-width 0.2s, opacity 0.2s;
  }

  @container (max-width: 260px) {
    span.tab-label { max-width: 0; opacity: 0; }
    gap: 0;
  }

  &:hover { color: rgba(255,255,255,0.72); background: rgba(255,255,255,0.04); }
`

/* ── scroll area ── */
export const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

/* ── info cards ── */
export const InfoCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
`

export const InfoCardTitle = styled.div`
  padding: 10px 14px 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.30);
`

export const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  cursor: ${({ $editable }) => $editable ? 'pointer' : 'default'};
  border-radius: 0;
  transition: background 0.15s;
  &:hover { background: ${({ $editable }) => $editable ? 'rgba(255,255,255,0.03)' : 'none'}; }
`

export const FieldLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
`

export const FieldValue = styled.span`
  font-size: 13px;
  color: ${({ $empty }) => $empty ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.82)'};
  font-style: ${({ $empty }) => $empty ? 'italic' : 'normal'};
`

export const FieldInput = styled.input`
  width: 100%;
  padding: 4px 8px;
  background: rgba(30, 133, 255, 0.08);
  border: 1px solid rgba(30, 133, 255, 0.30);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  margin-top: 2px;
  &:focus { border-color: ${colors.primaryLight}; }
`

export const FieldTextarea = styled.textarea`
  width: 100%;
  padding: 6px 8px;
  background: rgba(30, 133, 255, 0.08);
  border: 1px solid rgba(30, 133, 255, 0.30);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 92px;
  max-height: 240px;
  line-height: 1.5;
  margin-top: 2px;
  &:focus { border-color: ${colors.primaryLight}; }
`

export const EditHint = styled.span`
  font-size: 10px;
  color: ${({ $error }) => $error ? '#f87171' : 'rgba(30, 133, 255, 0.50)'};
  margin-top: 1px;
`

/* ── client tags ── */
export const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px 10px;
`

export const TagCreateRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px 72px;
  gap: 6px;
  padding: 0 14px 12px;
`

export const TagInput = styled.input`
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  color: #ffffff;
  font-size: 12px;
  font-family: inherit;
  outline: none;

  &::placeholder { color: rgba(255,255,255,0.24); }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.42); }
`

export const ColorInput = styled.input`
  width: 34px;
  height: 34px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  cursor: pointer;
`

export const TagCreateBtn = styled.button`
  height: 34px;
  border-radius: 8px;
  border: none;
  background: ${gradients.btn};
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;

  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.42; cursor: default; transform: none; }
`

export const ClientTag = styled.button`
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  border: 1px solid;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  border-color: ${({ $border }) => $border};
  opacity: ${({ $active }) => $active ? 1 : 0.35};
  &:hover { opacity: ${({ $active }) => $active ? 0.82 : 0.60}; }
`

export const AddTagBtn = styled.button`
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px dashed rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.35);
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.65); }
`

/* ── files tab ── */
export const FilterBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
`

export const FilterBtn = styled.button`
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  ${({ $active }) => $active ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.45);
  `}
  &:hover { opacity: 0.82; }
`

export const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

export const FileCard = styled.button`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(30,133,255,0.30); background: rgba(30,133,255,0.06); }
`

export const FileThumb = styled.div`
  height: 72px;
  background: ${({ $bg }) => $bg || 'rgba(30,133,255,0.10)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: rgba(255,255,255,0.50);
  font-weight: 700;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`

export const FileInfo = styled.div`
  padding: 6px 8px;
`

export const FileName = styled.p`
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const FileDate = styled.p`
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  margin-top: 1px;
`

export const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
`

export const PageBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  ${({ $active }) => $active ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.45);
  `}
  &:disabled { opacity: 0.30; cursor: default; }
  &:hover:not(:disabled):not([data-active]) { background: rgba(255,255,255,0.09); }
`

export const PageInfo = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
`

/* ── viewer (lightbox) ── */
export const ViewerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.90);
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
  ` : css`
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.68);
  `}
  svg { font-size: 17px; }
  &:hover { opacity: 0.80; }
`

/* ── balance tab ── */
export const BalanceWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${fadeIn} 0.20s ease both;
`

export const BalanceCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  overflow: hidden;
`

export const BalanceCardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 0;
`

export const BalanceCardLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
`

export const BalanceRefreshBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
  svg { font-size: 15px; transition: transform 0.3s; }
  &:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
  &:hover svg { transform: rotate(180deg); }
  ${({ $loading }) => $loading && css`svg { animation: ${spin} 0.7s linear infinite; }`}
`

export const BalanceMainRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 14px 14px;
`

export const BalanceCurrencyLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
`

export const BalanceMainAmount = styled.span`
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1;
  ${({ $skeleton }) => $skeleton && css`
    display: inline-block;
    width: 120px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255,255,255,0.07);
    animation: ${pulse} 1.4s ease infinite;
  `}
`

export const BalanceMetricsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid rgba(255,255,255,0.06);
`

export const BalanceMetric = styled.div`
  padding: 10px 14px;
  & + & { border-left: 1px solid rgba(255,255,255,0.06); }
`

export const BalanceMetricLabel = styled.p`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  margin-bottom: 3px;
`

export const BalanceMetricValue = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color }) => $color || 'rgba(255,255,255,0.72)'};
  ${({ $skeleton }) => $skeleton && css`
    width: 60px;
    height: 14px;
    border-radius: 4px;
    background: rgba(255,255,255,0.07);
    animation: ${pulse} 1.4s ease infinite;
  `}
`

export const AmountSection = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const AmountSectionLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
`

export const QuickChips = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`

export const QuickChip = styled.button`
  padding: 7px 4px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
  ${({ $active }) => $active ? css`
    background: rgba(30,133,255,0.20);
    border: 1px solid rgba(30,133,255,0.50);
    color: #93c5fd;
  ` : css`
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.55);
  `}
  &:hover { background: rgba(30,133,255,0.14); border-color: rgba(30,133,255,0.35); color: #93c5fd; }
  &:active { transform: scale(0.97); }
`

export const AmountInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
  &:focus-within { border-color: rgba(30,133,255,0.45); }
`

export const AmountSign = styled.span`
  padding: 0 10px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.30);
  flex-shrink: 0;
`

export const AmountInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px 0 0;
  background: none;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  &::placeholder { color: rgba(255,255,255,0.22); font-weight: 400; }
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button { -webkit-appearance: none; }
`

export const BalanceActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

export const BalanceCreditBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(34,197,94,0.30);
  background: rgba(34,197,94,0.10);
  color: #4ade80;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  svg { font-size: 16px; }
  &:hover:not(:disabled) { background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.45); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.38; cursor: default; }
`

export const BalanceDebitBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,0.30);
  background: rgba(239,68,68,0.10);
  color: #f87171;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  svg { font-size: 16px; }
  &:hover:not(:disabled) { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.45); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.38; cursor: default; }
`

export const BalanceMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  animation: ${fadeIn} 0.18s ease both;
  ${({ $type }) => $type === 'success' ? css`
    background: rgba(34,197,94,0.10);
    border: 1px solid rgba(34,197,94,0.22);
    color: #4ade80;
  ` : css`
    background: rgba(239,68,68,0.10);
    border: 1px solid rgba(239,68,68,0.22);
    color: #f87171;
  `}
  svg { font-size: 15px; flex-shrink: 0; }
`

export const TabSpinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.65s linear infinite;
  flex-shrink: 0;
`

/* ── profile tab ── */
export const ProfileWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${fadeIn} 0.20s ease both;
`

export const ReferralCard = styled.div`
  background: linear-gradient(135deg, rgba(30,133,255,0.12) 0%, rgba(139,92,246,0.08) 100%);
  border: 1px solid rgba(30,133,255,0.22);
  border-radius: 16px;
  padding: 14px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const ReferralCardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const ReferralCardLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
`

export const ReferralBadge = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(30,133,255,0.16);
  border: 1px solid rgba(30,133,255,0.28);
  color: #60a5fa;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const ReferralCodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const ReferralCode = styled.span`
  flex: 1;
  font-family: 'Courier New', Courier, monospace;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #ffffff;
  ${({ $skeleton }) => $skeleton && css`
    display: inline-block;
    width: 130px;
    height: 22px;
    border-radius: 6px;
    background: rgba(255,255,255,0.08);
    animation: ${pulse} 1.4s ease infinite;
  `}
`

export const CopyBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(30,133,255,0.30);
  background: rgba(30,133,255,0.10);
  color: #60a5fa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  svg { font-size: 17px; }
  &:hover { background: rgba(30,133,255,0.20); border-color: rgba(30,133,255,0.50); }
  &:active { transform: scale(0.94); }
  ${({ $copied }) => $copied && css`
    background: rgba(34,197,94,0.15);
    border-color: rgba(34,197,94,0.40);
    color: #4ade80;
  `}
`

export const ReferralHint = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  line-height: 1.4;
`

export const SessionsCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  overflow: hidden;
`

export const SessionsHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`

export const SessionsLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
`

export const SessionCountBadge = styled.span`
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.35);
  font-size: 10px;
  font-weight: 700;
`

export const SessionList = styled.div`
  display: flex;
  flex-direction: column;
`

export const SessionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`

export const SessionDeviceIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${({ $type }) =>
    $type === 'mobile' ? 'rgba(139,92,246,0.14)' :
    $type === 'tablet' ? 'rgba(245,158,11,0.12)' :
    'rgba(30,133,255,0.12)'
  };
  border: 1px solid ${({ $type }) =>
    $type === 'mobile' ? 'rgba(139,92,246,0.28)' :
    $type === 'tablet' ? 'rgba(245,158,11,0.22)' :
    'rgba(30,133,255,0.22)'
  };
  color: ${({ $type }) =>
    $type === 'mobile' ? '#a78bfa' :
    $type === 'tablet' ? '#fbbf24' :
    '#60a5fa'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { font-size: 16px; }
`

export const SessionBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const SessionPrimary = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SessionSecondary = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.32);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  flex-wrap: wrap;
`

export const SessionChip = styled.span`
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${({ $type }) =>
    $type === 'mobile' ? css`background: rgba(139,92,246,0.14); color: #a78bfa;` :
    $type === 'tablet' ? css`background: rgba(245,158,11,0.12); color: #fbbf24;` :
    css`background: rgba(30,133,255,0.14); color: #60a5fa;`
  }
`

export const SessionTime = styled.span`
  font-size: 10px;
  color: rgba(255,255,255,0.22);
  flex-shrink: 0;
  margin-left: auto;
  white-space: nowrap;
`

export const SessionEmptyState = styled.div`
  padding: 24px 14px;
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.22);
  font-style: italic;
`
