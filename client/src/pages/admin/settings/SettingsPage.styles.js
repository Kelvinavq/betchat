import styled, { css, keyframes } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
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

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 28px 0;
  flex-shrink: 0;
  @media (max-width: 600px) { padding: 18px 16px 0; }
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

export const TitleBlock = styled.div`flex: 1;`

export const PageTitle = styled.h1`
  font-size: 21px; font-weight: 700;
  color: #ffffff; letter-spacing: -0.02em;
`

export const PageSub = styled.p`
  font-size: 13px; color: rgba(255,255,255,0.32); margin-top: 3px;
`

/* ── body: left nav + content ── */
export const Body = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  margin-top: 24px;
  @media (max-width: 768px) { flex-direction: column; margin-top: 16px; }
`

/* ── settings left nav ── */
export const SettingsNav = styled.nav`
  width: 216px;
  min-width: 216px;
  padding: 0 10px 24px;
  border-right: 1px solid rgba(255,255,255,0.05);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    flex-direction: row;
    padding: 0 14px 0;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    overflow-x: auto;
    gap: 2px;
    padding-bottom: 10px;
    &::-webkit-scrollbar { display: none; }
  }
`

export const NavGroupLabel = styled.p`
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,255,255,0.18);
  padding: 16px 10px 6px; white-space: nowrap;
  @media (max-width: 768px) { display: none; }
`

export const NavBtn = styled.button`
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 11px;
  border-radius: 11px; border: none; font-family: inherit;
  cursor: ${({ $soon }) => $soon ? 'default' : 'pointer'};
  text-align: left; transition: background 0.18s, color 0.18s;
  position: relative; overflow: hidden;

  background: ${({ $active, $soon }) =>
    $active && !$soon ? 'rgba(30,133,255,0.12)' : 'transparent'};
  color: ${({ $active, $soon }) => {
    if ($soon) return 'rgba(255,255,255,0.22)'
    if ($active) return '#ffffff'
    return 'rgba(255,255,255,0.50)'
  }};

  ${({ $soon, $active }) => !$soon && !$active && css`
    &:hover {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.80);
    }
  `}

  @media (max-width: 768px) {
    width: auto; white-space: nowrap; flex-shrink: 0;
    padding: 8px 14px; border-radius: 9px;
  }
`

export const ActiveBar = styled.span`
  position: absolute; left: 0; top: 22%; bottom: 22%;
  width: 3px; border-radius: 0 2px 2px 0;
  background: ${colors.primaryLighter};
  @media (max-width: 768px) { display: none; }
`

export const NavIcon = styled.span`
  display: flex; align-items: center; flex-shrink: 0;
  color: ${({ $active }) => $active ? colors.primaryLighter : 'inherit'};
  svg { font-size: 18px; }
  @media (max-width: 768px) { display: none; }
`

export const NavTextWrap = styled.div`
  display: flex; flex-direction: column; min-width: 0;
`

export const NavLabel = styled.span`
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  white-space: nowrap;
`

export const NavSub = styled.span`
  font-size: 11px; color: rgba(255,255,255,0.22);
  margin-top: 1px; white-space: nowrap;
  @media (max-width: 768px) { display: none; }
`

export const SoonPill = styled.span`
  margin-left: auto;
  font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; padding: 2px 7px; border-radius: 4px;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.22);
  white-space: nowrap; flex-shrink: 0;
  @media (max-width: 768px) { display: none; }
`

/* ── content area ── */
export const Content = styled.div`
  flex: 1; overflow-y: auto; min-width: 0;
  padding: 2px 32px 48px;
  animation: ${fadeUp} 0.22s ease both;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @media (max-width: 600px) { padding: 16px 16px 40px; }
`

/* ── section wrapper ── */
export const Section = styled.div`
  display: flex; flex-direction: column; gap: 18px;
  padding-top: 2px;
`

/* ── profile card (top summary) ── */
export const ProfileCard = styled.div`
  display: flex; align-items: center; gap: 18px;
  padding: 20px 22px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  animation: ${fadeUp} 0.22s ease both;
`

export const ProfileAvatar = styled.div`
  width: 64px; height: 64px; min-width: 64px;
  border-radius: 18px; background: ${gradients.btn};
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700; color: #fff;
  border: 2px solid rgba(40,140,255,0.28);
  box-shadow: 0 0 28px rgba(30,133,255,0.16);
  position: relative; overflow: hidden;
`

export const ProfileAvatarImg = styled.img`
  width: 100%; height: 100%; object-fit: cover; display: block;
`

export const ProfileAvatarBtn = styled.button`
  position: absolute; right: -1px; bottom: -1px;
  width: 25px; height: 25px; border-radius: 9px 0 15px 0;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(5,12,30,0.84);
  color: rgba(255,255,255,0.78);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.18s, color 0.18s;
  svg { font-size: 15px; }
  &:hover { background: rgba(30,133,255,0.86); color: #fff; }
`

export const ProfileInfo = styled.div`min-width: 0;`

export const ProfileName = styled.p`
  font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

export const ProfileRole = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.36); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

export const ProfileBadge = styled.span`
  display: inline-flex; align-items: center; margin-top: 8px;
  padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  ${({ $role }) => $role === 'admin' ? css`
    background: rgba(139,92,246,0.14); color: #a78bfa;
    border: 1px solid rgba(139,92,246,0.28);
  ` : css`
    background: rgba(59,130,246,0.14); color: #60a5fa;
    border: 1px solid rgba(59,130,246,0.28);
  `}
`

/* ── generic card ── */
export const Card = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden;
  animation: ${fadeUp} 0.26s ease both;
  animation-delay: ${({ $delay }) => $delay ?? '0ms'};
`

export const CardHead = styled.div`
  display: flex; align-items: center; gap: 14px;
  padding: 18px 22px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`

export const CardIcon = styled.div`
  width: 40px; height: 40px; min-width: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $bg }) => $bg ?? 'rgba(30,133,255,0.12)'};
  border: 1px solid ${({ $br }) => $br ?? 'rgba(30,133,255,0.22)'};
  svg { font-size: 20px; color: ${({ $cl }) => $cl ?? colors.primaryLighter}; }
`

export const CardHeadText = styled.div``

export const CardTitle = styled.p`
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.90);
`

export const CardSub = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.30); margin-top: 2px;
`

export const CardBody = styled.div`
  padding: 22px;
  display: flex; flex-direction: column; gap: 16px;
`

/* ── form fields ── */
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols === 1 ? '1fr' : '1fr 1fr'};
  gap: 14px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`

export const Field = styled.div`
  display: flex; flex-direction: column; gap: 7px;
`

export const FieldLabel = styled.label`
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: rgba(255,255,255,0.30);
`

export const InputWrap = styled.div`
  position: relative; display: flex; align-items: center;
`

export const FieldInput = styled.input`
  width: 100%; height: 42px;
  padding: 0 ${({ $hasRight }) => $hasRight ? '42px' : '14px'} 0 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 11px; color: #fff; font-size: 13.5px; font-family: inherit; outline: none;
  transition: border-color 0.2s, background 0.2s;
  &::placeholder { color: rgba(255,255,255,0.18); }
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.04); }
`

export const InputSuffix = styled.button`
  position: absolute; right: 11px;
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.28); transition: color 0.18s;
  svg { font-size: 17px; }
  &:hover { color: rgba(255,255,255,0.65); }
`

/* ── save footer ── */
export const SaveFooter = styled.div`
  display: flex; align-items: center; justify-content: flex-end;
  gap: 10px; padding-top: 4px;
`

export const SaveBtn = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 22px; border-radius: 12px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.22s;
  ${({ $saved }) => $saved ? css`
    background: rgba(34,197,94,0.14); border: 1px solid rgba(34,197,94,0.28);
    color: #4ade80; pointer-events: none;
  ` : css`
    background: ${gradients.btn}; border: none; color: #fff;
    box-shadow: 0 4px 18px rgba(13,79,232,0.32);
    &:hover { opacity: 0.86; }
    &:active { transform: scale(0.97); }
  `}
  svg { font-size: 17px; }
`

/* ── info banner ── */
export const InfoBanner = styled.div`
  display: flex; align-items: flex-start; gap: 12px;
  padding: 13px 16px;
  background: rgba(30,133,255,0.07); border: 1px solid rgba(30,133,255,0.16);
  border-radius: 13px;
`

export const InfoBannerIcon = styled.span`
  display: flex; align-items: center; flex-shrink: 0; margin-top: 1px;
  color: ${colors.primaryLighter};
  svg { font-size: 18px; }
`

export const InfoBannerText = styled.p`
  font-size: 12.5px; color: rgba(255,255,255,0.50); line-height: 1.55;
`

/* ── montos grid ── */
export const MontosGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  @media (max-width: 580px) { grid-template-columns: 1fr; }
`

export const MontoCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid ${({ $br }) => $br ?? 'rgba(255,255,255,0.07)'};
  border-radius: 18px; overflow: hidden;
  transition: border-color 0.22s;
  animation: ${fadeUp} 0.26s ease both;
  animation-delay: ${({ $delay }) => $delay ?? '0ms'};
  &:focus-within {
    border-color: ${({ $focusBr }) => $focusBr ?? 'rgba(30,133,255,0.28)'};
  }
`

export const MontoHead = styled.div`
  display: flex; align-items: center; gap: 13px;
  padding: 18px 20px 16px;
`

export const MontoIconWrap = styled.div`
  width: 46px; height: 46px; min-width: 46px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $bg }) => $bg}; border: 1px solid ${({ $br }) => $br};
  svg { font-size: 22px; color: ${({ $cl }) => $cl}; }
`

export const MontoInfo = styled.div``

export const MontoTitle = styled.p`
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88);
`

export const MontoDesc = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.30); margin-top: 2px;
`

export const MontoDivider = styled.div`
  height: 1px; background: rgba(255,255,255,0.05); margin: 0;
`

export const MontoBody = styled.div`
  padding: 18px 20px 20px;
  display: flex; flex-direction: column; gap: 12px;
`

export const MontoInputRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`

export const CurrencyPrefix = styled.span`
  font-size: 24px; font-weight: 300;
  color: rgba(255,255,255,0.22); flex-shrink: 0; line-height: 1;
`

export const MontoInput = styled.input`
  flex: 1; height: 54px; padding: 0 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px; color: #fff;
  font-size: 24px; font-weight: 600; font-family: inherit; outline: none;
  transition: border-color 0.2s, background 0.2s;
  &::placeholder { color: rgba(255,255,255,0.12); font-weight: 400; font-size: 20px; }
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  &[type=number] { -moz-appearance: textfield; }
  &:focus {
    border-color: ${({ $focusBr }) => $focusBr ?? 'rgba(30,133,255,0.45)'};
    background: ${({ $focusBg }) => $focusBg ?? 'rgba(30,133,255,0.04)'};
  }
`

export const CurrencySelect = styled.select`
  height: 54px; padding: 0 28px 0 12px; flex-shrink: 0;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px; color: rgba(255,255,255,0.65);
  font-size: 13px; font-weight: 600; font-family: inherit;
  outline: none; cursor: pointer; appearance: none; -webkit-appearance: none;
  min-width: 82px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
  transition: border-color 0.2s;
  &:focus { border-color: rgba(30,133,255,0.40); }
  option { background: #0d0d20; color: #fff; }
`

export const MontoNote = styled.p`
  font-size: 11.5px; color: rgba(255,255,255,0.24); line-height: 1.5;
`

/* ── api integrations ── */
export const ApiStatusBadge = styled.span`
  margin-left: auto; flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 11px; border-radius: 7px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  ${({ $ok }) => $ok ? css`
    background: rgba(34,197,94,0.12); color: #4ade80;
    border: 1px solid rgba(34,197,94,0.24);
  ` : css`
    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.28);
    border: 1px solid rgba(255,255,255,0.08);
  `}
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; flex-shrink: 0;
  }
`

export const ApiNote = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.22); line-height: 1.55;
  padding: 12px 0 0;
  border-top: 1px solid rgba(255,255,255,0.05);
`

export const ApiInputPrefix = styled.span`
  position: absolute; left: 13px;
  font-size: 13px; color: rgba(255,255,255,0.20);
  pointer-events: none; white-space: nowrap; user-select: none;
  font-family: 'Courier New', monospace;
`

/* ── banco de chat ── */
export const ProviderGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`

export const ProviderCard = styled.button`
  display: flex; align-items: center; gap: 12px;
  padding: 13px 15px; border-radius: 13px;
  background: ${({ $active, $activeBg }) => $active ? $activeBg : 'rgba(255,255,255,0.03)'};
  border: 1.5px solid ${({ $active, $activeBr }) => $active ? $activeBr : 'rgba(255,255,255,0.07)'};
  cursor: pointer; text-align: left; font-family: inherit;
  transition: all 0.18s; width: 100%;
  ${({ $active }) => !$active && css`
    &:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.13); }
  `}
`

export const RadioCircle = styled.span`
  width: 18px; height: 18px; min-width: 18px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.22)'};
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.18s;
  &::after {
    content: '';
    width: 9px; height: 9px; border-radius: 50%;
    background: ${({ $active, $color }) => $active ? $color : 'transparent'};
    transition: background 0.18s;
  }
`

export const ProviderAvatar = styled.div`
  width: 34px; height: 34px; min-width: 34px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff; letter-spacing: -0.02em;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $br }) => $br};
`

export const ProviderInfo = styled.div`flex: 1; min-width: 0;`

export const ProviderName = styled.p`
  font-size: 13px; font-weight: 600;
  color: ${({ $active, $color }) => $active ? $color : 'rgba(255,255,255,0.72)'};
  transition: color 0.18s; white-space: nowrap;
`

export const ProviderSub = styled.p`
  font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 2px;
`

export const AccountSelectCard = styled.div`
  padding: 16px 20px;
  background: ${({ $bg }) => $bg ?? 'rgba(30,133,255,0.07)'};
  border: 1px solid ${({ $br }) => $br ?? 'rgba(30,133,255,0.18)'};
  border-radius: 14px; display: flex; flex-direction: column; gap: 10px;
  animation: ${fadeUp} 0.22s ease both;
`

export const AccountSelectLabel = styled.p`
  font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
  text-transform: uppercase; color: ${({ $color }) => $color ?? 'rgba(255,255,255,0.35)'};
`

export const FieldSelect = styled.select`
  width: 100%; height: 42px; padding: 0 36px 0 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 11px; color: #fff; font-size: 13.5px; font-family: inherit; outline: none;
  cursor: pointer; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 13px center;
  transition: border-color 0.2s, background 0.2s;
  &:focus { border-color: rgba(30,133,255,0.45); background: rgba(30,133,255,0.04); }
  option { background: #0d0d20; color: #fff; }
`

export const ActiveProviderRow = styled.div`
  display: flex; align-items: center; gap: 10px;
`

export const ActiveProviderDot = styled.span`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 3px ${({ $color }) => $color}33;
`
