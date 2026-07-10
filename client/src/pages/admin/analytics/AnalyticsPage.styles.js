import styled, { css, keyframes } from 'styled-components'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`
const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
`
const spin = keyframes`to { transform: rotate(360deg); }`

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-content-bg, #080814);
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
  padding: 20px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @media (max-width: 600px) { padding: 14px 14px 40px; }
`

/* ── filter bar ── */
export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.20s ease both;
`

export const PresetGroup = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 3px;
`

export const PresetBtn = styled.button`
  padding: 5px 12px;
  border-radius: 7px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  background: ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb, 30,133,255), 0.22)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.45)'};
  &:hover { color: rgba(255,255,255,0.85); }
`

export const DateSep = styled.span`
  width: 1px; height: 20px; background: rgba(255,255,255,0.10); flex-shrink: 0;
`

export const DateInput = styled.input`
  height: 34px; padding: 0 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px; color: #fff; font-size: 12.5px; font-family: inherit;
  outline: none; color-scheme: dark;
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30,133,255), 0.45); }
`

/* ── loading / error ── */
export const LoadingWrap = styled.div`
  flex: 1; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 12px;
  color: rgba(255,255,255,0.30); font-size: 13px;
`

export const Spinner = styled.span`
  width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #3b82f6; border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

export const SkeletonCard = styled.div`
  border-radius: 16px; overflow: hidden;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

/* ── KPI grid ── */
export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  animation: ${fadeUp} 0.22s ease both;
`

export const KpiCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.18s, background 0.18s;
  &:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: ${({ $color }) => $color || '#3b82f6'};
    opacity: 0.70;
  }
`

export const KpiIconWrap = styled.div`
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $color }) => `${$color}18`};
  svg { font-size: 18px; color: ${({ $color }) => $color}; }
`

export const KpiLabel = styled.p`
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255,255,255,0.35);
`

export const KpiValue = styled.p`
  font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.03em;
  line-height: 1;
`

export const KpiSub = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 2px;
`

/* ── chart card ── */
export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols === 2 ? '1fr 1fr' : '1fr'};
  gap: 14px;
  animation: ${fadeUp} 0.24s ease both;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

export const ChartCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  padding: 20px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: ${({ $h }) => $h || 300}px;
`

export const ChartHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`

export const ChartTitle = styled.p`
  font-size: 13.5px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
`

export const ChartSub = styled.p`
  font-size: 11.5px; color: rgba(255,255,255,0.32); margin-top: 2px;
`

/* ── top-users table ── */
export const TableCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  overflow: hidden;
  animation: ${fadeUp} 0.26s ease both;
`

export const TableHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`

export const TableTitle = styled.p`
  font-size: 13.5px; font-weight: 700; color: #fff;
`

export const Table = styled.table`
  width: 100%; border-collapse: collapse;
`

export const Th = styled.th`
  text-align: left; padding: 9px 20px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  white-space: nowrap;
`

export const Tr = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.14s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.03); }
`

export const Td = styled.td`
  padding: 11px 20px; font-size: 12.5px; color: rgba(255,255,255,0.75);
  white-space: nowrap;
`

/* ── tooltip ── */
export const TooltipBox = styled.div`
  background: rgba(10,10,24,0.96);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; padding: 10px 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.50);
  font-size: 12px; color: rgba(255,255,255,0.80);
  line-height: 1.7;
`

export const TooltipLabel = styled.p`
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.45);
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;
`

export const TooltipRow = styled.div`
  display: flex; align-items: center; gap: 7px;
`

export const TooltipDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export const AgentRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border-bottom: 0; }
`
export const AgentAvatar = styled.div`
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(var(--bc-admin-accent-rgb, 30,133,255), 0.18);
  color: var(--bc-admin-accent, #2563eb);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
`
export const AgentInfo = styled.div`flex: 1; min-width: 0;`
export const AgentName = styled.div`font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); truncate`
export const AgentSub  = styled.div`font-size: 11px; color: rgba(255,255,255,0.38); margin-top: 1px;`
export const AgentStat = styled.div`
  text-align: right; flex-shrink: 0;
  font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85);
  span { display: block; font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.38); }
`
export const ResolutionBar = styled.div`
  height: 4px; border-radius: 2px; background: rgba(255,255,255,0.07); overflow: hidden; margin-top: 6px;
`
export const ResolutionFill = styled.div`
  height: 100%; border-radius: 2px;
  background: var(--bc-admin-accent, #2563eb);
  width: ${({ $pct }) => $pct}%;
  transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
`
export const EmptyState = styled.div`
  text-align: center; padding: 40px 20px;
  color: rgba(255,255,255,0.28); font-size: 13px;
`
