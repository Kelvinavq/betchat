import styled, { css, keyframes } from 'styled-components'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`
const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
`
const checkPop = keyframes`
  0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(4deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`

/* ─────────────────────────────
   Wrapper
───────────────────────────── */
export const ThemesWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

/* ─────────────────────────────
   Sub-tab bar  (Cliente / Admin)
───────────────────────────── */
export const SubTabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  padding: 4px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 13px;
  width: fit-content;
`

export const SubTab = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 16px;
  border-radius: 9px;
  border: none;
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;

  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.14)' : 'transparent'};
  color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.38)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.28)' : 'transparent'};

  svg { font-size: 16px; }

  &:hover:not([disabled]) {
    background: ${({ $active }) => $active ? 'rgba(30,133,255,0.18)' : 'rgba(255,255,255,0.05)'};
    color: ${({ $active }) => $active ? '#60a5fa' : 'rgba(255,255,255,0.65)'};
  }
`

/* ─────────────────────────────
   Section info banner
───────────────────────────── */
export const SectionBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  background: rgba(30,133,255,0.06);
  border: 1px solid rgba(30,133,255,0.13);
  border-radius: 11px;
  margin-bottom: 18px;
  font-size: 12px;
  color: rgba(255,255,255,0.40);
  line-height: 1.55;
  animation: ${fadeUp} 0.2s ease;

  svg { font-size: 16px; color: rgba(30,133,255,0.60); flex-shrink: 0; margin-top: 1px; }
`

/* ─────────────────────────────
   Theme grid (client)
───────────────────────────── */
export const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  animation: ${fadeUp} 0.22s ease;

  @media (max-width: 800px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 500px) { grid-template-columns: 1fr; }
`

export const ThemeCard = styled.div`
  border-radius: 16px;
  border: 2px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.55)' : 'rgba(255,255,255,0.07)'};
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.06)' : 'rgba(255,255,255,0.025)'};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
  animation: ${scaleIn} 0.22s ease both;
  animation-delay: ${({ $i }) => Math.min($i * 35, 180)}ms;

  &:hover {
    border-color: ${({ $active }) => $active ? 'rgba(30,133,255,0.65)' : 'rgba(255,255,255,0.18)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.30);
  }
  &:active { transform: translateY(0); }
`

export const ThemeCardPreview = styled.div`
  height: 170px;
  position: relative;
  overflow: hidden;
`

export const CheckOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.40);
  animation: ${checkPop} 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  svg { font-size: 14px; color: #fff; }
`

export const ThemeCardInfo = styled.div`
  padding: 11px 13px 13px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

export const ThemeNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

export const ThemeName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.88);
`

export const ActiveBadge = styled.span`
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(30,133,255,0.16);
  color: #60a5fa;
  border: 1px solid rgba(30,133,255,0.28);
`

export const WhatsAppBadge = styled.span`
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(37,211,102,0.14);
  color: #25d366;
  border: 1px solid rgba(37,211,102,0.28);
`

export const ThemeDesc = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,0.28);
  line-height: 1.4;
`

/* ─────────────────────────────
   Mini chat preview  (client)
───────────────────────────── */
export const MiniPhone = styled.div`
  width: 100%;
  height: 170px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const MiniHeader = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  flex-shrink: 0;
`

export const MiniAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
`

export const MiniHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

export const MiniBar = styled.div`
  border-radius: 3px;
`

export const MiniHeaderIcons = styled.div`
  margin-left: auto;
  display: flex;
  gap: 5px;
`

export const MiniHeaderIcon = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  opacity: 0.35;
`

export const MiniBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  overflow: hidden;
  position: relative;
`

export const MiniBubble = styled.div`
  padding: 5px 8px;
  border-radius: ${({ $sent }) => $sent ? '10px 2px 10px 10px' : '2px 10px 10px 10px'};
  align-self: ${({ $sent }) => $sent ? 'flex-end' : 'flex-start'};
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

export const MiniLine = styled.div`
  border-radius: 3px;
`

export const MiniInputBar = styled.div`
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  flex-shrink: 0;
`

export const MiniInputField = styled.div`
  flex: 1;
  height: 18px;
  border-radius: 9px;
  opacity: 0.5;
`

export const MiniSendBtn = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
`

/* ─────────────────────────────
   Admin themes grid
───────────────────────────── */
export const AdminThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  animation: ${fadeUp} 0.22s ease;

  @media (max-width: 800px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 500px) { grid-template-columns: 1fr; }
`

/* ─────────────────────────────
   Mini admin preview
───────────────────────────── */
export const MiniAdminLayout = styled.div`
  width: 100%;
  height: 130px;
  display: flex;
  overflow: hidden;
`

export const MiniAdminSidebar = styled.div`
  width: 32px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 8px 0;
`

export const MiniSidebarDot = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  opacity: ${({ $active }) => $active ? 1 : 0.3};
`

export const MiniSidebarLine = styled.div`
  width: 12px;
  height: 4px;
  border-radius: 3px;
  opacity: 0.25;
`

export const MiniAdminContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const MiniAdminTopbar = styled.div`
  height: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  flex-shrink: 0;
`

export const MiniAdminBody = styled.div`
  flex: 1;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const MiniAdminCard = styled.div`
  height: 18px;
  border-radius: 5px;
  opacity: 0.7;
`

export const MiniAdminGrid = styled.div`
  display: flex;
  gap: 4px;
`

export const MiniAdminGridCard = styled.div`
  flex: 1;
  height: 28px;
  border-radius: 5px;
  opacity: 0.6;
`

/* Color swatches shown in admin card info */
export const ColorSwatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
`

export const ColorSwatch = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 1.5px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
`

export const SwatchLabel = styled.span`
  font-size: 10.5px;
  color: rgba(255,255,255,0.24);
`

/* ─────────────────────────────
   Save footer
───────────────────────────── */
export const SaveBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
  margin-top: 20px;
  flex-wrap: wrap;
`

export const SaveHint = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.22);
  margin: 0;
  line-height: 1.5;
`

export const ApplyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 12px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.22s;
  white-space: nowrap;
  flex-shrink: 0;

  ${({ $saved }) => $saved ? css`
    background: rgba(34,197,94,0.14);
    border: 1px solid rgba(34,197,94,0.28);
    color: #4ade80;
    pointer-events: none;
  ` : css`
    background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
    color: #fff;
    box-shadow: 0 4px 18px rgba(13,79,232,0.32);
    &:hover { opacity: 0.86; }
    &:active { transform: scale(0.97); }
  `}
  svg { font-size: 16px; }
`

/* ─────────────────────────────
   WhatsApp pattern  (CSS-only)
───────────────────────────── */
export const WA_BG_STYLE = {
  backgroundColor: '#e5ddd5',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5ddd5'/%3E%3Ccircle cx='10' cy='10' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='40' cy='10' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='70' cy='10' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='25' cy='28' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='55' cy='28' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='10' cy='46' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='40' cy='46' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='70' cy='46' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='25' cy='64' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Ccircle cx='55' cy='64' r='3.5' fill='none' stroke='%23b2a99a' stroke-width='0.9' opacity='0.55'/%3E%3Cpath d='M6 18 Q10 13 14 18 Q10 23 6 18z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M36 18 Q40 13 44 18 Q40 23 36 18z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M66 18 Q70 13 74 18 Q70 23 66 18z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M21 36 Q25 31 29 36 Q25 41 21 36z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M51 36 Q55 31 59 36 Q55 41 51 36z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M6 54 Q10 49 14 54 Q10 59 6 54z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M36 54 Q40 49 44 54 Q40 59 36 54z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3Cpath d='M66 54 Q70 49 74 54 Q70 59 66 54z' fill='none' stroke='%23b2a99a' stroke-width='0.8' opacity='0.40'/%3E%3C/svg%3E")`,
}
