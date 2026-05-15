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

/* ── spacer ── */
export const SidebarSpacer = styled.div`
  flex: 1;
  min-height: 12px;
`

/* ── bottom: theme toggle ── */
export const SidebarBottom = styled.div`
  padding: 12px 8px 18px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
`

export const ThemeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: hidden;
  white-space: nowrap;
  opacity: ${({ $expanded }) => $expanded ? 1 : 0};
  pointer-events: ${({ $expanded }) => $expanded ? 'auto' : 'none'};
  transition: opacity 0.2s;
`

export const ThemeIcon = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  line-height: 1;
`

export const ThemePill = styled.button`
  width: 44px;
  height: 25px;
  border-radius: 13px;
  border: none;
  cursor: pointer;
  position: relative;
  background: ${({ $dark }) => $dark
    ? 'linear-gradient(90deg, rgba(30,133,255,0.55) 0%, rgba(30,133,255,0.38) 100%)'
    : 'rgba(255, 255, 255, 0.12)'};
  transition: background 0.3s;
  flex-shrink: 0;
`

export const ThemeThumb = styled.span`
  position: absolute;
  top: 3.5px;
  left: ${({ $dark }) => $dark ? '22px' : '3.5px'};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: block;
  box-shadow: 0 1px 4px rgba(0,0,0,0.35);
`

/* collapsed-state theme icon button */
export const ThemeIconBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  font-size: 16px;
  line-height: 1;
  opacity: ${({ $expanded }) => $expanded ? 0 : 1};
  pointer-events: ${({ $expanded }) => $expanded ? 'none' : 'auto'};
  position: ${({ $expanded }) => $expanded ? 'absolute' : 'static'};
  transition: opacity 0.2s;
  &:hover {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.09);
  }
`
