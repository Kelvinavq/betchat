import styled, { css, keyframes } from 'styled-components'

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`
import { gradients, colors } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(22px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1; min-width: 0;
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-sidebar-bg, #0b0b18);
  display: flex; flex-direction: column; overflow: hidden;
`
export const PageScroll = styled.div`
  flex: 1; overflow-y: auto; padding: 28px 28px 36px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
  @media (max-width: 600px) { padding: 20px 16px 28px; }
`

/* ── header ── */
export const PageHeader = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 26px; flex-wrap: wrap;
`
export const HeaderLeft = styled.div`display: flex; align-items: center; gap: 12px;`
export const MenuBtn = styled.button`
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; svg { font-size: 20px; }
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
`
export const TitleBlock = styled.div``
export const PageTitle = styled.h1`
  font-size: 21px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;
`
export const PageSub = styled.p`font-size: 13px; color: rgba(255,255,255,0.32); margin-top: 3px;`

export const HeaderActions = styled.div`
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
`
export const AddBtn = styled.button`
  display: flex; align-items: center; gap: 7px; padding: 10px 18px;
  border-radius: 12px; background: ${gradients.btn}; border: none; color: #fff;
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 18px rgba(13,79,232,0.38); transition: opacity 0.2s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.86; } &:active { transform: scale(0.97); }
`
export const OutlineBtn = styled.button`
  display: flex; align-items: center; gap: 6px; padding: 9px 15px;
  border-radius: 12px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10); color: rgba(255,255,255,0.60);
  font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; white-space: nowrap;
  transition: all 0.18s; svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.20); color: #fff; }
  &:active { transform: scale(0.97); }
`

/* ── filters ── */
export const FiltersBar = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;
`
export const SearchBox = styled.div`position: relative; flex: 1; min-width: 180px; max-width: 320px;`
export const SrchIcon = styled.span`
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: rgba(255,255,255,0.28); display: flex; align-items: center; pointer-events: none;
  svg { font-size: 16px; }
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
  &:focus { border-color: rgba(30,133,255,0.40); }
  option { background: #0c0c1e; color: #fff; }
`
export const ResultCount = styled.span`
  margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.28); white-space: nowrap;
`

/* ── table card ── */
export const TableCard = styled.div`
  background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden; animation: ${fadeUp} 0.28s ease both;
`
export const TableScroll = styled.div`
  overflow-x: auto;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`
export const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 860px;`
export const Thead = styled.thead`
  background: rgba(255,255,255,0.035); border-bottom: 1px solid rgba(255,255,255,0.06);
`
export const Th = styled.th`
  padding: 12px 16px; text-align: left;
  font-size: 11px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  color: rgba(255,255,255,0.28); white-space: nowrap;
  ${({ $center }) => $center && 'text-align: center;'}
`
export const Tbody = styled.tbody``
export const Tr = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s;
  animation: ${fadeUp} 0.22s ease both;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(30,133,255,0.05); }
`
export const Td = styled.td`
  padding: 13px 16px; vertical-align: middle;
  ${({ $center }) => $center && 'text-align: center;'}
`

/* ── client cell ── */
export const ClientCell = styled.div`display: flex; align-items: center; gap: 11px;`
export const ClientAvatar = styled.div`
  width: 36px; height: 36px; min-width: 36px; border-radius: 10px;
  background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  border: 1px solid rgba(40,140,255,0.25);
`
export const ClientMeta = styled.div`min-width: 0;`
export const ClientName = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const ClientId = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.30); margin-top: 1px;
  font-family: 'Courier New', monospace; letter-spacing: 0.02em;
`

/* ── mono text for IDs ── */
export const MonoText = styled.span`
  font-size: 12px; color: rgba(255,255,255,0.55);
  font-family: 'Courier New', monospace; letter-spacing: 0.02em;
`

/* ── badges ── */
export const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap;
  ${({ $on }) => $on ? css`
    background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.24);
  ` : css`
    background: rgba(239,68,68,0.10); color: #f87171; border: 1px solid rgba(239,68,68,0.22);
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

/* ── action buttons ── */
export const ActionBtns = styled.div`display: flex; align-items: center; gap: 5px;`
export const ActionBtn = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; svg { font-size: 16px; }
  &:hover {
    ${({ $v }) => $v === 'danger' ? css`
      background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.28); color: #f87171;
    ` : $v === 'warn' ? css`
      background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.28); color: #f59e0b;
    ` : $v === 'success' ? css`
      background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.28); color: #4ade80;
    ` : css`
      background: rgba(30,133,255,0.12); border-color: rgba(30,133,255,0.28); color: ${colors.primaryLighter};
    `}
  }
  &:disabled { opacity: 0.22; cursor: default; pointer-events: none; }
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
  padding: 56px 20px; text-align: center; color: rgba(255,255,255,0.20); font-size: 14px;
`

/* ═══════════════════════════════ MODALS ═══════════════════════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  animation: ${fadeUp} 0.18s ease both;
`
const baseCard = css`
  width: 100%; background: #0d0d20;
  border: 1px solid rgba(255,255,255,0.09); border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04);
  animation: ${slideUp} 0.26s cubic-bezier(0.16,1,0.3,1) both;
`
export const ModalCard = styled.div`
  ${baseCard}
  max-width: 520px;
  max-height: calc(var(--app-height, 100dvh) - 32px);
`
export const PwdModalCard = styled.div`
  ${baseCard}
  max-width: 380px;
`

export const ModalHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 22px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
`
export const ModalTitle = styled.h2`font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em;`
export const ModalSub = styled.p`font-size: 12px; color: rgba(255,255,255,0.30); margin-top: 2px;`
export const ModalClose = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0; svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.88); }
`
export const ModalBody = styled.div`
  flex: 1; overflow-y: auto; padding: 22px 22px 8px;
  display: flex; flex-direction: column; gap: 20px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`

/* avatar */
export const AvatarRow = styled.div`display: flex; flex-direction: column; align-items: center; gap: 8px;`
export const AvatarBox = styled.div`
  width: 64px; height: 64px; border-radius: 18px; background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; color: #fff;
  border: 2px solid rgba(40,140,255,0.30); box-shadow: 0 0 28px rgba(30,133,255,0.22);
`
export const AvatarHint = styled.p`font-size: 11px; color: rgba(255,255,255,0.25);`

/* form */
export const SecLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.22); margin-bottom: -8px;
`
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
  &:disabled { opacity: 0.40; cursor: default; }
  &::placeholder { color: rgba(255,255,255,0.18); }
`
export const FieldInput = styled.input`${inputBase}`
export const FieldInputError = styled.input`${inputBase} border-color: rgba(239,68,68,0.55) !important;`
export const ErrorMsg = styled.span`font-size: 11px; color: #f87171; margin-top: -2px;`

/* status toggle row */
export const StatusRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 12px 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
`
export const StatusRowLabel = styled.div``
export const StatusRowTitle = styled.p`font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.80);`
export const StatusRowSub = styled.p`font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 1px;`
export const Toggle = styled.button`
  width: 42px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  position: relative; flex-shrink: 0; transition: background 0.28s;
  background: ${({ $on }) => $on
    ? 'linear-gradient(90deg, rgba(30,133,255,0.65) 0%, rgba(13,79,232,0.65) 100%)'
    : 'rgba(255,255,255,0.10)'};
`
export const ToggleThumb = styled.span`
  position: absolute; top: 3px; left: ${({ $on }) => $on ? '21px' : '3px'};
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  transition: left 0.26s cubic-bezier(0.34,1.56,0.64,1); display: block;
  box-shadow: 0 1px 4px rgba(0,0,0,0.30);
`

/* modal footer */
export const ModalFoot = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 16px 22px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
`
export const FootLeft = styled.div`display: flex; gap: 8px;`
export const FootRight = styled.div`display: flex; gap: 8px;`
export const ModalBtn = styled.button`
  display: flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: opacity 0.18s, transform 0.15s;
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
  &:disabled { opacity: 0.32; cursor: default; pointer-events: none; }
`
/* ── toast notification ── */
export const Toast = styled.div`
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 600;
  min-width: 280px;
  max-width: 380px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 16px;
  background: #101024;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 18px 50px rgba(0,0,0,0.45);
  animation: ${fadeUp} 0.2s ease both;

  ${({ $type }) => $type === 'success' ? css`
    border-color: rgba(34,197,94,0.28);
  ` : css`
    border-color: rgba(239,68,68,0.28);
  `}

  @media (max-width: 600px) {
    left: 14px;
    right: 14px;
    bottom: 14px;
    max-width: none;
  }
`

export const ToastIconBox = styled.div`
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ $type }) => $type === 'success' ? css`
    background: rgba(34,197,94,0.13);
    color: #4ade80;
  ` : css`
    background: rgba(239,68,68,0.12);
    color: #f87171;
  `}

  svg {
    font-size: 20px;
  }
`

export const ToastBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const ToastTitle = styled.p`
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.90);
  margin-bottom: 2px;
`

export const ToastMsg = styled.p`
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255,255,255,0.48);
`

export const ToastClose = styled.button`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 7px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    font-size: 15px;
  }

  &:hover {
    background: rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.80);
  }
`

/* ── stats cards ── */
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 22px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`
export const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 3px solid ${({ $color }) => $color || '#3b82f6'};
  border-radius: 14px;
  animation: ${fadeUp} 0.28s ease both;
`
export const StatIconWrap = styled.div`
  width: 38px; height: 38px; min-width: 38px; border-radius: 10px;
  background: ${({ $color }) => $color ? `${$color}1a` : 'rgba(59,130,246,0.10)'};
  display: flex; align-items: center; justify-content: center;
  color: ${({ $color }) => $color || '#3b82f6'};
  svg { font-size: 20px; }
`
export const StatInfo = styled.div`min-width: 0;`
export const StatValue = styled.p`
  font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1;
`
export const StatLabel = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 3px; font-weight: 500;
`

/* ── button spinner ── */
export const BtnSpinner = styled.span`
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.30);
  border-top-color: #fff;
  display: inline-block; flex-shrink: 0;
  animation: ${spin} 0.7s linear infinite;
`

/* ── balance modal ── */
export const BalanceModalCard = styled.div`
  width: 100%; max-width: 440px;
  background: #0d0d20;
  border: 1px solid rgba(255,255,255,0.09); border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04);
  animation: ${slideUp} 0.26s cubic-bezier(0.16,1,0.3,1) both;
`
export const BalanceClientRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 18px 22px 0;
`
export const BalanceClientAvatar = styled.div`
  width: 40px; height: 40px; min-width: 40px; border-radius: 12px;
  background: ${({ theme }) => theme?.gradients?.btn || 'linear-gradient(135deg,#1e85ff,#0d4fe8)'};
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff;
  border: 1px solid rgba(40,140,255,0.30);
`
export const BalanceClientMeta = styled.div``
export const BalanceClientName = styled.p`font-size: 14px; font-weight: 700; color: #fff;`
export const BalanceClientSub = styled.p`font-size: 11px; color: rgba(255,255,255,0.30); margin-top: 1px;`

export const BalanceBody = styled.div`
  padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 18px;
`
export const BalanceSectionLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
  color: rgba(255,255,255,0.25); margin-bottom: -8px;
`
export const QuickGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
`
export const QuickBtn = styled.button`
  padding: 10px 6px; border-radius: 10px; font-family: inherit;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  ${({ $active }) => $active ? css`
    background: rgba(30,133,255,0.22); border: 1.5px solid rgba(30,133,255,0.55); color: #60a5fa;
  ` : css`
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.65);
    &:hover { background: rgba(255,255,255,0.09); color: #fff; }
  `}
`
export const BalanceInputWrap = styled.div`
  position: relative; display: flex; align-items: center;
`
export const BalanceCurrencySign = styled.span`
  position: absolute; left: 12px; font-size: 16px; font-weight: 600;
  color: rgba(255,255,255,0.35); pointer-events: none;
`
export const BalanceInput = styled.input`
  width: 100%; height: 48px; padding: 0 12px 0 28px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 12px; color: #fff; font-size: 18px; font-weight: 600; font-family: inherit;
  outline: none; transition: border-color 0.2s;
  &::placeholder { color: rgba(255,255,255,0.15); font-weight: 400; font-size: 14px; }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`
export const BalanceBtnRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 22px 22px;
`
export const BalanceCreditBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 46px; border-radius: 12px; border: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 700;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff; box-shadow: 0 4px 18px rgba(22,163,74,0.35);
  transition: opacity 0.18s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.88; } &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.32; cursor: default; pointer-events: none; }
`
export const BalanceDebitBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 46px; border-radius: 12px; border: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 700;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff; box-shadow: 0 4px 18px rgba(220,38,38,0.32);
  transition: opacity 0.18s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.88; } &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.32; cursor: default; pointer-events: none; }
`