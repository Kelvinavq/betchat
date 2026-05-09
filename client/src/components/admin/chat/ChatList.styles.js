import styled from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

export const Wrap = styled.div`
  width: ${({ $width, $fullWidth }) => $fullWidth ? '100%' : $width ? `${$width}px` : '320px'};
  min-width: ${({ $width, $fullWidth }) => $fullWidth ? 0 : $width ? `${$width}px` : '320px'};
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-sidebar-bg, #0a0a16);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
`

/* ── header ── */
export const ListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 10px;
  flex-shrink: 0;
`

export const ListTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
`

export const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.40);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 18px; }
  &:hover { color: rgba(255, 255, 255, 0.80); background: rgba(255, 255, 255, 0.06); }
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: rgba(12, 12, 26, 0.98);
  border: 1px solid rgba(40, 140, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.60);
  overflow: clip;
  z-index: 50;
`

export const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  svg { font-size: 16px; color: rgba(255, 255, 255, 0.40); }
  &:hover { background: rgba(255, 255, 255, 0.06); color: #ffffff; }
`

export const DropdownSection = styled.div`
  padding: 8px 8px 10px;
  border-top: 1px solid rgba(255,255,255,0.07);
  max-height: 220px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
`

export const DropdownLabel = styled.div`
  padding: 2px 6px 7px;
  color: rgba(255,255,255,0.30);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const LabelFilterBtn = styled.button`
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid ${({ $active, $color }) => $active ? `${$color || '#60a5fa'}66` : 'transparent'};
  background: ${({ $active, $color }) => $active ? `${$color || '#60a5fa'}18` : 'transparent'};
  color: ${({ $active, $color }) => $active ? ($color || '#60a5fa') : 'rgba(255,255,255,0.62)'};
  font-family: inherit;
  font-size: 12px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ $color }) => `${$color || '#60a5fa'}14`};
    color: ${({ $color }) => $color || '#60a5fa'};
  }
`

export const LabelFilterDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color || '#60a5fa'};
  box-shadow: 0 0 12px ${({ $color }) => $color || '#60a5fa'};
  flex-shrink: 0;
`

export const QuickMenu = styled.div`
  position: fixed;
  left: ${({ $x }) => `${$x}px`};
  top: ${({ $y }) => `${$y}px`};
  min-width: 190px;
  padding: 6px;
  background: rgba(12, 12, 26, 0.98);
  border: 1px solid rgba(40, 140, 255, 0.18);
  border-radius: 12px;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.55);
  z-index: 80;
`

export const QuickMenuItem = styled.button`
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: none;
  color: rgba(255,255,255,0.74);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  svg { font-size: 17px; color: rgba(255,255,255,0.42); }

  &:hover {
    background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.12);
    color: #ffffff;
  }

  ${({ $danger }) => $danger && `
    color: rgba(239,68,68,0.82);
    svg { color: rgba(239,68,68,0.6); }
    &:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
  `}
`

/* ── search ── */
export const SearchWrap = styled.div`
  padding: 4px 12px 10px;
  flex-shrink: 0;
  position: relative;
`

export const SearchIcon = styled.span`
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  svg { font-size: 16px; }
`

export const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.22); }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.40); }
`

export const FilterToggleRow = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 4px 14px 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ $open }) => $open ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.32)'};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  transition: color 0.15s;
  svg { font-size: 15px; flex-shrink: 0; }
  &:hover { color: rgba(255,255,255,0.72); }
`

export const FilterActiveChip = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(30,133,255,0.16);
  border: 1px solid rgba(30,133,255,0.28);
  color: #60a5fa;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
`

export const ProcessFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
  flex-shrink: 0;
`

export const ProcessChip = styled.button`
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.08)'};
  background: ${({ $active, $bg }) => $active ? $bg : 'rgba(255,255,255,0.045)'};
  color: ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.50)'};
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.14s;

  &:hover {
    color: ${({ $color }) => $color};
    border-color: ${({ $color }) => $color};
    background: ${({ $bg }) => $bg};
  }

  &:active { transform: scale(0.98); }
`

export const ProcessDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 14px ${({ $color }) => $color};
`

/* ── list ── */
export const ListScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
`

export const ChatItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.10)' : 'none'};
  border: none;
  border-left: 2px solid ${({ $active }) => $active ? colors.primaryLight : 'transparent'};
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  &:hover { background: rgba(255, 255, 255, 0.04); }
`

/* avatar */
export const ChatAvatar = styled.div`
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
  border: 1px solid rgba(40, 140, 255, 0.28);
`

export const OnlineDot = styled.span`
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.20)'};
  border: 1.5px solid var(--bc-admin-sidebar-bg, #0a0a16);
`

/* item body */
export const ChatBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

export const ChatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

export const ChatUsername = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ChatTime = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.30);
  flex-shrink: 0;
`

export const ChatLastMsg = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.38);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const AssignedPill = styled.span`
  max-width: 128px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ $own }) => $own ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'};
  border: 1px solid ${({ $own }) => $own ? 'rgba(34,197,94,0.26)' : 'rgba(245,158,11,0.26)'};
  color: ${({ $own }) => $own ? '#86efac' : '#facc15'};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
`

export const TagEl = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  white-space: nowrap;
`

export const TAG_CONFIG = {
  carga_saldo: { label: 'Carga saldo', bg: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: 'rgba(245,158,11,0.28)' },
  retiro:      { label: 'Retiro',      bg: 'rgba(239,68,68,0.14)',  color: '#ef4444', border: 'rgba(239,68,68,0.28)'  },
  soporte:     { label: 'Soporte',     bg: 'rgba(59,130,246,0.14)', color: '#60a5fa', border: 'rgba(59,130,246,0.28)' },
  cuponera:    { label: 'Cuponera',    bg: 'rgba(139,92,246,0.14)', color: '#a78bfa', border: 'rgba(139,92,246,0.28)' },
}

export const UnreadBadge = styled.span`
  background: ${gradients.btn};
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  flex-shrink: 0;
`

/* ── load more ── */
export const LoadMoreBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: calc(100% - 24px);
  margin: 8px 12px 12px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
  &:hover { background: rgba(255, 255, 255, 0.09); color: rgba(255, 255, 255, 0.80); }
  &:disabled { opacity: 0.45; cursor: default; }
`

export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.22);
`
