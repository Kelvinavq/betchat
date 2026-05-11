import styled, { css, keyframes } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`
const slideFromRight = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
`

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1; min-width: 0;
  height: var(--app-height, 100dvh);
  background: #0b0b18;
  display: flex; flex-direction: column; overflow: hidden;
`
export const PageScroll = styled.div`
  flex: 1; overflow-y: auto;
  padding: 28px 28px 36px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
  @media (max-width: 600px) { padding: 20px 16px 28px; }
`

/* ── header ── */
export const PageHeader = styled.div`
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
`
export const HeaderLeft = styled.div`display: flex; align-items: center; gap: 12px;`
export const MenuBtn = styled.button`
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 20px; }
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
`
export const TitleBlock = styled.div``
export const PageTitle = styled.h1`
  font-size: 21px; font-weight: 700; color: #fff; letter-spacing: -0.02em;
`
export const PageSub = styled.p`
  font-size: 13px; color: rgba(255,255,255,0.32); margin-top: 3px;
`

export const MainTabsWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`
export const MainTabBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(30,133,255,0.42)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(30,133,255,0.12)' : 'rgba(255,255,255,0.04)')};
  color: ${({ $active }) => ($active ? '#93c5fd' : 'rgba(255,255,255,0.42)')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover {
    background: rgba(30,133,255,0.08);
    color: rgba(255,255,255,0.78);
  }
`

export const SubsSubTabsWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`
export const SubsSubTabBtn = styled.button`
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(30,133,255,0.38)' : 'rgba(255,255,255,0.08)')};
  background: ${({ $active }) => ($active ? 'rgba(30,133,255,0.10)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#93c5fd' : 'rgba(255,255,255,0.38)')};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: rgba(30,133,255,0.28);
    color: rgba(255,255,255,0.72);
  }
`
export const CellMuted = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
`
export const TruncateCell = styled.span`
  display: block;
  max-width: min(280px, 36vw);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
export const AddBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 10px 18px; border-radius: 12px;
  background: ${gradients.btn}; border: none; color: #fff;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 18px rgba(13,79,232,0.36);
  transition: opacity 0.2s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.97); }
`

/* ── stats strip ── */
export const StatsStrip = styled.div`
  display: flex; gap: 10px; margin-bottom: 20px;
  @media (max-width: 600px) { flex-wrap: wrap; }
`
export const StatCard = styled.div`
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
`
export const StatIconWrap = styled.div`
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $bg }) => $bg}; border: 1px solid ${({ $br }) => $br};
  svg { font-size: 18px; color: ${({ $cl }) => $cl}; }
`
export const StatInfo = styled.div``
export const StatValue = styled.p`
  font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.03em; line-height: 1;
`
export const StatLabel = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 3px;
`

/* ── filters bar ── */
export const FiltersBar = styled.div`
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; flex-wrap: wrap;
`
export const SearchBox = styled.div`
  position: relative; flex: 1; min-width: 180px; max-width: 320px;
`
export const SrchIcon = styled.span`
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: rgba(255,255,255,0.28); display: flex; align-items: center;
  pointer-events: none; svg { font-size: 16px; }
`
export const SearchInput = styled.input`
  width: 100%; height: 38px; padding: 0 12px 0 34px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255,255,255,0.22); }
  &:focus { border-color: rgba(30,133,255,0.40); }
`
export const FilterSelect = styled.select`
  height: 38px; padding: 0 30px 0 11px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: rgba(255,255,255,0.72);
  font-size: 13px; font-family: inherit; outline: none; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
  transition: border-color 0.2s;
  &:focus { border-color: rgba(30,133,255,0.40); }
  option { background: #0c0c1e; color: #fff; }
`
export const ResultCount = styled.span`
  margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.28); white-space: nowrap;
`

/* ── table ── */
export const TableCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden;
  animation: ${fadeUp} 0.26s ease both;
`
export const TableScroll = styled.div`
  overflow-x: auto;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`
export const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 720px;
`
export const Thead = styled.thead`
  background: rgba(255,255,255,0.035);
  border-bottom: 1px solid rgba(255,255,255,0.06);
`
export const Th = styled.th`
  padding: 11px 16px; text-align: left;
  font-size: 11px; font-weight: 600; letter-spacing: 0.09em;
  text-transform: uppercase; color: rgba(255,255,255,0.28); white-space: nowrap;
  ${({ $center }) => $center && 'text-align: center;'}
`
export const Tbody = styled.tbody``
export const Tr = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
  animation: ${fadeUp} 0.22s ease both;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(30,133,255,0.04); }
`
export const Td = styled.td`
  padding: 12px 16px; vertical-align: middle;
  ${({ $center }) => $center && 'text-align: center;'}
`

/* ── notification cell ── */
export const NotifCell = styled.div`display: flex; align-items: center; gap: 12px;`
export const NotifIconBadge = styled.div`
  width: 38px; height: 38px; min-width: 38px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $s }) =>
    $s === 'enviada'   ? 'rgba(34,197,94,0.12)' :
    $s === 'programada'? 'rgba(14,165,233,0.12)' :
                         'rgba(255,255,255,0.06)'};
  border: 1px solid ${({ $s }) =>
    $s === 'enviada'   ? 'rgba(34,197,94,0.24)' :
    $s === 'programada'? 'rgba(14,165,233,0.24)' :
                         'rgba(255,255,255,0.10)'};
  svg { font-size: 18px; color: ${({ $s }) =>
    $s === 'enviada'   ? '#4ade80' :
    $s === 'programada'? '#38bdf8' :
                         'rgba(255,255,255,0.28)'}; }
`
export const NotifMeta = styled.div`min-width: 0;`
export const NotifTitle = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const NotifBodyPreview = styled.p`
  font-size: 11.5px; color: rgba(255,255,255,0.30); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;
`

/* ── audience badge ── */
export const AudienceBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 500; white-space: nowrap;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.50);
  border: 1px solid rgba(255,255,255,0.09);
`

/* ── status badge ── */
export const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  ${({ $s }) =>
    $s === 'enviada' ? css`
      background: rgba(34,197,94,0.12); color: #4ade80;
      border: 1px solid rgba(34,197,94,0.24);
    ` : $s === 'programada' ? css`
      background: rgba(14,165,233,0.12); color: #38bdf8;
      border: 1px solid rgba(14,165,233,0.24);
    ` : css`
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35);
      border: 1px solid rgba(255,255,255,0.09);
    `}
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; flex-shrink: 0;
  }
`

/* ── date text ── */
export const DateText = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.50);
  white-space: nowrap;
`
export const DateSub = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.22); margin-top: 1px;
  white-space: nowrap;
`

/* ── actions ── */
export const ActionBtns = styled.div`display: flex; align-items: center; gap: 5px;`
export const ActionBtn = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover {
    ${({ $v }) => $v === 'danger' ? css`
      background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.28); color: #f87171;
    ` : $v === 'warn' ? css`
      background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.28); color: #f59e0b;
    ` : $v === 'send' ? css`
      background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.28); color: #4ade80;
    ` : css`
      background: rgba(30,133,255,0.12); border-color: rgba(30,133,255,0.28);
      color: ${colors.primaryLighter};
    `}
  }
`

/* ── pagination ── */
export const Pagination = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 16px; border-top: 1px solid rgba(255,255,255,0.06);
`
export const PaginInfo = styled.span`font-size: 12px; color: rgba(255,255,255,0.28);`
export const PaginBtns = styled.div`display: flex; gap: 4px;`
export const PaginBtn = styled.button`
  min-width: 30px; height: 30px; padding: 0 6px; border-radius: 8px;
  font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  ${({ $active }) => $active ? css`
    background: ${gradients.btn}; border: none; color: #fff;
  ` : css`
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.40);
  `}
  &:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.80); }
  &:disabled { opacity: 0.28; cursor: default; }
  svg { font-size: 18px; }
`

export const EmptyRow = styled.tr``
export const EmptyCell = styled.td`
  padding: 64px 20px; text-align: center;
  color: rgba(255,255,255,0.20); font-size: 14px;
`

/* ── toast ── */
export const Toast = styled.div`
  position: fixed; top: 24px; right: 24px; z-index: 9999;
  min-width: 300px; max-width: 400px;
  padding: 14px 16px; border-radius: 16px;
  background: #12122a;
  border: 1px solid ${({ $type }) => ($type === 'danger'
    ? 'rgba(239,68,68,0.30)' : 'rgba(34,197,94,0.30)')};
  box-shadow: 0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
  display: flex; align-items: flex-start; gap: 12px;
  animation: ${slideFromRight} 0.28s cubic-bezier(0.16,1,0.3,1) both;
  @media (max-width: 480px) { right: 16px; left: 16px; min-width: unset; top: 16px; }
`
export const ToastIconBox = styled.div`
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $type }) => ($type === 'danger'
    ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)')};
  color: ${({ $type }) => ($type === 'danger' ? '#f87171' : '#4ade80')};
  svg { font-size: 20px; }
`
export const ToastBody = styled.div`flex: 1; min-width: 0; padding-top: 1px;`
export const ToastTitle = styled.p`font-size: 13px; font-weight: 700; color: #fff;`
export const ToastMsg = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 3px; line-height: 1.45;
`
export const ToastClose = styled.button`
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; margin-top: 1px;
  background: rgba(255,255,255,0.06); border: none;
  color: rgba(255,255,255,0.35);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  svg { font-size: 14px; }
  &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.75); }
`

/* ════════════════ MODAL ════════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: ${fadeUp} 0.18s ease both;
`
export const ModalCard = styled.div`
  width: 100%; max-width: 520px;
  max-height: calc(var(--app-height, 100dvh) - 32px);
  background: #0d0d20;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04);
  animation: ${slideUp} 0.26s cubic-bezier(0.16,1,0.3,1) both;
`
export const ModalHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
`
export const ModalIconBadge = styled.div`
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(30,133,255,0.12); border: 1px solid rgba(30,133,255,0.22);
  svg { font-size: 18px; color: ${colors.primaryLighter}; }
`
export const ModalHeadText = styled.div`flex: 1; margin-left: 12px;`
export const ModalTitle = styled.h2`font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;`
export const ModalSub = styled.p`font-size: 12px; color: rgba(255,255,255,0.30); margin-top: 2px;`
export const ModalClose = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.88); }
`
export const ModalBody = styled.div`
  flex: 1; overflow-y: auto; padding: 20px 22px 8px;
  display: flex; flex-direction: column; gap: 16px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`
export const ModalFoot = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 16px 22px;
  border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
`
export const FootLeft = styled.div`display: flex; gap: 8px;`
export const FootRight = styled.div`display: flex; gap: 8px;`
export const ModalBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: opacity 0.18s, transform 0.15s;
  ${({ $v }) => $v === 'primary' ? css`
    background: ${gradients.btn}; border: none; color: #fff;
    box-shadow: 0 4px 18px rgba(13,79,232,0.36);
  ` : $v === 'danger' ? css`
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.24); color: #f87171;
  ` : $v === 'ghost' ? css`
    background: none; border: none; color: rgba(255,255,255,0.45); padding: 9px 10px;
  ` : css`
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.60);
  `}
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

/* ── form fields ── */
export const SecLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,255,255,0.22);
`
export const Field = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  ${({ $full }) => $full && 'grid-column: 1 / -1;'}
`
export const FormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`
export const FieldLabel = styled.label`
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255,255,255,0.30);
`
const inputBase = css`
  width: 100%; height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  transition: border-color 0.2s, background 0.2s;
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`
export const FieldInput = styled.input`
  ${inputBase}
  &::placeholder { color: rgba(255,255,255,0.18); }
  color-scheme: dark;
`
export const FieldTextarea = styled.textarea`
  width: 100%; min-height: 82px; padding: 10px 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  resize: vertical; line-height: 1.5;
  transition: border-color 0.2s, background 0.2s;
  &::placeholder { color: rgba(255,255,255,0.18); }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`
export const FieldSelect = styled.select`
  ${inputBase}
  cursor: pointer; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  option { background: #0d0d20; color: #fff; }
`
export const CharCount = styled.span`
  font-size: 10.5px; color: rgba(255,255,255,0.20); text-align: right; margin-top: -2px;
  ${({ $warn }) => $warn && 'color: #fbbf24;'}
`

/* ── notification preview (approx. Web Push: hero image + fila texto) ── */
export const PreviewShell = styled.div`
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 10px 36px rgba(0,0,0,0.28);
`
export const PreviewHero = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 148px;
  background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2));
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`
export const PreviewBodyRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 14px;
  ${({ $withHero }) => $withHero && css`
    border-top: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.22);
  `}
`
export const PreviewCard = styled.div`
  display: flex; align-items: flex-start; gap: 11px;
  padding: 13px 14px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
`
export const PreviewAppIcon = styled.div`
  width: 34px; height: 34px; min-width: 34px; border-radius: 9px; flex-shrink: 0;
  background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  svg { font-size: 17px; color: #fff; }
`
export const PreviewContent = styled.div`flex: 1; min-width: 0;`
export const PreviewAppName = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: 4px;
  display: flex; justify-content: space-between; align-items: center;
`
export const PreviewTime = styled.span`
  font-size: 10px; font-weight: 400; letter-spacing: 0; text-transform: none;
  color: rgba(255,255,255,0.18);
`
export const PreviewTitle = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const PreviewBody = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.40); margin-top: 2px; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`
export const PreviewLabel = styled.p`
  font-size: 10px; font-weight: 600; letter-spacing: 0.09em;
  text-transform: uppercase; color: rgba(255,255,255,0.20); margin-bottom: 4px;
`
export const PreviewCaption = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.28); line-height: 1.45;
  margin-bottom: 10px;
`

/* ── image upload (modal) ── */
export const ImageUploadHiddenInput = styled.input`
  position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;
`
export const ImageDropRoot = styled.div`
  display: flex; flex-direction: column; gap: 0;
`
export const ImageUploadZone = styled.button`
  width: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 9px;
  padding: 22px 18px;
  border-radius: 12px;
  border: 1px dashed ${({ $drag, $disabled }) =>
    $disabled ? 'rgba(255,255,255,0.08)' : $drag ? 'rgba(30,133,255,0.55)' : 'rgba(255,255,255,0.14)'};
  background: ${({ $drag, $disabled }) =>
    $disabled ? 'rgba(255,255,255,0.02)' : $drag ? 'rgba(30,133,255,0.10)' : 'rgba(255,255,255,0.03)'};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  font-family: inherit;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
  &:hover:not(:disabled) {
    border-color: rgba(30,133,255,0.42);
    background: rgba(30,133,255,0.07);
  }
  &:active:not(:disabled) { transform: scale(0.992); }
`
export const ImageUploadIconWrap = styled.div`
  width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(30,133,255,0.12);
  border: 1px solid rgba(30,133,255,0.24);
  svg { font-size: 24px; color: #6eb6ff; }
`
export const ImageUploadTitle = styled.span`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.82);
`
export const ImageUploadHint = styled.span`
  font-size: 11px; color: rgba(255,255,255,0.30);
  text-align: center; max-width: 280px; line-height: 1.45;
`
export const ImageUploadSpinner = styled.span`
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.12);
  border-top-color: rgba(30,133,255,0.9);
  animation: spin 0.75s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`
export const ImageAttachedRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
`
export const ImageAttachedThumb = styled.img`
  width: 52px; height: 52px; border-radius: 10px; object-fit: cover; flex-shrink: 0;
  background: rgba(0,0,0,0.3);
`
export const ImageAttachedMeta = styled.div`
  flex: 1; min-width: 0;
`
export const ImageAttachedLabel = styled.p`
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.78);
`
export const ImageAttachedSub = styled.p`
  font-size: 10.5px; color: rgba(255,255,255,0.28); margin-top: 2px;
`
export const ImageGhostBtn = styled.button`
  padding: 7px 12px; border-radius: 9px;
  font-size: 11.5px; font-weight: 600; font-family: inherit; cursor: pointer;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.62);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover:not(:disabled) {
    background: rgba(30,133,255,0.12);
    border-color: rgba(30,133,255,0.28);
    color: #93c5fd;
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`
export const ImageRemoveBtn = styled.button`
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(239,68,68,0.10);
  border: 1px solid rgba(239,68,68,0.22);
  color: #fca5a5;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  svg { font-size: 18px; }
  &:hover:not(:disabled) {
    background: rgba(239,68,68,0.18);
    border-color: rgba(239,68,68,0.35);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`
export const UploadErrorBanner = styled.div`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; border-radius: 10px; margin-top: 10px;
  background: rgba(239,68,68,0.10);
  border: 1px solid rgba(239,68,68,0.22);
  font-size: 12px; color: #fca5a5; line-height: 1.45;
`

/* ── schedule toggle row ── */
export const ScheduleToggleRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
`
export const ScheduleRowLabel = styled.div``
export const ScheduleRowTitle = styled.p`font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.80);`
export const ScheduleRowSub = styled.p`font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 1px;`
export const Toggle = styled.button`
  width: 42px; height: 24px; border-radius: 12px; border: none;
  cursor: pointer; position: relative; flex-shrink: 0; transition: background 0.28s;
  background: ${({ $on }) => $on
    ? 'linear-gradient(90deg,rgba(30,133,255,0.65),rgba(13,79,232,0.65))'
    : 'rgba(255,255,255,0.10)'};
`
export const ToggleThumb = styled.span`
  position: absolute; top: 3px;
  left: ${({ $on }) => $on ? '21px' : '3px'};
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  transition: left 0.26s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 1px 4px rgba(0,0,0,0.30);
`

export const ScheduleFields = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  animation: ${fadeUp} 0.2s ease both;
`

/* ── confirm save banner (inside modal body) ── */
export const ConfirmBanner = styled.div`
  display: flex; flex-direction: column; gap: 10px;
  padding: 15px 16px; border-radius: 13px;
  background: rgba(30,133,255,0.08); border: 1px solid rgba(30,133,255,0.22);
  animation: ${fadeUp} 0.18s ease both;
`
export const ConfirmTitle = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85);
`
export const ConfirmSub = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.38); margin-top: -4px; line-height: 1.5;
`
export const ConfirmBtns = styled.div`display: flex; gap: 8px;`
export const ConfirmBtn = styled.button`
  flex: 1; padding: 9px 14px; border-radius: 10px;
  font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: opacity 0.18s;
  ${({ $primary }) => $primary ? css`
    background: ${gradients.btn}; border: none; color: #fff;
    box-shadow: 0 4px 14px rgba(13,79,232,0.30);
  ` : css`
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.58);
  `}
  &:hover { opacity: 0.82; }
`
