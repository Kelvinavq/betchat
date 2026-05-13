import styled, { css, keyframes } from 'styled-components'
import { gradients } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(22px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

const pulse = keyframes`
  0%,100% { opacity: 1; }
  50% { opacity: .4; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const neonPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
  50% { box-shadow: 0 0 20px 2px rgba(0, 255, 255, 0.15); }
`

const shine = keyframes`
  0% { left: -100%; }
  100% { left: 100%; }
`

/* ── page shell ── */
export const PageWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  background: #08080f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const PageScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 40px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
  }

  @media (max-width: 600px) {
    padding: 16px 14px 28px;
  }
`

/* ── header ── */
export const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  animation: ${fadeUp} .22s ease both;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const MenuBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  svg {
    font-size: 20px;
  }

  &:hover {
    background: rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.85);
  }
`

export const TitleBlock = styled.div``

export const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
`

export const PageSub = styled.p`
  font-size: 12.5px;
  color: rgba(255,255,255,0.32);
  margin-top: 2px;
`

export const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  background: ${gradients.btn};
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 18px rgba(13,79,232,0.32);
  transition: opacity .2s, transform .15s;
  flex-shrink: 0;

  svg {
    font-size: 17px;
  }

  &:hover {
    opacity: .84;
  }

  &:active {
    transform: scale(0.97);
  }
`

/* ── stats strip ── */
export const StatsStrip = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  flex-wrap: wrap;
  animation: ${fadeUp} .24s ease both;
`

export const StatCard = styled.div`
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  transition: border-color .2s;

  &:hover {
    border-color: rgba(255,255,255,.10);
  }
`

export const StatIconWrap = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $br }) => $br};

  svg {
    font-size: 18px;
    color: ${({ $cl }) => $cl};
  }
`

export const StatInfo = styled.div``

export const StatValue = styled.p`
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.04em;
  line-height: 1;
`

export const StatLabel = styled.p`
  font-size: 10.5px;
  color: rgba(255,255,255,0.28);
  margin-top: 3px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
`

/* ── main grid ── */
export const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  animation: ${fadeUp} .26s ease both;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

/* ── send panel ── */
export const SendPanel = styled.div`
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const PanelTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -.01em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    font-size: 17px;
    color: #7dd3fc;
  }
`

export const PanelSub = styled.p`
  font-size: 11.5px;
  color: rgba(255,255,255,.32);
  margin-top: 2px;
`

/* ── preview + history panel ── */
export const PreviewHistoryPanel = styled.div`
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`




/* ── Preview Placeholder mejorado ── */
export const PreviewPlaceholder = styled.div`
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,255,255,.12);
  font-size: 13px;
  background: linear-gradient(135deg, #0a0a10, #0d0d18);
  border-radius: 20px;
  border: 1px dashed rgba(255,255,255,.06);
  
  svg {
    font-size: 42px;
    opacity: .25;
    margin-bottom: 4px;
  }
`

/* ── history list ── */
export const HistLabel = styled.p`
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: rgba(255,255,255,.28); margin: 0;
`
export const HistList = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto; max-height: 280px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }
`
export const HistItem = styled.div`
  padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  cursor: pointer; transition: border-color .15s, background .15s;
  animation: ${fadeUp} .18s ease both;
  &:hover { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.10); }
`
export const HistItemTitle = styled.p`
  font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.80);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const HistItemMeta = styled.p`
  font-size: 11px; color: rgba(255,255,255,.30); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const HistItemDate = styled.span`
  font-size: 10.5px; color: rgba(255,255,255,.22); float: right;
`
export const HistEmpty = styled.div`
  padding: 28px 12px; text-align: center;
  font-size: 12.5px; color: rgba(255,255,255,.20);
`

/* ── form fields (send form) ── */
export const FieldGroup = styled.div`
  display: flex; flex-direction: column; gap: 5px;
`
export const FieldLabel = styled.label`
  font-size: 10px; font-weight: 700; letter-spacing: .09em;
  text-transform: uppercase; color: rgba(255,255,255,.30);
`
const inputBase = css`
  width: 100%;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
  border-radius: 9px; color: #fff; font-size: 13px; font-family: inherit; outline: none;
  transition: border-color .2s, background .2s;
  &:focus { border-color: rgba(30,133,255,.45); background: rgba(30,133,255,.05); }
  &::placeholder { color: rgba(255,255,255,.18); }
  color-scheme: dark;
`
export const FieldInput = styled.input`
  ${inputBase}
  height: 38px; padding: 0 11px;
`
export const FieldTextarea = styled.textarea`
  ${inputBase}
  padding: 9px 11px; min-height: 72px; resize: vertical; line-height: 1.5;
`
export const FieldSelect = styled.select`
  ${inputBase}
  height: 38px; padding: 0 30px 0 11px; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 11px center;
  option { background: #0d0d20; color: #fff; }
`
export const FieldRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  @media (max-width: 540px) { grid-template-columns: 1fr; }
`
export const CharCount = styled.span`
  font-size: 10px; color: rgba(255,255,255,.20); text-align: right; margin-top: -3px;
  ${({ $warn }) => $warn && 'color: #fbbf24;'}
`

/* ── image upload (send form) ── */
export const ImgRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`
export const ImgPathInput = styled.input`
  ${inputBase}
  flex: 1; height: 38px; padding: 0 11px; font-size: 12px;
`
export const ImgPickBtn = styled.button`
  flex-shrink: 0;
  width: 38px; height: 38px; border-radius: 9px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.55); cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
  svg { font-size: 18px; }
  &:hover { background: rgba(30,133,255,.12); border-color: rgba(30,133,255,.28); color: #93c5fd; }
  &:disabled { opacity: .35; cursor: default; }
`
export const ImgPreview = styled.div`
  margin-top: 6px; border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(255,255,255,.08);
  img { width: 100%; max-height: 100px; object-fit: cover; display: block; }
`
export const UploadSpinner = styled.div`
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.15);
  border-top-color: #6eb6ff; border-radius: 50%;
  animation: ${spin} .7s linear infinite; flex-shrink: 0;
`
export const UploadErr = styled.p`
  font-size: 11.5px; color: #f87171; margin-top: 4px;
`

/* ── audience tabs ── */
export const AudienceRow = styled.div`
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
`
export const AudienceLabel = styled.span`
  font-size: 10px; font-weight: 700; letter-spacing: .09em;
  text-transform: uppercase; color: rgba(255,255,255,.30);
  flex-shrink: 0; margin-right: 4px;
`
export const AudienceBtn = styled.button`
  padding: 5px 13px; border-radius: 7px; font-size: 12px; font-weight: 600;
  font-family: inherit; cursor: pointer; transition: all .15s;
  border: 1px solid ${({ $active }) => $active ? 'rgba(99,102,241,.55)' : 'rgba(255,255,255,.10)'};
  background: ${({ $active }) => $active ? 'rgba(99,102,241,.18)' : 'transparent'};
  color: ${({ $active }) => $active ? '#a5b4fc' : 'rgba(255,255,255,.40)'};
  &:hover { background: rgba(99,102,241,.10); color: rgba(255,255,255,.72); }
`

/* ── schedule row ── */
export const ScheduleToggle = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07);
`
export const ScheduleToggleLeft = styled.div``
export const ScheduleToggleTitle = styled.p`font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,.78);`
export const ScheduleToggleSub = styled.p`font-size: 10.5px; color: rgba(255,255,255,.28); margin-top: 1px;`
export const Toggle = styled.button`
  width: 40px; height: 22px; border-radius: 11px; border: none; flex-shrink: 0;
  cursor: pointer; position: relative; transition: background .26s;
  background: ${({ $on }) => $on
    ? 'linear-gradient(90deg,rgba(30,133,255,.7),rgba(13,79,232,.7))'
    : 'rgba(255,255,255,.10)'};
`
export const ToggleThumb = styled.span`
  position: absolute; top: 2px;
  left: ${({ $on }) => $on ? '20px' : '2px'};
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  transition: left .24s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 1px 4px rgba(0,0,0,.28);
`
export const ScheduleFields = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  animation: ${fadeUp} .18s ease both;
`

/* ── send button ── */
export const SendBtn = styled.button`
  width: 100%; height: 44px; border-radius: 12px;
  background: ${({ $disabled }) => $disabled ? 'rgba(255,255,255,.06)' : gradients.btn};
  border: none; color: ${({ $disabled }) => $disabled ? 'rgba(255,255,255,.28)' : '#fff'};
  font-size: 14px; font-weight: 700; font-family: inherit; cursor: ${({ $disabled }) => $disabled ? 'default' : 'pointer'};
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: ${({ $disabled }) => $disabled ? 'none' : '0 4px 20px rgba(13,79,232,.36)'};
  transition: opacity .18s, transform .15s;
  &:hover:not(:disabled) { opacity: .86; }
  &:active:not(:disabled) { transform: scale(.98); }
  svg { font-size: 17px; }
`
export const SendBtnSpin = styled.div`
  width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.25);
  border-top-color: #fff; border-radius: 50%;
  animation: ${spin} .7s linear infinite;
`

/* ── templates section ── */
export const TemplatesSection = styled.div`
  animation: ${fadeUp} .28s ease both;
`
export const TemplatesSectionHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; gap: 12px;
`
export const TemplatesSectionTitle = styled.h2`
  font-size: 14px; font-weight: 800; color: rgba(255,255,255,.88);
  letter-spacing: -.01em; margin: 0;
  display: flex; align-items: center; gap: 8px;
`
export const TemplatesSectionSub = styled.p`
  font-size: 11.5px; color: rgba(255,255,255,.28); margin-top: 1px;
`
export const NewTplBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 9px;
  background: rgba(99,102,241,.10); border: 1px solid rgba(99,102,241,.28);
  color: #a5b4fc; font-size: 12.5px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all .15s; white-space: nowrap; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(99,102,241,.18); border-color: rgba(99,102,241,.48); }
`

/* ── template grid ── */
export const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

/* ── template card ── */
const CARD_ACCENT_COLORS = [
  { border: 'rgba(99,102,241,.28)', glow: 'rgba(99,102,241,.08)', name: '#a5b4fc' },
  { border: 'rgba(245,158,11,.28)', glow: 'rgba(245,158,11,.08)', name: '#fcd34d' },
  { border: 'rgba(236,72,153,.28)', glow: 'rgba(236,72,153,.08)', name: '#f9a8d4' },
  { border: 'rgba(16,185,129,.28)', glow: 'rgba(16,185,129,.08)', name: '#6ee7b7' },
  { border: 'rgba(239,68,68,.28)',  glow: 'rgba(239,68,68,.08)',  name: '#fca5a5' },
  { border: 'rgba(56,189,248,.28)', glow: 'rgba(56,189,248,.08)', name: '#7dd3fc' },
]
export const getCardAccent = (idx) => CARD_ACCENT_COLORS[idx % CARD_ACCENT_COLORS.length]

export const TemplateCard = styled.div`
  background: rgba(255,255,255,.025);
  border: 1px solid ${({ $accent }) => $accent?.border || 'rgba(255,255,255,.08)'};
  border-radius: 14px; padding: 14px;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color .18s, background .18s, transform .15s;
  animation: ${fadeUp} .2s ease both;
  ${({ $delay }) => $delay && css`animation-delay: ${$delay};`}
  &:hover {
    background: ${({ $accent }) => $accent?.glow || 'rgba(255,255,255,.04)'};
    transform: translateY(-1px);
  }
`
export const CardName = styled.div`
  font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
  color: ${({ $color }) => $color || '#a5b4fc'};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const CardTitle = styled.div`
  font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.80);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const CardBody = styled.div`
  font-size: 11.5px; color: rgba(255,255,255,.38); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`
export const CardImg = styled.div`
  border-radius: 7px; overflow: hidden; max-height: 60px;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`
export const CardCta = styled.div`
  font-size: 10.5px; color: rgba(255,255,255,.28);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const CardDivider = styled.div`
  height: 1px; background: rgba(255,255,255,.06); margin: 0 -2px;
`
export const CardActions = styled.div`
  display: flex; align-items: center; gap: 5px; padding-top: 2px;
`
export const UseBtn = styled.button`
  flex: 1; height: 28px; border-radius: 7px;
  background: rgba(99,102,241,.14); border: 1px solid rgba(99,102,241,.32);
  color: #a5b4fc; font-size: 11.5px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all .15s;
  &:hover { background: rgba(99,102,241,.22); border-color: rgba(99,102,241,.5); }
`
export const IconBtn = styled.button`
  width: 28px; height: 28px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s; flex-shrink: 0;
  svg { font-size: 14px; }
  ${({ $v }) => $v === 'danger' ? css`
    background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.22); color: #fca5a5;
    &:hover { background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.4); }
  ` : css`
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10); color: rgba(255,255,255,.48);
    &:hover { background: rgba(30,133,255,.12); border-color: rgba(30,133,255,.28); color: #93c5fd; }
  `}
`

/* ── empty state ── */
export const EmptyState = styled.div`
  padding: 40px 20px; border-radius: 18px;
  background: rgba(255,255,255,.02); border: 1px dashed rgba(255,255,255,.08);
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  text-align: center; animation: ${fadeUp} .28s ease both;
`
export const EmptyIcon = styled.div`
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,.10); border: 1px solid rgba(99,102,241,.22);
  svg { font-size: 28px; color: #a5b4fc; }
`
export const EmptyTitle = styled.p`font-size: 15px; font-weight: 700; color: rgba(255,255,255,.70);`
export const EmptySub = styled.p`font-size: 13px; color: rgba(255,255,255,.28); line-height: 1.5;`
export const EmptyBtns = styled.div`display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;`
export const EmptySeedBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 10px 20px; border-radius: 10px;
  background: ${gradients.btn}; border: none; color: #fff;
  font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
  box-shadow: 0 4px 16px rgba(13,79,232,.30);
  transition: opacity .18s;
  &:hover { opacity: .84; }
  &:disabled { opacity: .4; cursor: default; }
`
export const EmptyNewBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 10px 20px; border-radius: 10px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.65); font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: all .15s;
  &:hover { background: rgba(255,255,255,.10); color: #fff; }
`

/* ── template preview cards (empty state) ── */
export const SeedPreviewGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px; width: 100%; max-width: 700px;
`
export const SeedPreviewCard = styled.div`
  padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07);
  text-align: left;
`
export const SeedCardName = styled.div`
  font-size: 11px; font-weight: 800; color: ${({ $cl }) => $cl || '#a5b4fc'};
  text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`
export const SeedCardBody = styled.div`
  font-size: 10.5px; color: rgba(255,255,255,.35); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`

/* ════════════════ TEMPLATE DIALOG ════════════════ */
export const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 400;
  background: rgba(0,0,0,.88);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  animation: ${fadeUp} .18s ease both;
`
export const DialogCard = styled.div`
  width: 100%; max-width: 620px;
  max-height: calc(var(--app-height, 100dvh) - 32px);
  background: #0d0d22;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 22px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 36px 80px rgba(0,0,0,.80), 0 0 0 1px rgba(255,255,255,.03);
  animation: ${slideUp} .26s cubic-bezier(.16,1,.3,1) both;
`
export const DialogHead = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06); flex-shrink: 0;
`
export const DialogIconBadge = styled.div`
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.26);
  svg { font-size: 19px; color: #fcd34d; }
`
export const DialogHeadText = styled.div`flex: 1; min-width: 0;`
export const DialogTitle = styled.h2`
  font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -.01em;
`
export const DialogSub = styled.p`font-size: 11.5px; color: rgba(255,255,255,.30); margin-top: 1px;`
export const DialogClose = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09);
  color: rgba(255,255,255,.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s; flex-shrink: 0;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,.11); color: rgba(255,255,255,.88); }
`
export const DialogBody = styled.div`
  flex: 1; overflow-y: auto; padding: 20px 22px 10px;
  display: flex; flex-direction: column; gap: 14px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }
`
export const DialogFoot = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 9px;
  padding: 14px 22px; border-top: 1px solid rgba(255,255,255,.06); flex-shrink: 0;
`
export const CancelBtn = styled.button`
  padding: 9px 18px; border-radius: 10px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09);
  color: rgba(255,255,255,.55); font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: opacity .15s;
  &:hover { opacity: .80; }
`
export const SaveTplBtn = styled.button`
  display: flex; align-items: center; gap: 7px;
  padding: 9px 22px; border-radius: 10px;
  background: ${({ $saving }) => $saving ? 'rgba(99,102,241,.30)' : gradients.btn};
  border: none; color: #fff;
  font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
  box-shadow: ${({ $saving }) => $saving ? 'none' : '0 4px 16px rgba(13,79,232,.32)'};
  transition: opacity .18s;
  &:hover:not(:disabled) { opacity: .86; }
  &:disabled { opacity: .42; cursor: default; }
  svg { font-size: 16px; }
`

/* ── dialog form fields ── */
export const DlgFieldRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 500px) { grid-template-columns: 1fr; }
`
export const DlgField = styled.div`
  display: flex; flex-direction: column; gap: 5px;
`
export const DlgLabel = styled.label`
  font-size: 10px; font-weight: 700; letter-spacing: .10em;
  text-transform: uppercase; color: rgba(255,255,255,.28);
  display: flex; align-items: center; gap: 5px;
`
export const DlgRequired = styled.span`color: #f87171; font-size: 11px;`
export const DlgInput = styled.input`
  ${inputBase}
  height: 40px; padding: 0 12px;
`
export const DlgTextarea = styled.textarea`
  ${inputBase}
  padding: 10px 12px; min-height: 80px; resize: vertical; line-height: 1.5;
`
export const DlgSelect = styled.select`
  ${inputBase}
  height: 40px; padding: 0 30px 0 12px; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  option { background: #0d0d22; color: #fff; }
`

/* ── design picker ── */
export const DesignPickerWrap = styled.div`
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
`
export const DesignOption = styled.button`
  padding: 10px 6px; border-radius: 10px; cursor: pointer; transition: all .18s;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  border: 2px solid ${({ $active, $accent }) => $active ? $accent : 'rgba(255,255,255,.08)'};
  background: ${({ $active, $bg }) => $active ? `${$bg}cc` : 'rgba(255,255,255,.03)'};
  &:hover { border-color: ${({ $accent }) => $accent}; background: ${({ $bg }) => $bg}88; }
`
export const DesignOptionSwatch = styled.div`
  width: 36px; height: 36px; border-radius: 9px;
  background: ${({ $bg }) => $bg};
  border: 1.5px solid ${({ $accent }) => $accent};
  box-shadow: 0 0 12px ${({ $accent }) => $accent}66;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px;
`
export const DesignOptionLabel = styled.span`
  font-size: 11px; font-weight: 700; color: ${({ $active, $accent }) => $active ? $accent : 'rgba(255,255,255,.40)'};
  white-space: nowrap;
`
export const DesignOptionDesc = styled.span`
  font-size: 9.5px; color: rgba(255,255,255,.25); white-space: nowrap;
`

/* ── Spinner / Empty ── */
export const Spinner = styled.div`
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.15);
  border-top-color: #a5b4fc; border-radius: 50%;
  animation: ${spin} .7s linear infinite; flex-shrink: 0;
`
export const LoadingWrap = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 200px; gap: 10px;
  color: rgba(255,255,255,.28); font-size: 13px;
`

/* ── status badge ── */
export const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 700;
  ${({ $s }) => $s === 'enviada' ? css`
    background: rgba(34,197,94,.12); color: #4ade80; border: 1px solid rgba(34,197,94,.22);
  ` : $s === 'programada' ? css`
    background: rgba(14,165,233,.12); color: #38bdf8; border: 1px solid rgba(14,165,233,.22);
  ` : css`
    background: rgba(255,255,255,.06); color: rgba(255,255,255,.38); border: 1px solid rgba(255,255,255,.09);
  `}
  &::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
`

/* ── success toast ── */
export const SendSuccess = styled.div`
  display: flex; align-items: center; gap: 9px;
  padding: 10px 13px; border-radius: 10px;
  background: rgba(34,197,94,.10); border: 1px solid rgba(34,197,94,.22);
  font-size: 12.5px; color: #4ade80; font-weight: 600;
  animation: ${fadeUp} .2s ease both;
  svg { font-size: 16px; }
`
export const SendError = styled.div`
  font-size: 11.5px; color: #f87171; padding: 2px 0;
`