import styled, { css, keyframes } from 'styled-components'
import { gradients } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
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
  flex: 1; overflow-y: auto; padding: 28px 28px 48px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
  @media (max-width: 600px) { padding: 20px 16px 36px; }
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
export const AddBtn = styled.button`
  display: flex; align-items: center; gap: 7px; padding: 10px 18px;
  border-radius: 12px; background: ${gradients.btn}; border: none; color: #fff;
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 18px rgba(13,79,232,0.38); transition: opacity 0.2s, transform 0.15s;
  svg { font-size: 18px; }
  &:hover { opacity: 0.86; } &:active { transform: scale(0.97); }
`

/* ── filters ── */
export const FiltersBar = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;
`
export const SearchBox = styled.div`position: relative; flex: 1; min-width: 180px; max-width: 300px;`
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

export const Pagination = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-top: 22px; flex-wrap: wrap;
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
`

/* ── commands grid ── */
export const CommandsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-items: start;
  animation: ${fadeUp} 0.28s ease both;
`

/* ── command card ── */
export const CommandCard = styled.div`
  background: rgba(255,255,255,0.028);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column;
  cursor: pointer; transition: all 0.22s;
  opacity: ${({ $active }) => $active ? 1 : 0.52};
  animation: ${fadeUp} 0.28s ease both;
  &:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.13);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.32);
  }
`
export const CardAccent = styled.div`
  height: 3px; width: 100%; flex-shrink: 0;
`
export const CardBody = styled.div`
  padding: 16px 18px 14px; flex: 1;
  display: flex; flex-direction: column; gap: 11px;
`
export const CardTop = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
`
export const CardName = styled.h3`
  font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.90); letter-spacing: -0.01em;
  line-height: 1.3;
`
export const CardStatusDot = styled.div`
  width: 8px; height: 8px; min-width: 8px; border-radius: 50%; margin-top: 4px;
  background: ${({ $active }) => $active ? '#22c55e' : 'rgba(255,255,255,0.18)'};
  ${({ $active }) => $active && 'box-shadow: 0 0 0 3px rgba(34,197,94,0.16);'}
`
export const CommandPill = styled.div`
  display: inline-flex; align-items: center;
  padding: 5px 11px; border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
  width: fit-content; user-select: none;
`
export const CardPreview = styled.div`
  flex: 1; font-size: 12.5px; color: rgba(255,255,255,0.42); line-height: 1.58;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  p { margin: 0; } p + p { margin-top: 2px; }
  strong, b { color: rgba(255,255,255,0.62); font-weight: 600; }
  del, s { opacity: 0.55; }
  br { display: block; }
`
export const CardFooter = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 2px;
`
export const CardEditBtn = styled.button`
  display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.50); font-size: 12px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s; svg { font-size: 14px; }
  &:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.88); }
`
export const CardStatusBtn = styled.button`
  display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 7px;
  font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.18s;
  &::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  ${({ $active }) => $active ? css`
    background: rgba(34,197,94,0.10); border: 1px solid rgba(34,197,94,0.24); color: #4ade80;
    &:hover { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.24); color: #f87171; }
  ` : css`
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.32);
    &:hover { background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.24); color: #4ade80; }
  `}
`

/* ── add new card ── */
export const AddCard = styled.button`
  background: transparent;
  border: 2px dashed rgba(255,255,255,0.08); border-radius: 18px;
  min-height: 160px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  cursor: pointer; transition: all 0.22s; font-family: inherit;
  &:hover { border-color: rgba(30,133,255,0.32); background: rgba(30,133,255,0.04); }
`
export const AddCardIconWrap = styled.div`
  width: 44px; height: 44px; border-radius: 14px;
  background: rgba(30,133,255,0.07); border: 1px solid rgba(30,133,255,0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(30,133,255,0.50); transition: all 0.22s; svg { font-size: 22px; }
  ${AddCard}:hover & {
    background: rgba(30,133,255,0.14); border-color: rgba(30,133,255,0.35); color: #60a5fa;
  }
`
export const AddCardLabel = styled.p`
  font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.26); transition: color 0.22s;
  ${AddCard}:hover & { color: rgba(255,255,255,0.60); }
`

/* ── empty state ── */
export const EmptyWrap = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 80px 20px; gap: 10px; text-align: center;
`
export const EmptyGlyph = styled.div`
  font-size: 52px; margin-bottom: 6px; opacity: 0.35; user-select: none; line-height: 1;
`
export const EmptyTitle = styled.p`font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.38);`
export const EmptySub = styled.p`
  font-size: 13px; color: rgba(255,255,255,0.20); max-width: 280px; line-height: 1.5;
`

/* ═══════════════ MODAL ═══════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  animation: ${fadeUp} 0.18s ease both;
`
export const ModalCard = styled.div`
  width: 100%; max-width: 540px;
  max-height: calc(var(--app-height, 100dvh) - 32px);
  background: #0d0d20; border: 1px solid rgba(255,255,255,0.09); border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04);
  animation: ${slideUp} 0.26s cubic-bezier(0.16,1,0.3,1) both;
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
  display: flex; flex-direction: column; gap: 22px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`

/* form */
export const SecLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.22); margin-bottom: -8px;
`
export const FormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`
export const Field = styled.div`display: flex; flex-direction: column; gap: 6px;`
export const FieldLabel = styled.label`
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255,255,255,0.30);
`
export const FieldInput = styled.input`
  width: 100%; height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  transition: border-color 0.2s, background 0.2s;
  &::placeholder { color: rgba(255,255,255,0.18); }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`

/* command input with / prefix */
export const CommandInputWrap = styled.div`
  display: flex; align-items: stretch; height: 40px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; overflow: hidden; transition: border-color 0.2s, background 0.2s;
  &:focus-within { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.05); }
`
export const CommandPrefix = styled.span`
  display: flex; align-items: center; padding: 0 11px;
  background: rgba(30,133,255,0.10); border-right: 1px solid rgba(30,133,255,0.20);
  color: #60a5fa; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace;
  flex-shrink: 0; user-select: none;
`
export const CommandInput = styled.input`
  flex: 1; padding: 0 12px;
  background: transparent; border: none; outline: none;
  color: #fff; font-size: 13px; font-family: 'Courier New', monospace; letter-spacing: 0.02em;
  &::placeholder { color: rgba(255,255,255,0.18); font-family: inherit; }
`

/* status toggle */
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
  &:hover { opacity: 0.82; } &:active { transform: scale(0.97); }
`

/* ═══════════════ RICH TEXT EDITOR ═══════════════ */
export const EditorWrap = styled.div`
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 12px; overflow: hidden; position: relative;
  transition: border-color 0.2s;
  &:focus-within { border-color: rgba(30,133,255,0.40); }
`
export const EditorToolbar = styled.div`
  display: flex; align-items: center; gap: 2px; padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
`
export const ToolBtn = styled.button`
  min-width: 32px; height: 28px; padding: 0 6px; border-radius: 6px;
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.18)' : 'transparent'};
  border: ${({ $active }) => $active ? '1px solid rgba(30,133,255,0.35)' : '1px solid transparent'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.45)'};
  font-size: 13px; font-family: inherit;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.88); }
`
export const ToolSep = styled.div`
  width: 1px; height: 18px; background: rgba(255,255,255,0.10); margin: 0 3px; flex-shrink: 0;
`
export const EditorContent = styled.div`
  min-height: 110px; max-height: 200px; padding: 12px 14px;
  color: rgba(255,255,255,0.82); font-size: 13px; line-height: 1.65;
  overflow-y: auto; outline: none; cursor: text; word-break: break-word;
  p { margin: 0; } div { margin: 0; }
  strong, b { font-weight: 700; color: #fff; }
  del, s { opacity: 0.60; text-decoration: line-through; }
  &:empty::before {
    content: attr(data-placeholder);
    color: rgba(255,255,255,0.20); pointer-events: none; display: block;
  }
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
`

/* emoji picker popover — sits inside EditorWrap */
export const EmojiPopover = styled.div`
  border-top: 1px solid rgba(255,255,255,0.08);
  background: #0f0f22;
`
export const EmojiCategoryBar = styled.div`
  display: flex; border-bottom: 1px solid rgba(255,255,255,0.07);
`
export const EmojiCategoryBtn = styled.button`
  flex: 1; padding: 7px 0; font-size: 16px; line-height: 1;
  background: ${({ $active }) => $active ? 'rgba(255,255,255,0.07)' : 'transparent'};
  border: none; cursor: pointer; transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.05); }
`
export const EmojiGrid = styled.div`
  display: flex; flex-wrap: wrap; gap: 1px; padding: 8px;
  max-height: 140px; overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
`
export const EmojiBtn = styled.button`
  width: 34px; height: 34px; border-radius: 6px; border: none;
  background: transparent; font-size: 18px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.09); }
`
