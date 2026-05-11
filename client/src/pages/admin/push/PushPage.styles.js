import styled, { keyframes, css } from 'styled-components'

const fadeUp = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`
const spin   = keyframes`to{transform:rotate(360deg)}`

/* ── page shell ─────────────────────────────────────────────────── */
export const Wrap = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-content-bg, #08080f);
  overflow: hidden;
  animation: ${fadeUp} 0.22s ease both;
`

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 22px 0;
  flex-shrink: 0;
`

export const MenuBtn = styled.button`
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.55);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 18px; }
  &:hover { color: #fff; }
`

export const TitleBlock = styled.div`
  flex: 1; min-width: 0;
`

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--bc-admin-text-primary, #f1f5f9);
  letter-spacing: -.02em;
`

export const PageSub = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--bc-admin-text-muted, #64748b);
`

/* ── stats row ──────────────────────────────────────────────────── */
export const StatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px 0;
  flex-wrap: wrap;
  flex-shrink: 0;
`

export const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
`

export const StatIcon = styled.div`
  width: 32px; height: 32px; border-radius: 8px;
  background: ${p => p.$bg || 'rgba(99,102,241,0.14)'};
  border: 1px solid ${p => p.$br || 'rgba(99,102,241,0.26)'};
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
`

export const StatInfo = styled.div``
export const StatVal  = styled.div`
  font-size: 18px; font-weight: 800;
  color: var(--bc-admin-text-primary, #f1f5f9);
  line-height: 1;
`
export const StatLabel = styled.div`
  font-size: 10.5px; font-weight: 600;
  color: var(--bc-admin-text-muted, #64748b);
  text-transform: uppercase; letter-spacing: .04em;
  margin-top: 2px;
`

/* ── tab bar ────────────────────────────────────────────────────── */
export const TabsWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 14px 22px 0;
  overflow-x: auto;
  flex-shrink: 0;
  &::-webkit-scrollbar { height: 0; }
`

export const TabBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? 'rgba(99,102,241,0.45)' : 'transparent'};
  background: ${p => p.$active ? 'rgba(99,102,241,0.14)' : 'transparent'};
  color: ${p => p.$active ? '#a5b4fc' : 'rgba(255,255,255,.42)'};
  font-size: 13px;
  font-weight: ${p => p.$active ? '700' : '500'};
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
  &:hover:not(:disabled) {
    background: rgba(99,102,241,0.09);
    color: rgba(255,255,255,.75);
  }
`

/* ── main content ───────────────────────────────────────────────── */
export const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

/* ── section header (with global toggle) ────────────────────────── */
export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  margin-bottom: 4px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--bc-admin-text-primary, #f1f5f9);
`

export const SectionSub = styled.p`
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--bc-admin-text-muted, #64748b);
`

export const GlobalToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$active ? '#86efac' : 'rgba(255,255,255,.38)'};
`

/* ── campaign card ──────────────────────────────────────────────── */
export const CampCard = styled.div`
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color .18s;
  animation: ${fadeUp} 0.2s ease both;
  ${p => p.$delay && css`animation-delay: ${p.$delay};`}
  &:hover { border-color: rgba(255,255,255,.11); }
`

export const CampRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const CampLabel = styled.div`
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--bc-admin-text-primary, #f1f5f9);
`

export const CampNameInput = styled.input`
  flex: 1;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 7px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  outline: none;
  &:focus { border-color: rgba(99,102,241,.5); }
  &::placeholder { color: rgba(255,255,255,.25); }
`

/* ── push notification inputs (title + body) ────────────────────── */
export const InputsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

export const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const FieldLabel = styled.label`
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(255,255,255,.35);
  text-transform: uppercase;
  letter-spacing: .05em;
`

export const FieldInput = styled.input`
  background: var(--surface-1, rgba(15,23,42,0.7));
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 8px 11px;
  font-size: 12.5px;
  color: #fff;
  outline: none;
  font-family: inherit;
  transition: border-color .15s;
  &:focus { border-color: rgba(99,102,241,.5); }
  &::placeholder { color: rgba(255,255,255,.22); }
`

/* ── toggle ─────────────────────────────────────────────────────── */
export const Toggle = styled.button`
  flex-shrink: 0;
  width: 36px; height: 20px;
  border-radius: 10px; border: none;
  cursor: pointer;
  background: ${p => p.$on ? '#22c55e' : 'rgba(148,163,184,.2)'};
  position: relative;
  transition: background .2s;
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${p => p.$on ? '18px' : '3px'};
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: left .2s;
  }
`

/* ── weekday selector ───────────────────────────────────────────── */
export const WeekRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

export const WeekLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(255,255,255,.3);
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-right: 3px;
`

export const DayBtn = styled.button`
  min-width: 36px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid ${p => p.$active ? 'rgba(59,130,246,.6)' : 'rgba(255,255,255,.1)'};
  background: ${p => p.$active ? 'rgba(59,130,246,.22)' : 'rgba(255,255,255,.04)'};
  color: ${p => p.$active ? '#93c5fd' : 'rgba(255,255,255,.45)'};
  transition: all .13s;
  &:hover { border-color: rgba(59,130,246,.4); color: #93c5fd; }
`

/* ── time input ─────────────────────────────────────────────────── */
export const TimeWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

export const TimeInput = styled.input`
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  outline: none;
  width: 90px;
  &:focus { border-color: rgba(99,102,241,.5); }
`

/* ── number stepper ─────────────────────────────────────────────── */
export const StepperWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: rgba(255,255,255,.5);
`

export const StepperInput = styled.input`
  width: 60px;
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 7px;
  padding: 5px 8px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  outline: none;
  &:focus { border-color: rgba(99,102,241,.5); }
`

/* ── badges ─────────────────────────────────────────────────────── */
export const DayBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(99,102,241,.18);
  border: 1px solid rgba(99,102,241,.35);
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .02em;
`

export const ConditionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  ${p => {
    if (p.$type === 'deposited')     return 'background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.3);color:#86efac;'
    if (p.$type === 'not_deposited') return 'background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.3);color:#fca5a5;'
    return 'background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.2);color:#94a3b8;'
  }}
`

export const EventTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(56,189,248,.12);
  border: 1px solid rgba(56,189,248,.25);
  color: #7dd3fc;
`

/* ── action buttons ─────────────────────────────────────────────── */
export const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px dashed rgba(99,102,241,.35);
  background: rgba(99,102,241,.06);
  color: #a5b4fc;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  &:hover { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.55); }
`

export const SaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  background: ${p => p.$saved ? 'rgba(34,197,94,.18)' : 'rgba(99,102,241,1)'};
  color: ${p => p.$saved ? '#86efac' : '#fff'};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .18s;
  &:disabled { opacity: .5; cursor: default; }
  &:hover:not(:disabled) { background: ${p => p.$saved ? 'rgba(34,197,94,.22)' : '#5457e5'}; }
  svg { font-size: 15px; }
`

export const SendNowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  border: 1px solid rgba(56,189,248,.3);
  background: rgba(56,189,248,.1);
  color: #7dd3fc;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
  &:disabled { opacity: .4; cursor: default; }
  &:hover:not(:disabled) { background: rgba(56,189,248,.18); border-color: rgba(56,189,248,.5); }
  svg { font-size: 14px; }
`

export const DeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid rgba(239,68,68,.28);
  background: rgba(239,68,68,.08);
  color: #fca5a5;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
  &:hover { background: rgba(239,68,68,.15); border-color: rgba(239,68,68,.45); }
`

export const FooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
`

/* ── history table ──────────────────────────────────────────────── */
export const HistSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const HistTitle = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: rgba(255,255,255,.4);
  text-transform: uppercase;
  letter-spacing: .06em;
`

export const HistTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const HistRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 100px 80px 80px;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 9px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
  font-size: 12.5px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr 80px;
    > *:nth-child(3), > *:nth-child(4), > *:nth-child(5) { display: none; }
  }
`

export const HistName = styled.div`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--bc-admin-text-primary, #f1f5f9);
  font-weight: 600;
`

export const HistSub = styled.div`
  font-size: 11px;
  color: rgba(255,255,255,.38);
  margin-top: 1px;
`

export const HistCount = styled.div`
  color: rgba(255,255,255,.6);
  font-size: 12px;
`

export const HistRate = styled.div`
  color: ${p => {
    const r = p.$rate || 0
    if (r >= 80) return '#86efac'
    if (r >= 50) return '#fcd34d'
    return '#fca5a5'
  }};
  font-weight: 700;
  font-size: 12px;
`

export const HistDate = styled.div`
  color: rgba(255,255,255,.35);
  font-size: 11px;
`

export const HistPager = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 0 0;
  flex-wrap: wrap;
`

export const HistPagerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.75);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  &:hover:not(:disabled) {
    background: rgba(99,102,241,.12);
    border-color: rgba(99,102,241,.35);
    color: #c7d2fe;
  }
  &:disabled {
    opacity: .35;
    cursor: not-allowed;
  }
`

export const HistPagerInfo = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,.38);
  white-space: nowrap;
`

export const HistPagerTotal = styled.span`
  margin-left: 8px;
  opacity: 0.85;
`

/* ── settings form ──────────────────────────────────────────────── */
export const SettingsCard = styled.div`
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`

export const SelectInput = styled.select`
  background: rgba(15,23,42,.7);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 8px 11px;
  font-size: 12.5px;
  color: #fff;
  outline: none;
  width: 100%;
  option { background: #0f172a; }
  &:focus { border-color: rgba(99,102,241,.5); }
`

/* ── spinner ─────────────────────────────────────────────────────── */
export const Spinner = styled.div`
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.2);
  border-top-color: #a5b4fc;
  border-radius: 50%;
  animation: ${spin} .7s linear infinite;
  flex-shrink: 0;
`

export const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: rgba(255,255,255,.28);
  font-size: 13px;
`

export const ErrorLine = styled.div`
  font-size: 12px;
  color: #f87171;
  padding: 4px 0;
`
