import styled, { css, keyframes } from 'styled-components'

/* ── animations ── */
export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`to { transform: rotate(360deg); }`

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
`

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  background: #0b0b18;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 28px 0;
  flex-shrink: 0;
  @media (max-width: 600px) { padding: 16px 16px 0; }
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

export const MenuBtn = styled.button`
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 20px; }
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
`

export const TitleBlock = styled.div`flex: 1; min-width: 0;`

export const PageTitle = styled.h1`
  font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.02em;
`

export const PageSub = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.32); margin-top: 2px;
`

/* ── scroll body ── */
export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @media (max-width: 600px) { padding: 12px 14px 40px; }
`

/* ── sticky top bar (tabs + mode) ── */
export const StickyTopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0b0b18;
  padding: 14px 28px 0;
  margin: 0 -28px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  @media (max-width: 600px) { padding: 10px 14px 0; margin: 0 -14px; }
`

export const TabGroup = styled.div`
  display: flex;
  gap: 2px;
`

export const TabBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px 10px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? '#3b82f6' : 'transparent'};
  background: transparent;
  color: ${({ $active }) => $active ? '#fff' : 'rgba(255,255,255,0.38)'};
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: rgba(255,255,255,0.80); }
`

export const TabCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.35)'};
`

export const TabSpacer = styled.div`
  flex: 1;
  @media (max-width: 480px) { display: none; }
`

export const ModeLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.38);
  font-weight: 600;
  white-space: nowrap;
  @media (max-width: 480px) { display: none; }
`

export const ModeBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;
  margin-bottom: 2px;
  @media (max-width: 480px) { margin-left: auto; }

  ${({ $mode }) => $mode === 'auto' ? css`
    background: linear-gradient(135deg, rgba(34,197,94,0.20) 0%, rgba(16,185,129,0.14) 100%);
    border-color: rgba(34,197,94,0.35);
    color: #4ade80;
  ` : css`
    background: linear-gradient(135deg, rgba(251,146,60,0.20) 0%, rgba(245,158,11,0.14) 100%);
    border-color: rgba(251,146,60,0.35);
    color: #fb923c;
  `}

  svg { font-size: 14px; }
  &:hover { opacity: 0.8; }
  &:active { transform: scale(0.96); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

/* ── config strip ── */
export const ConfigStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.18s ease both;
`

export const ConfigLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.03em;
  white-space: nowrap;
  svg { font-size: 15px; }
`

export const ConfigDivider = styled.span`
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.08);
  flex-shrink: 0;
`

export const ConfigGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const ConfigFieldLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.38);
  white-space: nowrap;
`

export const ConfigInput = styled.input`
  width: 80px;
  height: 32px;
  padding: 0 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  color: #fff;
  font-size: 12.5px;
  font-family: inherit;
  font-weight: 600;
  text-align: center;
  outline: none;
  color-scheme: dark;
  &:focus { border-color: rgba(30,133,255,0.45); }
`

export const StepBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.55);
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
  transition: background 0.14s, color 0.14s;
  &:hover { background: rgba(255,255,255,0.10); color: #fff; }
  &:active { transform: scale(0.92); }
`

export const ConfigSaveBtn = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(30,133,255,0.35);
  background: rgba(30,133,255,0.15);
  color: #60a5fa;
  font-size: 11.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  &:hover { background: rgba(30,133,255,0.25); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const ConfigHint = styled.span`
  font-size: 11px;
  color: rgba(255,255,255,0.22);
  white-space: nowrap;
  @media (max-width: 600px) { display: none; }
`

/* ── filter bar ── */
export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.20s ease both;
`

export const DateInput = styled.input`
  height: 34px; padding: 0 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px; color: #fff; font-size: 12.5px; font-family: inherit;
  outline: none; color-scheme: dark;
  &:focus { border-color: rgba(30,133,255,0.45); }
`

export const FilterLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
`

export const PresetSelect = styled.select`
  height: 34px;
  padding: 0 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  color: rgba(255,255,255,0.75);
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  color-scheme: dark;
  option { background: #1a1a2e; }
  &:focus { border-color: rgba(30,133,255,0.45); }
`

export const FilterBtn = styled.button`
  height: 34px;
  padding: 0 16px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(135deg, #1d5aff 0%, #0d3acc 100%);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:active { opacity: 0.70; }
`

/* ── search row ── */
export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.21s ease both;
`

export const SearchBox = styled.div`
  position: relative;
  flex: 1;
  min-width: 160px;
  max-width: 440px;
  @media (max-width: 600px) { max-width: 100%; width: 100%; }
`

export const SrchIcon = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.28);
  display: flex;
  align-items: center;
  svg { font-size: 16px; }
`

export const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.25); }
  &:focus { border-color: rgba(30,133,255,0.40); background: rgba(255,255,255,0.07); }
`

export const ResultCount = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
`

/* ── table card ── */
export const TableCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  overflow: hidden;
  animation: ${fadeUp} 0.22s ease both;
`

export const TableScroll = styled.div`
  overflow-x: auto;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
`

export const Thead = styled.thead``

export const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  white-space: nowrap;
`

export const Tbody = styled.tbody``

export const Tr = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.14s;
  animation: ${fadeUp} 0.18s ease both;
  animation-delay: ${({ $i }) => Math.min($i * 0.03, 0.3)}s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.025); }
`

export const Td = styled.td`
  padding: 11px 14px;
  font-size: 12.5px;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
  vertical-align: middle;
`

/* ── id cell ── */
export const IdText = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
`

/* ── client cell ── */
export const ClientLink = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: #60a5fa;
  cursor: default;
`

/* ── amount ── */
export const AmountText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #c7d9ff;
`

/* ── cbu ── */
export const CbuText = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 11.5px;
  color: rgba(255,255,255,0.60);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
`

/* ── holder ── */
export const HolderText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  text-transform: uppercase;
`

/* ── status badge (2-line) ── */
export const StatusCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const StatusLine1 = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  display: inline-block;
  width: fit-content;

  ${({ $variant }) => {
    if ($variant === 'pending')  return css`background: rgba(245,158,11,0.16); color: #fbbf24;`
    if ($variant === 'approved') return css`background: rgba(34,197,94,0.15); color: #4ade80;`
    if ($variant === 'rejected') return css`background: rgba(239,68,68,0.15); color: #f87171;`
    return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45);`
  }}
`

export const StatusLine2 = styled.span`
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;

  ${({ $variant }) => {
    if ($variant === 'blocked') return css`background: rgba(239,68,68,0.12); color: #f87171;`
    if ($variant === 'sent')    return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.30);`
    if ($variant === 'manual')  return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.30);`
    return css`background: transparent; color: rgba(255,255,255,0.25);`
  }}
`

/* ── progress pipeline ── */
export const Pipeline = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`

export const PipeStage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid ${({ $active, $color }) => $active ? ($color || '#3b82f6') : 'rgba(255,255,255,0.12)'};
  background: ${({ $active, $color }) => $active ? `${$color || '#3b82f6'}22` : 'transparent'};
  color: ${({ $active, $color }) => $active ? ($color || '#3b82f6') : 'rgba(255,255,255,0.18)'};
  transition: all 0.2s;
  svg { font-size: 13px; }
`

export const PipeConnector = styled.div`
  width: 16px;
  height: 2px;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.40)' : 'rgba(255,255,255,0.08)'};
  transition: background 0.2s;
`

/* ── processed by ── */
export const ProcessorText = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.40);
`

/* ── expand button ── */
export const ExpandBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
  svg { font-size: 18px; }
  &:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.20); }
`

/* ── expanded detail row ── */
export const DetailRow = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.15);
`

export const DetailCell = styled.td`
  padding: 0;
  ${'' /* colSpan handles width */}
`

export const DetailWrap = styled.div`
  padding: 16px 20px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  animation: ${slideUp} 0.20s ease both;
  @media (max-width: 800px) { grid-template-columns: 1fr; }
`

export const DetailCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px 18px;
`

export const DetailCardTitle = styled.p`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #60a5fa;
  margin-bottom: 12px;
`

export const DetailRow2 = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`

export const DetailKey = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
`

export const DetailVal = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $blue }) => $blue ? '#60a5fa' : $blue === false ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.70)'};
  text-align: right;
  word-break: break-all;
  max-width: 200px;
`

export const DetailValBlue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #60a5fa;
  text-align: right;
  word-break: break-all;
  max-width: 200px;
`

export const DetailValRed = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #f87171;
  text-align: right;
  word-break: break-all;
  max-width: 200px;
`

export const CuilBadge = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  background: ${({ $ok }) => $ok ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.07)'};
  color: ${({ $ok }) => $ok ? '#4ade80' : 'rgba(255,255,255,0.35)'};
`

/* ── anti-fraud card ── */
export const FraudBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 9px;
  margin-bottom: 12px;
  font-size: 12.5px;
  font-weight: 700;

  ${({ $variant }) => {
    if ($variant === 'ok')   return css`background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); color: #4ade80;`
    if ($variant === 'warn') return css`background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.25); color: #fb923c;`
    return css`background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.40);`
  }}

  svg { font-size: 16px; }
`

export const RiskRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`

export const RiskLabel = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,0.38);
`

export const RiskValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $score }) =>
    $score >= 70 ? '#f87171' :
    $score >= 40 ? '#fb923c' :
    '#4ade80'};
`

export const RiskBar = styled.div`
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.07);
  overflow: hidden;
  margin-bottom: 12px;
`

export const RiskFill = styled.div`
  height: 100%;
  border-radius: 3px;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $score }) =>
    $score >= 70 ? 'linear-gradient(90deg,#f87171,#ef4444)' :
    $score >= 40 ? 'linear-gradient(90deg,#fb923c,#f59e0b)' :
    'linear-gradient(90deg,#4ade80,#22c55e)'};
  transition: width 0.4s ease;
`

export const AlertsHeader = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  margin-bottom: 8px;
`

export const AlertsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

export const AlertBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 6px;
  background: rgba(251,146,60,0.14);
  border: 1px solid rgba(251,146,60,0.28);
  color: #fb923c;
  font-size: 11px;
  font-weight: 600;
  svg { font-size: 12px; }
`

export const NoAlerts = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.22);
  font-style: italic;
`

export const FraudFooter = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.22);
  margin-top: 10px;
`

/* ── resolve actions ── */
export const ResolveSection = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
`

export const ResolveLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  margin-bottom: 8px;
`

export const ResolveBtns = styled.div`
  display: flex;
  gap: 8px;
`

export const ApproveBtn = styled.button`
  flex: 1;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(34,197,94,0.35);
  background: rgba(34,197,94,0.12);
  color: #4ade80;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(34,197,94,0.22); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const RejectBtn = styled.button`
  flex: 1;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(239,68,68,0.35);
  background: rgba(239,68,68,0.12);
  color: #f87171;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(239,68,68,0.22); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

export const RejectTextarea = styled.textarea`
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px;
  color: #fff;
  font-size: 12.5px;
  font-family: inherit;
  resize: vertical;
  min-height: 64px;
  outline: none;
  color-scheme: dark;
  &::placeholder { color: rgba(255,255,255,0.22); }
  &:focus { border-color: rgba(30,133,255,0.40); }
`

export const ConfirmRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`

export const ConfirmBtn = styled.button`
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.14s;

  ${({ $variant }) => $variant === 'confirm' ? css`
    border-color: rgba(34,197,94,0.35);
    background: rgba(34,197,94,0.14);
    color: #4ade80;
    &:hover { background: rgba(34,197,94,0.24); }
  ` : css`
    border-color: rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.45);
    &:hover { background: rgba(255,255,255,0.08); }
  `}

  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

/* ── loading / empty ── */
export const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: rgba(255,255,255,0.28);
  font-size: 13px;
`

export const Spinner = styled.span`
  width: ${({ $sm }) => $sm ? '16px' : '26px'};
  height: ${({ $sm }) => $sm ? '16px' : '26px'};
  border: ${({ $sm }) => $sm ? '2px' : '3px'} solid rgba(255,255,255,0.08);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  flex-shrink: 0;
`

export const SkeletonRow = styled.div`
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
  margin: 4px 14px;
`

export const EmptyRow = styled.tr``
export const EmptyCell = styled.td`
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(255,255,255,0.20);
`

/* ── pagination ── */
export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 12px;
  flex-wrap: wrap;
`

export const PaginInfo = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
`

export const PaginBtns = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

export const PaginBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.13s, color 0.13s;
  svg { font-size: 17px; }
  &:hover:not(:disabled) { background: rgba(255,255,255,0.10); color: #fff; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

/* ── placeholder tab ── */
export const PlaceholderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 300px;
  color: rgba(255,255,255,0.22);
  font-size: 14px;
`

/* ── toast ── */
export const Toast = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  font-size: 13px;
  font-weight: 600;
  animation: ${slideUp} 0.22s ease both;

  ${({ $type }) => $type === 'success' ? css`
    background: rgba(22,28,36,0.98);
    border: 1px solid rgba(34,197,94,0.35);
    color: #4ade80;
  ` : css`
    background: rgba(22,28,36,0.98);
    border: 1px solid rgba(239,68,68,0.35);
    color: #f87171;
  `}
`
