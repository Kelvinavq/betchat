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

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1; min-width: 0;
  height: var(--app-height, 100dvh);
  background: #0b0b18;
  display: flex; flex-direction: column;
  overflow: hidden;
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
export const HeaderLeft = styled.div`
  display: flex; align-items: center; gap: 12px;
`
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

/* ── bank type tabs ── */
export const BankTabsBar = styled.div`
  display: flex; gap: 6px;
  margin-bottom: 18px;
  overflow-x: auto; flex-shrink: 0;
  padding-bottom: 2px;
  &::-webkit-scrollbar { display: none; }
`
export const BankTab = styled.button`
  display: flex; align-items: center; gap: 9px;
  padding: 9px 16px; border-radius: 12px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: all 0.18s;
  ${({ $active, $color, $bg, $br }) => $active ? css`
    background: ${$bg}; border: 1px solid ${$br}; color: ${$color};
    font-weight: 600;
  ` : css`
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.40);
    &:hover {
      background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75);
      border-color: rgba(255,255,255,0.12);
    }
  `}
`
export const BankTabDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $color, $active }) => $active ? $color : 'rgba(255,255,255,0.18)'};
  transition: background 0.18s;
`
export const BankTabCount = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 6px; font-size: 11px; font-weight: 700;
  background: ${({ $active, $bg }) => $active ? $bg : 'rgba(255,255,255,0.07)'};
  color: ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.30)'};
  border: 1px solid ${({ $active, $br }) => $active ? $br : 'rgba(255,255,255,0.06)'};
  transition: all 0.18s;
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

/* ── table card ── */
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
  width: 100%; border-collapse: collapse; min-width: 680px;
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
  ${({ $right }) => $right && 'text-align: right;'}
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
  ${({ $right }) => $right && 'text-align: right;'}
`

/* ── account cell ── */
export const AccountCell = styled.div`display: flex; align-items: center; gap: 11px;`
export const AccountAvatar = styled.div`
  width: 36px; height: 36px; min-width: 36px;
  border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff;
  background: ${({ $bg }) => $bg ?? gradients.btn};
  border: 1px solid ${({ $br }) => $br ?? 'rgba(40,140,255,0.25)'};
`
export const AccountMeta = styled.div`min-width: 0;`
export const AccountName = styled.p`
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const AccountEmail = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.30); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

/* ── mono text (CBU, token, etc.) ── */
export const MonoText = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 11.5px; color: rgba(255,255,255,0.55);
  white-space: nowrap;
`
export const MonoLabel = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.30); margin-top: 1px;
  font-family: 'Courier New', monospace;
`

/* ── badges ── */
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
export const TokenBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 5px;
  font-size: 10px; font-weight: 600; white-space: nowrap;
  ${({ $ok }) => $ok ? css`
    background: rgba(30,133,255,0.12); color: #60a5fa;
    border: 1px solid rgba(30,133,255,0.22);
  ` : css`
    background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.28);
    border: 1px solid rgba(255,255,255,0.08);
  `}
`
export const ExpiredBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 5px;
  font-size: 10px; font-weight: 600; white-space: nowrap;
  background: rgba(245,158,11,0.12); color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.22);
`

/* ── action buttons ── */
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
    ` : $v === 'success' ? css`
      background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.28); color: #4ade80;
    ` : css`
      background: rgba(30,133,255,0.12); border-color: rgba(30,133,255,0.28);
      color: ${colors.primaryLighter};
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
export const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 64px 24px; text-align: center;
`
export const EmptyIcon = styled.div`
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.18); svg { font-size: 26px; }
`
export const EmptyTitle = styled.p`
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.28);
`
export const EmptySub = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.18); margin-top: -4px;
`
export const EmptyRow = styled.tr``
export const EmptyCell = styled.td`
  padding: 56px 20px; text-align: center;
  color: rgba(255,255,255,0.20); font-size: 14px;
`

/* ════════════════════════════════ MODAL ════════════════════════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: ${fadeUp} 0.18s ease both;
`
export const ModalCard = styled.div`
  width: 100%; max-width: 540px;
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
export const ModalBankBadge = styled.div`
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $bg }) => $bg}; border: 1px solid ${({ $br }) => $br};
  svg { font-size: 19px; color: ${({ $cl }) => $cl}; }
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
  flex: 1; overflow-y: auto; padding: 22px 22px 8px;
  display: flex; flex-direction: column; gap: 18px;
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
  ` : css`
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.60);
  `}
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

/* ── form fields (modal) ── */
export const SecLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,255,255,0.22);
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
`
export const FieldInput = styled.input`
  ${inputBase}
  &::placeholder { color: rgba(255,255,255,0.18); }
  ${({ $mono }) => $mono && `font-family: 'Courier New', monospace; font-size: 12px;`}
`
export const FieldSelect = styled.select`
  ${inputBase}
  cursor: pointer; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  option { background: #0d0d20; color: #fff; }
`
export const InputWrap = styled.div`position: relative; display: flex; align-items: center;`
export const InputSuffix = styled.button`
  position: absolute; right: 10px;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.28); transition: color 0.18s;
  svg { font-size: 16px; }
  &:hover { color: rgba(255,255,255,0.65); }
`

/* ── status toggle row (modal) ── */
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

/* ════════════════════════════════ COPY FIELD ════════════════════════════════ */
export const CopyRow = styled.div`
  display: flex; align-items: center; gap: 5px;
  & + & { margin-top: 2px; }
`
export const CopyVal = styled.span`
  font-size: ${({ $small }) => $small ? '11px' : '12.5px'};
  font-family: ${({ $mono }) => $mono ? "'Courier New', monospace" : 'inherit'};
  color: ${({ $mono }) => $mono ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.82)'};
  font-weight: ${({ $mono }) => $mono ? 400 : 600};
  white-space: nowrap;
`
export const CopyBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.25); cursor: pointer;
  transition: all 0.14s;
  svg { font-size: 11px; }
  &:hover { background: rgba(30,133,255,0.12); border-color: rgba(30,133,255,0.25); color: #60a5fa; }
  &.copied { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.28); color: #4ade80; }
`

/* ════════════════════════════════ MOVEMENTS PANEL ════════════════════════════════ */
const movSlideIn = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`

export const MovOverlay = styled.div`
  position: fixed; inset: 0; z-index: 350;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: ${fadeUp} 0.16s ease both;
`
export const MovPanel = styled.div`
  width: 100%; max-width: 1100px;
  height: calc(var(--app-height, 100dvh) - 32px);
  max-height: 840px;
  background: #0d0d20;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.04);
  animation: ${movSlideIn} 0.28s cubic-bezier(0.16,1,0.3,1) both;
`
export const MovPanelHead = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 18px 22px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
`
export const MovAccBadge = styled.div`
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $bg }) => $bg}; border: 1px solid ${({ $br }) => $br};
  svg { font-size: 17px; color: ${({ $cl }) => $cl}; }
`
export const MovPanelTitleGroup = styled.div`flex: 1; min-width: 0;`
export const MovPanelTitle = styled.h2`
  font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
`
export const MovPanelSub = styled.p`font-size: 11.5px; color: rgba(255,255,255,0.28); margin-top: 1px;`
export const MovPanelClose = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.11); color: rgba(255,255,255,0.88); }
`

/* account info bar */
export const MovInfoBar = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 22px;
  background: rgba(255,255,255,0.018);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0; flex-wrap: wrap;
`
export const MovInfoItem = styled.div`
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
`
export const MovInfoLabel = styled.span`
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(255,255,255,0.22);
`
export const MovInfoValRow = styled.div`
  display: flex; align-items: center; gap: 6px;
`
export const MovInfoVal = styled.span`
  font-size: 12.5px; font-weight: 600;
  font-family: ${({ $mono }) => $mono ? "'Courier New', monospace" : 'inherit'};
  color: rgba(255,255,255,0.72); white-space: nowrap;
`
export const MovInfoSep = styled.span`
  width: 1px; height: 28px; background: rgba(255,255,255,0.07); flex-shrink: 0;
`
export const MovBalCard = styled.div`
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 14px; border-radius: 10px;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.18);
  margin-left: auto;
`
export const MovBalLabel = styled.span`
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(34,197,94,0.70);
`
export const MovBalVal = styled.span`
  font-size: 16px; font-weight: 700; color: #4ade80; letter-spacing: -0.02em;
`

/* filters */
export const MovFilters = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 12px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0; flex-wrap: wrap;
`
export const MovDateInput = styled.input`
  height: 32px; padding: 0 9px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: #fff; font-size: 12px; font-family: inherit;
  outline: none; color-scheme: dark;
  &:focus { border-color: rgba(30,133,255,0.40); }
`
export const MovFilterLabel = styled.span`
  font-size: 12px; color: rgba(255,255,255,0.30); white-space: nowrap;
`
export const MovFilterSelect = styled.select`
  height: 32px; padding: 0 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: rgba(255,255,255,0.72); font-size: 12px;
  font-family: inherit; outline: none; cursor: pointer; color-scheme: dark;
  option { background: #0d0d20; }
  &:focus { border-color: rgba(30,133,255,0.40); }
`
export const MovPresetBtn = styled.button`
  height: 28px; padding: 0 10px; border-radius: 7px;
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.18)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.35)' : 'rgba(255,255,255,0.07)'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.38)'};
  font-size: 11px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.14s; white-space: nowrap;
  &:hover { background: rgba(30,133,255,0.14); border-color: rgba(30,133,255,0.28); color: #93c5fd; }
`
export const MovSearchBox = styled.div`
  position: relative; flex: 1; min-width: 160px; max-width: 240px;
`
export const MovSrchIcon = styled.span`
  position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
  color: rgba(255,255,255,0.25); display: flex; align-items: center;
  pointer-events: none; svg { font-size: 14px; }
`
export const MovSearchInput = styled.input`
  width: 100%; height: 32px; padding: 0 10px 0 30px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: #fff; font-size: 12px; font-family: inherit; outline: none;
  &::placeholder { color: rgba(255,255,255,0.20); }
  &:focus { border-color: rgba(30,133,255,0.40); }
`
export const MovResultCount = styled.span`
  font-size: 11.5px; color: rgba(255,255,255,0.25); white-space: nowrap; margin-left: auto;
`

/* movements table */
export const MovTableWrap = styled.div`
  flex: 1; overflow: hidden; display: flex; flex-direction: column;
`
export const MovTableScroll = styled.div`
  flex: 1; overflow: auto;
  &::-webkit-scrollbar { width: 4px; height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
`

/* movement status badge */
export const MovStatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 6px;
  font-size: 11px; font-weight: 700; white-space: nowrap;
  ${({ $s }) => {
    if ($s === 'paid')     return css`background: rgba(34,197,94,0.13); color: #4ade80; border: 1px solid rgba(34,197,94,0.25);`
    if ($s === 'pending')  return css`background: rgba(245,158,11,0.13); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25);`
    if ($s === 'rejected') return css`background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.22);`
    return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); border: 1px solid rgba(255,255,255,0.08);`
  }}
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; flex-shrink: 0;
  }
`

/* spinner */
const movSpin = keyframes`to { transform: rotate(360deg); }`
export const MovSpinner = styled.div`
  width: 24px; height: 24px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.08); border-top-color: #3b82f6;
  animation: ${movSpin} 0.8s linear infinite; margin: 48px auto;
`
export const MovEmpty = styled.div`
  padding: 64px 20px; text-align: center;
  font-size: 13px; color: rgba(255,255,255,0.20);
`

/* ── toast notification ── */
const toastIn = keyframes`
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1); }
`
export const ToastWrap = styled.div`
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  padding: 11px 16px; border-radius: 12px;
  min-width: 220px; max-width: 420px;
  backdrop-filter: blur(12px);
  animation: ${toastIn} 0.22s ease;
  z-index: 10; pointer-events: all;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  ${({ $type }) => $type === 'success' ? css`
    background: rgba(22,101,52,0.72);
    border: 1px solid rgba(34,197,94,0.30);
    color: #bbf7d0;
  ` : css`
    background: rgba(127,29,29,0.72);
    border: 1px solid rgba(239,68,68,0.30);
    color: #fecaca;
  `}
`
export const ToastIcon = styled.span`
  font-size: 16px; flex-shrink: 0; line-height: 1;
`
export const ToastMsg = styled.span`
  font-size: 13px; font-weight: 600; line-height: 1.4; flex: 1;
`
export const ToastClose = styled.button`
  background: none; border: none; cursor: pointer; padding: 2px;
  color: inherit; opacity: 0.55; display: flex; align-items: center;
  flex-shrink: 0;
  &:hover { opacity: 1; }
  svg { font-size: 15px; }
`
