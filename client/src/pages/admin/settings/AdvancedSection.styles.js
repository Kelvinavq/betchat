import styled, { css, keyframes } from 'styled-components'

const spin = keyframes`to { transform: rotate(360deg); }`
const fadeIn = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); }`

/* ── shared card shell (matches SettingsPage Card) ── */
export const Card = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  overflow: hidden;
`

export const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`

export const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(245,158,11,0.12);
  svg { font-size: 20px; color: #f59e0b; }
`

export const CardHeadText = styled.div`min-width: 0;`

export const CardTitle = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
`

export const CardSub = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.36);
  margin-top: 3px;
  line-height: 1.5;
`

/* ── sub-sections inside the card ── */
export const SubSection = styled.div`
  padding: 20px 22px;
  ${({ $bordered }) => $bordered && css`
    border-top: 1px solid rgba(255,255,255,0.05);
  `}
`

export const SubTitle = styled.p`
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  margin-bottom: 4px;
`

export const SubDesc = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.36);
  line-height: 1.55;
  margin-bottom: 16px;
`

/* ── schedule config row ── */
export const ScheduleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

export const IntervalWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const IntervalLabel = styled.span`
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  white-space: nowrap;
`

export const IntervalInput = styled.input`
  width: 72px;
  height: 36px;
  padding: 0 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 9px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-align: center;
  outline: none;
  transition: border-color 0.18s;
  &:focus { border-color: rgba(245,158,11,0.50); }
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; }
`

/* ── last/next run info ── */
export const RunInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
`

export const RunPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  font-size: 11.5px;
  color: rgba(255,255,255,0.45);
  svg { font-size: 14px; color: rgba(255,255,255,0.28); }

  ${({ $accent }) => $accent && css`
    background: rgba(245,158,11,0.08);
    border-color: rgba(245,158,11,0.18);
    color: rgba(245,158,11,0.80);
    svg { color: rgba(245,158,11,0.55); }
  `}
`

/* ── date range row ── */
export const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`

export const DateLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.40);
  white-space: nowrap;
`

export const DateInput = styled.input`
  height: 36px;
  padding: 0 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 9px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.18s;
  color-scheme: dark;
  &:focus { border-color: rgba(245,158,11,0.50); }
`

/* ── action row (button + result) ── */
export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

export const RunBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  height: 36px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 650;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, opacity 0.18s, transform 0.10s;

  ${({ $danger }) => $danger ? css`
    background: rgba(239,68,68,0.14);
    color: #ef4444;
    border: 1px solid rgba(239,68,68,0.24);
    &:hover:not(:disabled) { background: rgba(239,68,68,0.22); }
  ` : css`
    background: rgba(245,158,11,0.14);
    color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.24);
    &:hover:not(:disabled) { background: rgba(245,158,11,0.22); }
  `}

  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:active:not(:disabled) { transform: scale(0.97); }

  svg { font-size: 16px; }
`

export const SaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  height: 36px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 650;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s, opacity 0.18s;
  background: ${({ $saved }) => $saved ? 'rgba(34,197,94,0.14)' : 'rgba(30,133,255,0.14)'};
  color: ${({ $saved }) => $saved ? '#86efac' : '#60a5fa'};
  border: 1px solid ${({ $saved }) => $saved ? 'rgba(34,197,94,0.24)' : 'rgba(30,133,255,0.24)'};
  &:hover:not(:disabled) {
    background: ${({ $saved }) => $saved ? 'rgba(34,197,94,0.22)' : 'rgba(30,133,255,0.22)'};
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  svg { font-size: 16px; }
`

export const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.7s linear infinite;
`

export const ResultBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  animation: ${fadeIn} 0.22s ease;

  ${({ $success }) => $success ? css`
    background: rgba(34,197,94,0.10);
    border: 1px solid rgba(34,197,94,0.20);
    color: #86efac;
    svg { font-size: 14px; color: #4ade80; }
  ` : css`
    background: rgba(239,68,68,0.10);
    border: 1px solid rgba(239,68,68,0.20);
    color: #fca5a5;
    svg { font-size: 14px; color: #f87171; }
  `}
`
