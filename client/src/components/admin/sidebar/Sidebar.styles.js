import styled from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const W_COLLAPSED = '56px'
const W_EXPANDED  = '240px'

export const SidebarWrap = styled.aside`
  width: ${({ $expanded }) => $expanded ? W_EXPANDED : W_COLLAPSED};
  min-width: ${({ $expanded }) => $expanded ? W_EXPANDED : W_COLLAPSED};
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-sidebar-bg, #060610);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              min-width 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  flex-shrink: 0;
  z-index: 10;
`

/* ── header ── */
export const SidebarTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px 10px;
  flex-shrink: 0;
  min-height: 58px;
  gap: 6px;
`

export const LogoWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  flex-shrink: 0;
  opacity: ${({ $expanded }) => $expanded ? 1 : 0};
  width:   ${({ $expanded }) => $expanded ? '150px' : '0'};
  transition: opacity 0.2s, width 0.2s;
`

export const LogoBadge = styled.div`
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 9px;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const LogoText = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  white-space: nowrap;
`

export const ToggleBtn = styled.button`
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 18px; }
  &:hover {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.09);
  }
`

/* ── section label ── */
export const NavSection = styled.div`
  padding: ${({ $first }) => $first ? '14px 12px 4px' : '10px 12px 4px'};
  flex-shrink: 0;
  overflow: hidden;
`

export const SectionLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.20);
  white-space: nowrap;
  display: block;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.18s;
`

/* ── nav list ── */
export const NavList = styled.ul`
  list-style: none;
  padding: 2px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const NavItem = styled.li`
  position: relative;
`

/* tooltip shown in collapsed state on hover */
export const NavTooltip = styled.span`
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  background: rgba(10, 10, 22, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.90);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.14s;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.60);

  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: rgba(255, 255, 255, 0.10);
  }
`

export const NavBtn = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  background: ${({ $active, $expanded }) =>
    $active
      ? ($expanded ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)')
      : 'none'};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: ${({ $active }) => $active ? '#ffffff' : 'rgba(255, 255, 255, 0.38)'};
  transition: color 0.18s, background 0.18s;
  overflow: visible;
  font-family: inherit;

  &:hover {
    color: rgba(255, 255, 255, 0.88);
    background: rgba(255, 255, 255, 0.05);
    ${NavTooltip} { opacity: 1; }
  }
`

export const NavIcon = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  svg { font-size: 19px; }
`

export const NavLabel = styled.span`
  font-size: 13.5px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  white-space: nowrap;
  flex: 1;
  text-align: left;
  overflow: hidden;
  font-family: inherit;
`

export const NavArrow = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transform: rotate(${({ $open }) => $open ? '90deg' : '0deg'});
  transition: transform 0.22s ease;
  color: rgba(255, 255, 255, 0.22);
  svg { font-size: 15px; }
`

export const SubList = styled.ul`
  list-style: none;
  padding: ${({ $open }) => $open ? '2px 0 4px 33px' : '0 0 0 33px'};
  overflow: hidden;
  max-height: ${({ $open }) => $open ? '200px' : '0'};
  transition: max-height 0.26s ease, padding 0.26s ease;
`

export const SubBtn = styled.button`
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  border-left: 1.5px solid ${({ $active, $expanded }) =>
    $active && $expanded ? colors.primaryLight : 'rgba(255,255,255,0.08)'};
  color: ${({ $active }) => $active ? colors.primaryLighter : 'rgba(255, 255, 255, 0.32)'};
  font-size: 12.5px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  text-align: left;
  cursor: pointer;
  transition: color 0.18s, border-color 0.18s;
  white-space: nowrap;
  display: block;
  font-family: inherit;
  &:hover {
    color: rgba(255, 255, 255, 0.75);
    border-left-color: rgba(255, 255, 255, 0.22);
  }
`

/* ── scrollable nav area ── */
export const NavScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.10) transparent;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.10);
    border-radius: 3px;
    transition: background 0.2s;
  }
  &:hover::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.22);
  }
`

/* ── spacer ── */
export const SidebarSpacer = styled.div`
  flex: 1;
  min-height: 12px;
`

/* ── bottom: user + logout ── */
export const SidebarBottom = styled.div`
  padding: 10px 8px 16px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`

/* expanded: pill with avatar + name + logout icon */
export const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 7px 6px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  width: 100%;
  overflow: hidden;
  opacity: ${({ $expanded }) => $expanded ? 1 : 0};
  pointer-events: ${({ $expanded }) => $expanded ? 'auto' : 'none'};
  max-width: ${({ $expanded }) => $expanded ? '224px' : '0'};
  transition: opacity 0.2s, max-width 0.25s;
`

export const UserAvatarWrap = styled.div`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(30,133,255,0.28), rgba(30,133,255,0.14));
  border: 1px solid rgba(30,133,255,0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: rgba(100,180,255,0.90);
  flex-shrink: 0;
  letter-spacing: 0.02em;
`

export const UserMeta = styled.div`
  flex: 1;
  overflow: hidden;
  min-width: 0;
`

export const UserName = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const UserRole = styled.span`
  display: block;
  font-size: 10.5px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.30);
  white-space: nowrap;
`

export const LogoutBtn = styled.button`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.26);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.18s, background 0.18s, border-color 0.18s;
  svg { font-size: 16px; }
  &:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239, 68, 68, 0.10);
    border-color: rgba(239, 68, 68, 0.18);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

/* collapsed: icon-only button (same pattern as ToggleBtn) */
export const LogoutIconBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: ${({ $expanded }) => $expanded ? 0 : 1};
  pointer-events: ${({ $expanded }) => $expanded ? 'none' : 'auto'};
  position: ${({ $expanded }) => $expanded ? 'absolute' : 'static'};
  transition: opacity 0.2s, color 0.18s, background 0.18s;
  overflow: visible;
  svg { font-size: 18px; }
  &:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239, 68, 68, 0.10);
    border-color: rgba(239, 68, 68, 0.18);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`
