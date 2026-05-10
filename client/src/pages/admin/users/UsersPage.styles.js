import styled, { css, keyframes } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(22px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`
const slideFromRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
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

export const PageScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px 28px 36px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
  @media (max-width: 600px) { padding: 20px 16px 28px; }
`

/* ── header ── */
export const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 26px;
`

export const AlertBox = styled.div`
  margin-bottom: 16px;
  padding: 16px 18px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: ${({ $type }) => $type === 'danger'
    ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))'
    : 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,211,142,0.10))'};
  border: 1px solid ${({ $type }) => $type === 'danger'
    ? 'rgba(239,68,68,0.26)'
    : 'rgba(16,185,129,0.22)'};
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
`

/* ── toast notification (fixed top-right) ── */
export const Toast = styled.div`
  position: fixed; top: 24px; right: 24px; z-index: 9999;
  min-width: 300px; max-width: 400px;
  padding: 14px 16px; border-radius: 16px;
  background: #12122a;
  border: 1px solid ${({ $type }) => $type === 'danger'
    ? 'rgba(239,68,68,0.30)' : 'rgba(34,197,94,0.30)'};
  box-shadow: 0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
  display: flex; align-items: flex-start; gap: 12px;
  animation: ${slideFromRight} 0.28s cubic-bezier(0.16,1,0.3,1) both;
  @media (max-width: 480px) { right: 16px; left: 16px; min-width: unset; top: 16px; }
`
export const ToastIconBox = styled.div`
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $type }) => $type === 'danger'
    ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)'};
  color: ${({ $type }) => $type === 'danger' ? '#f87171' : '#4ade80'};
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

/* ── loading / empty state ── */
export const LoadingRow = styled.tr``
export const LoadingCell = styled.td`
  padding: 56px 20px; text-align: center;
  color: rgba(255,255,255,0.22); font-size: 14px;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const MenuBtn = styled.button`
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 20px; }
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
`

export const TitleBlock = styled.div``
export const PageTitle = styled.h1`
  font-size: 21px; font-weight: 700;
  color: #ffffff; letter-spacing: -0.02em;
`
export const PageSub = styled.p`
  font-size: 13px; color: rgba(255,255,255,0.32); margin-top: 3px;
`

export const AddBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 10px 18px;
  border-radius: 12px;
  background: ${gradients.btn};
  border: none; color: #ffffff;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 18px rgba(13,79,232,0.38);
  transition: opacity 0.2s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.97); }
`

/* ── filters bar ── */
export const FiltersBar = styled.div`
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; flex-wrap: wrap;
`

export const SearchBox = styled.div`
  position: relative; flex: 1; min-width: 180px; max-width: 300px;
`
export const SrchIcon = styled.span`
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: rgba(255,255,255,0.28); display: flex; align-items: center;
  pointer-events: none;
  svg { font-size: 16px; }
`
export const SearchInput = styled.input`
  width: 100%; height: 38px; padding: 0 12px 0 34px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #ffffff; font-size: 13px; font-family: inherit; outline: none;
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

/* ── table card ── */
export const TableCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden;
  animation: ${fadeUp} 0.28s ease both;
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
  padding: 12px 16px; text-align: left;
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
  &:hover { background: rgba(30,133,255,0.05); }
`

export const Td = styled.td`
  padding: 13px 16px; vertical-align: middle;
  ${({ $center }) => $center && 'text-align: center;'}
`

/* ── user cell ── */
export const UserCell = styled.div`
  display: flex; align-items: center; gap: 11px;
`
export const UserAvatar = styled.div`
  width: 36px; height: 36px; min-width: 36px;
  border-radius: 10px; background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #ffffff;
  border: 1px solid rgba(40,140,255,0.25);
`
export const UserMeta = styled.div`min-width: 0;`
export const UserName = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const UserEmail = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.30); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

/* ── badges ── */
export const RoleBadge = styled.span`
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap;
  ${({ $role }) => $role === 'admin' ? css`
    background: rgba(139,92,246,0.14); color: #a78bfa;
    border: 1px solid rgba(139,92,246,0.28);
  ` : css`
    background: rgba(59,130,246,0.14); color: #60a5fa;
    border: 1px solid rgba(59,130,246,0.28);
  `}
`

export const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  ${({ $on }) => $on ? css`
    background: rgba(34,197,94,0.12); color: #4ade80;
    border: 1px solid rgba(34,197,94,0.24);
  ` : css`
    background: rgba(239,68,68,0.10); color: #f87171;
    border: 1px solid rgba(239,68,68,0.22);
  `}
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; flex-shrink: 0;
  }
`

export const OnlineDot = styled.div`
  width: 10px; height: 10px; border-radius: 50%; margin: 0 auto;
  background: ${({ $on }) => $on ? '#22c55e' : 'rgba(255,255,255,0.14)'};
  ${({ $on }) => $on && 'box-shadow: 0 0 0 3px rgba(34,197,94,0.18);'}
`

/* ── permission chips ── */
export const PermChips = styled.div`display: flex; flex-wrap: wrap; gap: 4px;`
export const PermChip = styled.span`
  font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 5px;
  letter-spacing: 0.02em; white-space: nowrap;
  background: ${({ $bg }) => $bg};
  color: ${({ $cl }) => $cl};
  border: 1px solid ${({ $br }) => $br};
`

/* ── action buttons ── */
export const ActionBtns = styled.div`display: flex; align-items: center; gap: 5px;`
export const ActionBtn = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  svg { font-size: 16px; }
  &:hover {
    ${({ $v }) => $v === 'danger' ? css`
      background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.28); color: #f87171;
    ` : $v === 'warn' ? css`
      background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.28); color: #f59e0b;
    ` : css`
      background: rgba(30,133,255,0.12); border-color: rgba(30,133,255,0.28); color: ${colors.primaryLighter};
    `}
  }
  &:disabled { opacity: 0.25; cursor: default; pointer-events: none; }
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
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
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

/* ── empty state ── */
export const EmptyRow = styled.tr``
export const EmptyCell = styled.td`
  padding: 56px 20px; text-align: center;
  color: rgba(255,255,255,0.20); font-size: 14px;
`

/* ═══════════════════════════════ MODAL ══════════════════════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: ${fadeUp} 0.18s ease both;
`

export const ModalCard = styled.div`
  width: 100%; max-width: ${({ $wide }) => $wide ? '760px' : '600px'};
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
export const ModalTitle = styled.h2`
  font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
`
export const ModalSub = styled.p`font-size: 12px; color: rgba(255,255,255,0.30); margin-top: 2px;`
export const ModalClose = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.88); }
`

export const ModalBody = styled.div`
  flex: 1; overflow-y: auto; padding: 22px 22px 8px;
  display: flex; flex-direction: column; gap: 22px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`

/* avatar preview */
export const AvatarRow = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 8px;
`
export const AvatarBox = styled.div`
  width: 64px; height: 64px; border-radius: 18px;
  background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; color: #fff;
  border: 2px solid rgba(40,140,255,0.30);
  box-shadow: 0 0 28px rgba(30,133,255,0.22);
`
export const AvatarHint = styled.p`font-size: 11px; color: rgba(255,255,255,0.25);`

/* section label inside modal */
export const SecLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: -10px;
`

/* two-column form grid */
export const FormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`

export const Field = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  ${({ $full }) => $full && 'grid-column: 1 / -1;'}
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
`
export const FieldSelect = styled.select`
  ${inputBase}
  cursor: pointer; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  option { background: #0d0d20; color: #fff; }
`

/* status toggle row */
export const StatusRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
`
export const StatusRowLabel = styled.div``
export const StatusRowTitle = styled.p`font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.80);`
export const StatusRowSub = styled.p`font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 1px;`

export const Toggle = styled.button`
  width: 42px; height: 24px; border-radius: 12px; border: none;
  cursor: pointer; position: relative; flex-shrink: 0;
  transition: background 0.28s;
  background: ${({ $on }) => $on
    ? 'linear-gradient(90deg, rgba(30,133,255,0.65) 0%, rgba(13,79,232,0.65) 100%)'
    : 'rgba(255,255,255,0.10)'};
`
export const ToggleThumb = styled.span`
  position: absolute; top: 3px;
  left: ${({ $on }) => $on ? '21px' : '3px'};
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  transition: left 0.26s cubic-bezier(0.34,1.56,0.64,1); display: block;
  box-shadow: 0 1px 4px rgba(0,0,0,0.30);
`

/* permissions grid */
export const PermGrid = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`
export const PermRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  padding: 9px 12px;
  border-radius: 10px; transition: background 0.15s;
  ${({ $sub }) => $sub ? css`
    margin-left: 16px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
  ` : css`
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
  `}
  &:hover { background: rgba(255,255,255,0.055); }
`
export const PermName = styled.span`
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.70);
`
export const PermSub = styled.span`
  display: block; font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.22); margin-top: 1px;
`
export const PermDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $cl }) => $cl}; flex-shrink: 0;
`
export const PermActions = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  width: 100%;
`
export const PermAction = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  ${({ $dim }) => $dim && 'opacity: 0.18; pointer-events: none;'}
`
export const PermActionLabel = styled.span`
  font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: rgba(255,255,255,0.24);
`

/* page restrictions */
export const RestrList = styled.div`display: flex; flex-direction: column; gap: 6px;`
export const RestrItem = styled.button`
  display: flex; align-items: center; gap: 12px; padding: 11px 14px;
  background: ${({ $on }) => $on ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)'};
  border: 1px solid ${({ $on }) => $on ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.06)'};
  border-radius: 11px; cursor: pointer; text-align: left; transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.06); }
`
export const RestrCheck = styled.span`
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid ${({ $on }) => $on ? '#f87171' : 'rgba(255,255,255,0.20)'};
  background: ${({ $on }) => $on ? 'rgba(239,68,68,0.16)' : 'transparent'};
  svg { font-size: 11px; color: #f87171; }
`
export const RestrLabel = styled.span`
  font-size: 13px; font-weight: ${({ $on }) => $on ? 600 : 400};
  color: ${({ $on }) => $on ? '#f87171' : 'rgba(255,255,255,0.62)'};
`
export const RestrNote = styled.span`
  margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.22);
`

/* time restriction */
export const TimeGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; margin-top: 8px;
`
const inputBase2 = css`
  width: 100%; height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  transition: border-color 0.2s, background 0.2s;
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`
export const TimeInput = styled.input`
  ${inputBase2}
  cursor: pointer;
  color-scheme: dark;
  &::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.40); cursor: pointer; }
`

export const TimeBadge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px; border-radius: 5px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap;
  background: rgba(251,146,60,0.12); color: #fb923c;
  border: 1px solid rgba(251,146,60,0.24);
`

/* modal footer */
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
  ` : css`
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.60);
  `}
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

export const SessionList = styled.div`
  display: flex; flex-direction: column; gap: 10px;
`
export const SessionCard = styled.div`
  display: grid; grid-template-columns: 1fr auto; gap: 12px;
  padding: 13px 14px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`
export const SessionMain = styled.div`
  min-width: 0; display: flex; flex-direction: column; gap: 8px;
`
export const SessionTitle = styled.div`
  display: flex; align-items: center; gap: 8px; min-width: 0;
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.82);
`
export const SessionMeta = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`
export const SessionPill = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%;
  padding: 4px 7px; border-radius: 7px;
  font-size: 11px; color: rgba(255,255,255,0.46);
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.065);
  overflow-wrap: anywhere;
`
export const SessionStatus = styled.span`
  height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: ${({ $active }) => $active ? '#4ade80' : 'rgba(255,255,255,0.28)'};
  background: ${({ $active }) => $active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.045)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(34,197,94,0.24)' : 'rgba(255,255,255,0.07)'};
`
