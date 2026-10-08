import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import SearchIcon from '@mui/icons-material/Search'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { api } from '../../../utils/api'
import useAuth from '../../../hooks/useAuth'
import { useDateFormat } from '../../../hooks/useDateFormat'

/* ─────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`to { transform: rotate(360deg); }`

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
`

/* ─────────────────────────────────────────────────
   Styled components
───────────────────────────────────────────────── */
const PageWrap = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  background: var(--bc-admin-content-bg, #08080f);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 28px 0;
  flex-shrink: 0;
  @media (max-width: 600px) { padding: 16px 16px 0; }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const MenuBtn = styled.button`
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 20px; }
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
`

const TitleBlock = styled.div`flex: 1; min-width: 0;`

const PageTitle = styled.h1`
  font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.02em;
`

const PageSub = styled.p`
  font-size: 12px; color: rgba(255,255,255,0.32); margin-top: 2px;
`

const RefreshPageBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.55);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,0.09); color: #fff; }
  &:disabled { opacity: 0.40; cursor: not-allowed; }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  @media (max-width: 600px) { padding: 12px 14px 40px; }
`

const StickyTopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bc-admin-content-bg, #08080f);
  padding: 14px 28px 0;
  margin: 0 -28px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  @media (max-width: 600px) { padding: 10px 14px 0; margin: 0 -14px; }
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
`

const TabBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px 10px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? 'var(--bc-admin-accent, #3b82f6)' : 'transparent'};
  background: transparent;
  color: ${({ $active }) => $active ? '#fff' : 'rgba(255,255,255,0.38)'};
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: rgba(255,255,255,0.80); }
`

const TabCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb, 59,130,246),0.25)' : 'rgba(255,255,255,0.08)'};
  color: ${({ $active }) => $active ? 'var(--bc-admin-accent, #60a5fa)' : 'rgba(255,255,255,0.35)'};
`

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.20s ease both;
`

const DateInput = styled.input`
  height: 34px; padding: 0 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px; color: #fff; font-size: 12.5px; font-family: inherit;
  outline: none; color-scheme: dark;
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30,133,255),0.45); }
`

const FilterLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
`

const PresetBtn = styled.button`
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb,59,130,246),0.45)' : 'rgba(255,255,255,0.09)'};
  background: ${({ $active }) => $active ? 'rgba(var(--bc-admin-accent-rgb,59,130,246),0.14)' : 'rgba(255,255,255,0.04)'};
  color: ${({ $active }) => $active ? 'var(--bc-admin-accent,#60a5fa)' : 'rgba(255,255,255,0.50)'};
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.13s, color 0.13s, border-color 0.13s;
  white-space: nowrap;
  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
`

const FilterSelect = styled.select`
  height: 34px;
  padding: 0 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  color: rgba(255,255,255,0.75);
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  color-scheme: dark;
  option { background: #1a1a2e; }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30,133,255),0.45); }
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.21s ease both;
`

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  min-width: 160px;
  max-width: 380px;
  @media (max-width: 600px) { max-width: 100%; width: 100%; }
`

const SrchIcon = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.28);
  display: flex;
  align-items: center;
  svg { font-size: 16px; }
`

const SearchInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.25); }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb, 30,133,255),0.40); background: rgba(255,255,255,0.07); }
`

const ResultCount = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
`

const TableCard = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  overflow: hidden;
  animation: ${fadeUp} 0.22s ease both;
`

const TableScroll = styled.div`
  overflow-x: auto;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
`

const Thead = styled.thead``

const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  white-space: nowrap;
`

const Tbody = styled.tbody``

const Tr = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.14s;
  animation: ${fadeUp} 0.18s ease both;
  animation-delay: ${({ $i }) => Math.min($i * 0.03, 0.3)}s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.025); }
`

const Td = styled.td`
  padding: 11px 14px;
  font-size: 12.5px;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
  vertical-align: middle;
`

const IdText = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
`

const AmountText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #c7d9ff;
`

const ClientLink = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: #60a5fa;
  cursor: default;
`

const MonoText = styled.span`
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.55);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
`

const ExpandBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
  svg { font-size: 18px; }
  &:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.20); }
`

/* status badges */
const OurStatusBadge = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 5px;
  display: inline-block;

  ${({ $s }) => {
    if ($s === 'pending')   return css`background: rgba(245,158,11,0.16); color: #fbbf24;`
    if ($s === 'paid')      return css`background: rgba(16,185,129,0.16); color: #10b981;`
    if ($s === 'duplicate') return css`background: rgba(239,68,68,0.16);  color: #ef4444;`
    return css`background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.40);`
  }}
`

const MatchBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
  display: inline-block;

  ${({ $src }) => {
    if ($src === 'none')                return css`background: rgba(239,68,68,0.12);  color: #f87171;`
    if ($src === 'client_cuit_cuil')    return css`background: rgba(16,185,129,0.14); color: #10b981;`
    if ($src === 'client_name_exact')   return css`background: rgba(16,185,129,0.12); color: #34d399;`
    if ($src === 'client_name')         return css`background: rgba(245,158,11,0.12); color: #fbbf24;`
    if ($src === 'manual')              return css`background: rgba(139,92,246,0.14); color: #a78bfa;`
    return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35);`
  }}
`

/* detail row */
const DetailRow = styled.tr`
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.15);
`

const DetailCell = styled.td`
  padding: 0;
`

const DetailWrap = styled.div`
  padding: 16px 20px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  animation: ${slideUp} 0.20s ease both;
  @media (max-width: 800px) { grid-template-columns: 1fr; }
`

const DetailCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px 18px;
`

const DetailCardTitle = styled.p`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #60a5fa;
  margin-bottom: 12px;
`

const DetailRow2 = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`

const DetailKey = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
  flex-shrink: 0;
`

const DetailVal = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.70);
  text-align: right;
  word-break: break-all;
  max-width: 220px;
`

const DetailValBlue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #60a5fa;
  text-align: right;
  word-break: break-all;
  max-width: 220px;
`

const DetailValGreen = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  text-align: right;
  word-break: break-all;
  max-width: 220px;
`

/* action section */
const ActionSection = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
`

const ActionLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  margin-bottom: 8px;
`

const ActionBtns = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const PaidBtn = styled.button`
  flex: 1;
  min-width: 120px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(16,185,129,0.35);
  background: rgba(16,185,129,0.12);
  color: #10b981;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(16,185,129,0.22); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

const DuplicateBtn = styled.button`
  flex: 1;
  min-width: 120px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid rgba(239,68,68,0.35);
  background: rgba(239,68,68,0.12);
  color: #ef4444;
  font-size: 12.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(239,68,68,0.22); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

const ConfirmRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`

const ConfirmBtn = styled.button`
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.14s;

  ${({ $variant }) => $variant === 'confirm-paid' ? css`
    border-color: rgba(16,185,129,0.35);
    background: rgba(16,185,129,0.14);
    color: #10b981;
    &:hover { background: rgba(16,185,129,0.24); }
  ` : $variant === 'confirm-dup' ? css`
    border-color: rgba(239,68,68,0.35);
    background: rgba(239,68,68,0.14);
    color: #ef4444;
    &:hover { background: rgba(239,68,68,0.24); }
  ` : css`
    border-color: rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.45);
    &:hover { background: rgba(255,255,255,0.08); }
  `}

  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

const RemoveAssignBtn = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(239,68,68,0.30);
  background: rgba(239,68,68,0.08);
  color: #f87171;
  font-size: 11.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.14s;
  &:hover { background: rgba(239,68,68,0.18); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

/* assign section */
const AssignWrap = styled.div`
  position: relative;
`

const AssignInput = styled.input`
  width: 100%;
  height: 34px;
  padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 9px;
  color: #fff;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.25); }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb,30,133,255),0.40); background: rgba(255,255,255,0.07); }
`

const AssignDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  overflow: hidden;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
`

const AssignOption = styled.button`
  display: block;
  width: 100%;
  padding: 9px 13px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.75);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.07); color: #fff; }
`

/* metrics grid */
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  animation: ${fadeUp} 0.22s ease both;
`

const MetricCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MetricLabel = styled.p`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
`

const MetricValue = styled.p`
  font-size: 26px;
  font-weight: 800;
  color: ${({ $color }) => $color || '#fff'};
  letter-spacing: -0.02em;
  line-height: 1.1;
`

const MetricSub = styled.p`
  font-size: 11.5px;
  color: rgba(255,255,255,0.30);
`

const MetricDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.05);
  margin: 8px 0;
`

/* simulate tab */
const SimulateWrap = styled.div`
  max-width: 520px;
  animation: ${fadeUp} 0.22s ease both;
`

const WarnBox = styled.div`
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(249,115,22,0.10);
  border: 1px solid rgba(249,115,22,0.28);
  color: #f97316;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const AccessDenied = styled.div`
  padding: 18px 20px;
  border-radius: 12px;
  background: rgba(239,68,68,0.07);
  border: 1px solid rgba(239,68,68,0.20);
  color: rgba(255,255,255,0.40);
  font-size: 13px;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`

const FormLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.40);
`

const FormInput = styled.input`
  height: 38px;
  padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.22); }
  &:focus { border-color: rgba(var(--bc-admin-accent-rgb,30,133,255),0.45); background: rgba(255,255,255,0.07); }
`

const SubmitBtn = styled.button`
  height: 40px;
  padding: 0 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--bc-admin-accent,#3b82f6) 0%, rgba(var(--bc-admin-accent-rgb,59,130,246),0.75) 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:active { opacity: 0.70; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

/* loading / empty */
const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: rgba(255,255,255,0.28);
  font-size: 13px;
`

const Spinner = styled.span`
  width: ${({ $sm }) => $sm ? '16px' : '26px'};
  height: ${({ $sm }) => $sm ? '16px' : '26px'};
  border: ${({ $sm }) => $sm ? '2px' : '3px'} solid rgba(255,255,255,0.08);
  border-top-color: var(--bc-admin-accent, #3b82f6);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  flex-shrink: 0;
`

const SkeletonRow = styled.div`
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
  margin: 4px 14px;
`

const EmptyRow = styled.tr``

const EmptyCell = styled.td`
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(255,255,255,0.20);
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 12px;
  flex-wrap: wrap;
`

const PaginInfo = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.28);
`

const PaginBtns = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

const PaginBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.13s, color 0.13s;
  svg { font-size: 17px; }
  &:hover:not(:disabled) { background: rgba(255,255,255,0.10); color: #fff; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

const Toast = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  font-size: 13px;
  font-weight: 600;
  animation: ${slideUp} 0.22s ease both;

  ${({ $type }) => $type === 'success' ? css`
    background: rgba(22,28,36,0.98);
    border: 1px solid rgba(16,185,129,0.35);
    color: #10b981;
  ` : css`
    background: rgba(22,28,36,0.98);
    border: 1px solid rgba(239,68,68,0.35);
    color: #ef4444;
  `}
`

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10)

const fmtAmount = (n) => {
  if (n == null) return '—'
  return `$${new Intl.NumberFormat('es-AR').format(n)}`
}

const fmtDate = (str, tz) => {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es', {
    day: 'numeric', month: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...(tz && { timeZone: tz }),
  })
}

const OUR_STATUS_LABELS = {
  pending:   'Pendiente',
  paid:      'Pagado',
  duplicate: 'Duplicado',
}

const MATCH_SOURCE_LABELS = {
  none:               'Sin match',
  client_cuit_cuil:   'CUIT',
  client_name_exact:  'Nombre exacto',
  client_name:        'Nombre similar',
  manual:             'Manual',
}

const EVENT_NAME_LABELS = {
  'transferencia.detectada':   'Detectada',
  'transferencia.actualizada': 'Actualizada',
  'retiro.resuelto':           'Retiro resuelto',
}

/* ─────────────────────────────────────────────────
   ExpandedDetail component
───────────────────────────────────────────────── */
function ExpandedDetail({ event, colCount, onResolved, resolving, onAssigned, assigning }) {
  const { timezone } = useDateFormat()
  const [confirmAction, setConfirmAction] = useState(null) // 'paid' | 'duplicate'
  const [submitting, setSubmitting] = useState(false)

  // assign client state
  const [assignSearch, setAssignSearch] = useState('')
  const [assignResults, setAssignResults] = useState([])
  const [assignSearching, setAssignSearching] = useState(false)
  const assignDebounceRef = useRef(null)
  const [removingAssign, setRemovingAssign] = useState(false)

  const isPending = event.our_status === 'pending'
  const hasClient = !!event.client_id

  // debounce client search
  useEffect(() => {
    if (assignDebounceRef.current) clearTimeout(assignDebounceRef.current)
    if (!assignSearch.trim()) { setAssignResults([]); return }

    assignDebounceRef.current = setTimeout(async () => {
      setAssignSearching(true)
      try {
        const res = await api.get(`/api/clients?search=${encodeURIComponent(assignSearch.trim())}&limit=5`)
        setAssignResults(res.clients || res.data || [])
      } catch {
        setAssignResults([])
      } finally {
        setAssignSearching(false)
      }
    }, 400)

    return () => clearTimeout(assignDebounceRef.current)
  }, [assignSearch])

  const handleResolve = async (action) => {
    setSubmitting(true)
    try {
      await api.post(`/api/admin/caudal/events/${event.external_transaction_id}/resolve`, { action })
      setConfirmAction(null)
      onResolved()
    } catch (err) {
      // parent will show toast via onResolved with error info — rethrow so caller handles
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async (client) => {
    try {
      await api.post(`/api/admin/caudal/events/${event.external_transaction_id}/assign`, { clientId: client.id })
      setAssignSearch('')
      setAssignResults([])
      onAssigned()
    } catch (err) {
      throw err
    }
  }

  const handleRemoveAssign = async () => {
    setRemovingAssign(true)
    try {
      await api.delete(`/api/admin/caudal/events/${event.external_transaction_id}/assign`)
      onAssigned()
    } catch (err) {
      throw err
    } finally {
      setRemovingAssign(false)
    }
  }

  return (
    <DetailRow>
      <DetailCell colSpan={colCount}>
        <DetailWrap>
          {/* ── Left card: event data ── */}
          <DetailCard>
            <DetailCardTitle>Datos del Evento</DetailCardTitle>

            <DetailRow2>
              <DetailKey>TX ID</DetailKey>
              <DetailVal style={{ fontFamily: 'monospace', fontSize: 11 }}>{event.external_transaction_id || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Event ID</DetailKey>
              <DetailVal style={{ fontFamily: 'monospace', fontSize: 11 }}>{event.event_id || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Evento</DetailKey>
              <DetailVal>{EVENT_NAME_LABELS[event.event_name] || event.event_name || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Fecha</DetailKey>
              <DetailVal>{fmtDate(event.occurred_at, timezone)}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Monto</DetailKey>
              <DetailValBlue>{fmtAmount(event.amount)} {event.currency || 'ARS'}</DetailValBlue>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Estado Caudal</DetailKey>
              <DetailVal>{event.status || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Emisor</DetailKey>
              <DetailVal>{event.from_name || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>CUIT/CUIL</DetailKey>
              <DetailVal style={{ fontFamily: 'monospace' }}>{event.from_cuit || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>CBU origen</DetailKey>
              <DetailVal style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{event.from_cbu || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Match source</DetailKey>
              <MatchBadge $src={event.match_source}>{MATCH_SOURCE_LABELS[event.match_source] || event.match_source || '—'}</MatchBadge>
            </DetailRow2>

            {event.reviewed_at && (
              <DetailRow2>
                <DetailKey>Revisado</DetailKey>
                <DetailVal>{fmtDate(event.reviewed_at, timezone)}</DetailVal>
              </DetailRow2>
            )}

            {event.reviewed_by_admin_username && (
              <DetailRow2>
                <DetailKey>Revisado por</DetailKey>
                <DetailValBlue>{event.reviewed_by_admin_username}</DetailValBlue>
              </DetailRow2>
            )}
          </DetailCard>

          {/* ── Right card: resolve + assign ── */}
          <DetailCard>
            <DetailCardTitle>Acciones</DetailCardTitle>

            {/* client assignment */}
            <ActionSection style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <ActionLabel>Cliente asignado</ActionLabel>

              {hasClient ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <DetailValGreen style={{ fontSize: 13 }}>
                    {event.client_name || `ID ${event.client_id}`}
                  </DetailValGreen>
                  <RemoveAssignBtn onClick={handleRemoveAssign} disabled={removingAssign || assigning}>
                    {removingAssign ? <Spinner $sm /> : 'Quitar asignación'}
                  </RemoveAssignBtn>
                </div>
              ) : (
                <AssignWrap>
                  <AssignInput
                    placeholder="Buscar cliente por usuario..."
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                  />
                  {assignSearching && (
                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      Buscando...
                    </div>
                  )}
                  {assignResults.length > 0 && (
                    <AssignDropdown>
                      {assignResults.map(c => (
                        <AssignOption
                          key={c.id}
                          onClick={() => handleAssign(c)}
                          disabled={assigning}
                        >
                          <strong>{c.username}</strong>
                          {c.fullName ? ` · ${c.fullName}` : ''}
                          {c.cuit ? <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 6, fontSize: 11 }}>{c.cuit}</span> : null}
                        </AssignOption>
                      ))}
                    </AssignDropdown>
                  )}
                  {!assignSearching && assignSearch.trim().length > 1 && assignResults.length === 0 && (
                    <div style={{ padding: '8px 0', fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
                      Sin resultados
                    </div>
                  )}
                </AssignWrap>
              )}
            </ActionSection>

            {/* resolve actions – only for pending */}
            {isPending && (
              <ActionSection>
                <ActionLabel>Resolución</ActionLabel>

                {confirmAction === null && (
                  <ActionBtns>
                    <PaidBtn onClick={() => setConfirmAction('paid')} disabled={resolving || submitting}>
                      Marcar pagado
                    </PaidBtn>
                    <DuplicateBtn onClick={() => setConfirmAction('duplicate')} disabled={resolving || submitting}>
                      Marcar duplicado
                    </DuplicateBtn>
                  </ActionBtns>
                )}

                {confirmAction === 'paid' && (
                  <>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                      ¿Confirmar que esta transferencia fue pagada al cliente?
                    </p>
                    <ConfirmRow>
                      <ConfirmBtn
                        $variant="confirm-paid"
                        onClick={() => handleResolve('paid')}
                        disabled={submitting}
                      >
                        {submitting ? <Spinner $sm /> : 'Confirmar pago'}
                      </ConfirmBtn>
                      <ConfirmBtn onClick={() => setConfirmAction(null)} disabled={submitting}>
                        Cancelar
                      </ConfirmBtn>
                    </ConfirmRow>
                  </>
                )}

                {confirmAction === 'duplicate' && (
                  <>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                      ¿Confirmar que este evento es un duplicado?
                    </p>
                    <ConfirmRow>
                      <ConfirmBtn
                        $variant="confirm-dup"
                        onClick={() => handleResolve('duplicate')}
                        disabled={submitting}
                      >
                        {submitting ? <Spinner $sm /> : 'Confirmar duplicado'}
                      </ConfirmBtn>
                      <ConfirmBtn onClick={() => setConfirmAction(null)} disabled={submitting}>
                        Cancelar
                      </ConfirmBtn>
                    </ConfirmRow>
                  </>
                )}
              </ActionSection>
            )}

            {!isPending && (
              <ActionSection>
                <ActionLabel>Estado</ActionLabel>
                <OurStatusBadge $s={event.our_status} style={{ fontSize: 13 }}>
                  {OUR_STATUS_LABELS[event.our_status] || event.our_status}
                </OurStatusBadge>
                {event.our_status !== 'pending' && (
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', marginTop: 6 }}>
                    Ya fue procesado — no requiere acción.
                  </p>
                )}
              </ActionSection>
            )}
          </DetailCard>
        </DetailWrap>
      </DetailCell>
    </DetailRow>
  )
}

/* ─────────────────────────────────────────────────
   MetricsTab component
───────────────────────────────────────────────── */
function MetricsTab() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get('/api/admin/caudal/metrics')
      .then(res => { if (!cancelled) { setMetrics(res); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message || 'Error'); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <LoadingWrap>
      <Spinner />
      Cargando métricas…
    </LoadingWrap>
  )

  if (error) return (
    <div style={{ padding: 20, color: '#f87171', fontSize: 13 }}>{error}</div>
  )

  if (!metrics) return null

  const totalEvents  = metrics.totalEvents   ?? 0
  const paid         = metrics.byStatus?.paid        ?? 0
  const pending      = metrics.byStatus?.pending     ?? 0
  const duplicate    = metrics.byStatus?.duplicate   ?? 0
  const totalAmount  = metrics.totalAmount  ?? 0
  const paidAmount   = metrics.paidAmount   ?? 0
  const pendingAmount = metrics.pendingAmount ?? 0
  const matchRate    = totalEvents > 0
    ? Math.round(((totalEvents - (metrics.byMatchSource?.none ?? 0)) / totalEvents) * 100)
    : 0

  const cards = [
    { label: 'Total eventos',   value: totalEvents,          sub: `Últimos 30 días`,             color: 'var(--bc-admin-accent,#60a5fa)' },
    { label: 'Pagados',         value: paid,                 sub: `${fmtAmount(paidAmount)} ARS`, color: '#10b981' },
    { label: 'Pendientes',      value: pending,              sub: `${fmtAmount(pendingAmount)} ARS`, color: '#f59e0b' },
    { label: 'Duplicados',      value: duplicate,            sub: 'Marcados como dup',            color: '#ef4444' },
    { label: 'Monto total',     value: fmtAmount(totalAmount), sub: 'Total recibido ARS',         color: '#c7d9ff' },
    { label: 'Tasa de match',   value: `${matchRate}%`,      sub: 'Eventos con cliente',          color: matchRate >= 70 ? '#10b981' : matchRate >= 40 ? '#f59e0b' : '#ef4444' },
  ]

  return (
    <>
      <MetricsGrid>
        {cards.map((c, i) => (
          <MetricCard key={i} style={{ animationDelay: `${i * 35}ms` }}>
            <MetricLabel>{c.label}</MetricLabel>
            <MetricValue $color={c.color}>{c.value}</MetricValue>
            <MetricDivider />
            <MetricSub>{c.sub}</MetricSub>
          </MetricCard>
        ))}
      </MetricsGrid>

      {/* breakdown rows */}
      {metrics.byMatchSource && (
        <TableCard style={{ marginTop: 4 }}>
          <div style={{ padding: '14px 18px 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Breakdown por origen del match
          </div>
          <TableScroll>
            <Table style={{ minWidth: 'unset' }}>
              <Thead>
                <tr>
                  <Th>Origen</Th>
                  <Th>Eventos</Th>
                  <Th>%</Th>
                </tr>
              </Thead>
              <Tbody>
                {Object.entries(metrics.byMatchSource).map(([src, count]) => (
                  <Tr key={src} $i={0}>
                    <Td><MatchBadge $src={src}>{MATCH_SOURCE_LABELS[src] || src}</MatchBadge></Td>
                    <Td><AmountText style={{ fontSize: 13, color: '#fff' }}>{count}</AmountText></Td>
                    <Td style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      {totalEvents > 0 ? `${Math.round((count / totalEvents) * 100)}%` : '—'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        </TableCard>
      )}

      {metrics.byEventName && (
        <TableCard style={{ marginTop: 4 }}>
          <div style={{ padding: '14px 18px 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Breakdown por tipo de evento
          </div>
          <TableScroll>
            <Table style={{ minWidth: 'unset' }}>
              <Thead>
                <tr>
                  <Th>Evento</Th>
                  <Th>Cantidad</Th>
                </tr>
              </Thead>
              <Tbody>
                {Object.entries(metrics.byEventName).map(([name, count]) => (
                  <Tr key={name} $i={0}>
                    <Td style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                      {EVENT_NAME_LABELS[name] || name}
                    </Td>
                    <Td><AmountText style={{ fontSize: 13, color: '#fff' }}>{count}</AmountText></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        </TableCard>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────
   SimulateTab component
───────────────────────────────────────────────── */
function SimulateTab({ userRole, showToast }) {
  const [form, setForm] = useState({
    amount: '',
    fromName: '',
    fromCuit: '',
    fromCbu: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    setSubmitting(true)
    try {
      const body = {
        amount: Number(form.amount),
        ...(form.fromName && { fromName: form.fromName }),
        ...(form.fromCuit && { fromCuit: form.fromCuit }),
        ...(form.fromCbu  && { fromCbu:  form.fromCbu  }),
      }
      await api.post('/api/admin/caudal/simulate', body)
      showToast('Evento simulado creado correctamente')
      setForm({ amount: '', fromName: '', fromCuit: '', fromCbu: '' })
    } catch (err) {
      showToast(err.message || 'Error al simular evento', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (userRole !== 'superadmin') {
    return (
      <AccessDenied>
        Solo disponible para <strong>superadmin</strong>. Tu rol actual no tiene acceso a esta función.
      </AccessDenied>
    )
  }

  return (
    <SimulateWrap>
      <WarnBox>
        <WarningAmberOutlinedIcon style={{ fontSize: 20 }} />
        Esta función crea eventos de prueba en el sistema. Solo usar en desarrollo o QA.
      </WarnBox>

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <FormLabel>Monto (ARS) *</FormLabel>
          <FormInput
            type="number"
            min="1"
            step="0.01"
            placeholder="Ej: 5000"
            value={form.amount}
            onChange={set('amount')}
            required
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>Nombre del emisor</FormLabel>
          <FormInput
            type="text"
            placeholder="Ej: Juan García"
            value={form.fromName}
            onChange={set('fromName')}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>CUIT/CUIL del emisor</FormLabel>
          <FormInput
            type="text"
            placeholder="Ej: 20123456789"
            value={form.fromCuit}
            onChange={set('fromCuit')}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>CBU del emisor</FormLabel>
          <FormInput
            type="text"
            placeholder="Ej: 0070999000000123456789"
            value={form.fromCbu}
            onChange={set('fromCbu')}
          />
        </FormGroup>

        <SubmitBtn type="submit" disabled={submitting || !form.amount}>
          {submitting ? <Spinner $sm /> : null}
          {submitting ? 'Simulando…' : 'Crear evento simulado'}
        </SubmitBtn>
      </form>
    </SimulateWrap>
  )
}

/* ─────────────────────────────────────────────────
   Main page component
───────────────────────────────────────────────── */
const TableScrollWrap = styled.div`
  overflow-x: auto;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

export default function CaudalTransactionsPage({ onMenuOpen }) {
  const { user }     = useAuth()
  const { timezone } = useDateFormat()

  /* ── tabs ── */
  const [activeTab, setActiveTab] = useState('eventos') // 'eventos' | 'metricas' | 'simular'

  /* ── list state ── */
  const [events,     setEvents]     = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [summary,    setSummary]    = useState(null)
  const [loading,    setLoading]    = useState(true)

  /* ── filters ── */
  const [search,      setSearch]      = useState('')
  const [ourStatus,   setOurStatus]   = useState('all')
  const [matchSource, setMatchSource] = useState('all')
  const [eventName,   setEventName]   = useState('all')
  const [dateFrom,    setDateFrom]    = useState(todayStr())
  const [dateTo,      setDateTo]      = useState(todayStr())
  const [preset,      setPreset]      = useState('today')
  const [page,        setPage]        = useState(1)

  /* ── expand / per-row state ── */
  const [expandedId, setExpandedId] = useState(null)
  const [resolving,  setResolving]  = useState({}) // { [external_transaction_id]: bool }
  const [assigning,  setAssigning]  = useState({}) // { [external_transaction_id]: bool }

  /* ── toast ── */
  const [toast, setToast] = useState(null)

  const debounceRef = useRef(null)
  const LIMIT = 20
  const COL_COUNT = 9

  /* ── helpers ── */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  /* ── fetch events ── */
  const fetchEvents = useCallback(async (opts = {}) => {
    const p   = opts.page        ?? page
    const s   = opts.search      ?? search
    const df  = opts.dateFrom    ?? dateFrom
    const dt  = opts.dateTo      ?? dateTo
    const st  = opts.ourStatus   ?? ourStatus
    const ms  = opts.matchSource ?? matchSource
    const en  = opts.eventName   ?? eventName

    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT, dateFrom: df, dateTo: dt })
      if (s)  params.set('search',      s)
      if (st !== 'all') params.set('ourStatus',   st)
      if (ms !== 'all') params.set('matchSource', ms)
      if (en !== 'all') params.set('eventName',   en)

      const res = await api.get(`/api/admin/caudal/events?${params.toString()}`)
      setEvents(res.events      || [])
      setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 })
      setSummary(res.summary    || null)
    } catch (err) {
      showToast(err.message || 'Error al cargar eventos', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, dateFrom, dateTo, ourStatus, matchSource, eventName, showToast])

  /* ── on mount ── */
  useEffect(() => {
    fetchEvents()
  }, []) // eslint-disable-line

  /* ── debounced search ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchEvents({ search, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [search]) // eslint-disable-line

  /* ── preset handler ── */
  const handlePreset = (val) => {
    setPreset(val)
    const today = todayStr()
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
    const weekStart  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10) })()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

    let df = dateFrom, dt = dateTo
    if (val === 'today')  { df = today;      dt = today }
    if (val === 'ayer')   { df = yesterday;  dt = yesterday }
    if (val === 'semana') { df = weekStart;  dt = today }
    if (val === 'mes')    { df = monthStart; dt = today }

    if (val !== 'custom') {
      setDateFrom(df)
      setDateTo(dt)
      setPage(1)
      fetchEvents({ dateFrom: df, dateTo: dt, page: 1 })
    }
  }

  /* ── filter apply ── */
  const applyFilters = () => {
    setPage(1)
    fetchEvents({ page: 1 })
  }

  /* ── pagination ── */
  const gotoPage = (p) => {
    setPage(p)
    fetchEvents({ page: p })
  }

  /* ── expand toggle ── */
  const toggleExpand = (externalId) => {
    setExpandedId(prev => prev === externalId ? null : externalId)
  }

  /* ── resolve callback ── */
  const handleResolved = useCallback(async (externalId) => {
    try {
      setResolving(prev => ({ ...prev, [externalId]: true }))
      await fetchEvents({ page })
      setExpandedId(null)
      showToast('Evento resuelto correctamente')
    } catch (err) {
      showToast(err.message || 'Error al resolver', 'error')
    } finally {
      setResolving(prev => ({ ...prev, [externalId]: false }))
    }
  }, [page, fetchEvents, showToast])

  /* ── assign callback ── */
  const handleAssigned = useCallback(async (externalId) => {
    try {
      setAssigning(prev => ({ ...prev, [externalId]: true }))
      await fetchEvents({ page })
      showToast('Asignación actualizada')
    } catch (err) {
      showToast(err.message || 'Error en asignación', 'error')
    } finally {
      setAssigning(prev => ({ ...prev, [externalId]: false }))
    }
  }, [page, fetchEvents, showToast])

  /* ──────────────────── render ──────────────────── */
  return (
    <PageWrap>
      {/* ── header ── */}
      <PageHeader>
        <HeaderLeft>
          {onMenuOpen && (
            <MenuBtn onClick={onMenuOpen} type="button">
              <MenuIcon />
            </MenuBtn>
          )}
          <TitleBlock>
            <PageTitle>Transacciones Caudal</PageTitle>
            <PageSub>Eventos de pagos entrantes del proveedor argentino Caudal</PageSub>
          </TitleBlock>
        </HeaderLeft>
        <HeaderRight>
          <RefreshPageBtn
            onClick={() => fetchEvents({ page })}
            disabled={loading}
            title="Actualizar"
          >
            <AutorenewIcon style={{ fontSize: 16 }} />
            Actualizar
          </RefreshPageBtn>
        </HeaderRight>
      </PageHeader>

      <Body>
        {/* ── sticky top bar ── */}
        <StickyTopBar>
          <TabGroup>
            <TabBtn $active={activeTab === 'eventos'} onClick={() => setActiveTab('eventos')}>
              Eventos
              <TabCount $active={activeTab === 'eventos'}>{pagination.total}</TabCount>
            </TabBtn>
            <TabBtn $active={activeTab === 'metricas'} onClick={() => setActiveTab('metricas')}>
              Métricas
            </TabBtn>
            <TabBtn $active={activeTab === 'simular'} onClick={() => setActiveTab('simular')}>
              Simular
            </TabBtn>
          </TabGroup>
        </StickyTopBar>

        {/* ── EVENTOS tab ── */}
        {activeTab === 'eventos' && (
          <>
            {/* date filter bar */}
            <FilterBar>
              <FilterLabel>De:</FilterLabel>
              <DateInput
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => { setDateFrom(e.target.value); setPreset('custom') }}
              />
              <FilterLabel>A:</FilterLabel>
              <DateInput
                type="date"
                value={dateTo}
                min={dateFrom}
                max={todayStr()}
                onChange={e => { setDateTo(e.target.value); setPreset('custom') }}
              />
              <PresetBtn $active={preset === 'today'}  onClick={() => handlePreset('today')}>Hoy</PresetBtn>
              <PresetBtn $active={preset === 'ayer'}   onClick={() => handlePreset('ayer')}>Ayer</PresetBtn>
              <PresetBtn $active={preset === 'semana'} onClick={() => handlePreset('semana')}>Semana</PresetBtn>
              <PresetBtn $active={preset === 'mes'}    onClick={() => handlePreset('mes')}>Mes</PresetBtn>
            </FilterBar>

            {/* search + selects row */}
            <SearchRow>
              <SearchBox>
                <SrchIcon><SearchIcon /></SrchIcon>
                <SearchInput
                  placeholder="Buscar por TX ID, nombre, CUIT, CBU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </SearchBox>

              <FilterSelect
                value={ourStatus}
                onChange={e => {
                  setOurStatus(e.target.value)
                  setPage(1)
                  fetchEvents({ ourStatus: e.target.value, page: 1 })
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="duplicate">Duplicado</option>
              </FilterSelect>

              <FilterSelect
                value={matchSource}
                onChange={e => {
                  setMatchSource(e.target.value)
                  setPage(1)
                  fetchEvents({ matchSource: e.target.value, page: 1 })
                }}
              >
                <option value="all">Todos los match</option>
                <option value="none">Sin match</option>
                <option value="client_cuit_cuil">CUIT</option>
                <option value="client_name_exact">Nombre exacto</option>
                <option value="client_name">Nombre similar</option>
                <option value="manual">Manual</option>
              </FilterSelect>

              <FilterSelect
                value={eventName}
                onChange={e => {
                  setEventName(e.target.value)
                  setPage(1)
                  fetchEvents({ eventName: e.target.value, page: 1 })
                }}
              >
                <option value="all">Todos los eventos</option>
                <option value="transferencia.detectada">Detectada</option>
                <option value="transferencia.actualizada">Actualizada</option>
                <option value="retiro.resuelto">Retiro resuelto</option>
              </FilterSelect>

              <ResultCount>
                {summary
                  ? `${summary.total} eventos · ${summary.matched} con match · ${fmtAmount(summary.totalAmount)}`
                  : `${pagination.total} eventos`
                }
              </ResultCount>
            </SearchRow>

            {/* table */}
            <TableCard>
              <TableScrollWrap>
                <Table>
                  <Thead>
                    <tr>
                      <Th>#</Th>
                      <Th>FECHA</Th>
                      <Th>EVENTO</Th>
                      <Th>MONTO</Th>
                      <Th>EMISOR</Th>
                      <Th>ESTADO</Th>
                      <Th>NUESTRO ESTADO</Th>
                      <Th>CLIENTE</Th>
                      <Th style={{ width: 40 }}>↕</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={COL_COUNT} style={{ padding: 0 }}>
                          <SkeletonRow />
                        </td>
                      </tr>
                    ))}

                    {!loading && events.length === 0 && (
                      <EmptyRow>
                        <EmptyCell colSpan={COL_COUNT}>
                          Sin eventos en el período seleccionado
                        </EmptyCell>
                      </EmptyRow>
                    )}

                    {!loading && events.map((ev, i) => (
                      <>
                        <Tr key={ev.external_transaction_id || ev.id} $i={i}>
                          <Td><IdText>{ev.id}</IdText></Td>
                          <Td style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                            {fmtDate(ev.occurred_at, timezone)}
                          </Td>
                          <Td style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>
                            {EVENT_NAME_LABELS[ev.event_name] || ev.event_name || '—'}
                          </Td>
                          <Td><AmountText>{fmtAmount(ev.amount)}</AmountText></Td>
                          <Td>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                              {ev.from_name || '—'}
                            </div>
                            {ev.from_cuit && (
                              <MonoText style={{ fontSize: 10.5 }}>{ev.from_cuit}</MonoText>
                            )}
                          </Td>
                          <Td style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                            {ev.status || '—'}
                          </Td>
                          <Td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <OurStatusBadge $s={ev.our_status}>
                                {OUR_STATUS_LABELS[ev.our_status] || ev.our_status || '—'}
                              </OurStatusBadge>
                              {ev.match_source && (
                                <MatchBadge $src={ev.match_source}>
                                  {MATCH_SOURCE_LABELS[ev.match_source] || ev.match_source}
                                </MatchBadge>
                              )}
                            </div>
                          </Td>
                          <Td>
                            {ev.client_name
                              ? <ClientLink>{ev.client_name}</ClientLink>
                              : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>Sin asignar</span>
                            }
                          </Td>
                          <Td>
                            <ExpandBtn
                              onClick={() => toggleExpand(ev.external_transaction_id || String(ev.id))}
                              title={expandedId === (ev.external_transaction_id || String(ev.id)) ? 'Cerrar' : 'Ver detalle'}
                            >
                              {expandedId === (ev.external_transaction_id || String(ev.id))
                                ? <KeyboardArrowUpIcon />
                                : <KeyboardArrowDownIcon />
                              }
                            </ExpandBtn>
                          </Td>
                        </Tr>

                        {expandedId === (ev.external_transaction_id || String(ev.id)) && (
                          <ExpandedDetail
                            key={`detail-${ev.external_transaction_id || ev.id}`}
                            event={ev}
                            colCount={COL_COUNT}
                            onResolved={() => handleResolved(ev.external_transaction_id || String(ev.id))}
                            resolving={!!resolving[ev.external_transaction_id || String(ev.id)]}
                            onAssigned={() => handleAssigned(ev.external_transaction_id || String(ev.id))}
                            assigning={!!assigning[ev.external_transaction_id || String(ev.id)]}
                          />
                        )}
                      </>
                    ))}
                  </Tbody>
                </Table>
              </TableScrollWrap>

              {/* pagination */}
              {!loading && pagination.totalPages > 1 && (
                <Pagination>
                  <PaginInfo>
                    Página {pagination.page} de {pagination.totalPages} · {pagination.total} eventos
                  </PaginInfo>
                  <PaginBtns>
                    <PaginBtn
                      onClick={() => gotoPage(page - 1)}
                      disabled={page <= 1}
                      title="Página anterior"
                    >
                      <ChevronLeftIcon />
                    </PaginBtn>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', padding: '0 4px' }}>
                      {page} / {pagination.totalPages}
                    </span>
                    <PaginBtn
                      onClick={() => gotoPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      title="Página siguiente"
                    >
                      <ChevronRightIcon />
                    </PaginBtn>
                  </PaginBtns>
                </Pagination>
              )}
            </TableCard>
          </>
        )}

        {/* ── MÉTRICAS tab ── */}
        {activeTab === 'metricas' && <MetricsTab />}

        {/* ── SIMULAR tab ── */}
        {activeTab === 'simular' && (
          <SimulateTab userRole={user?.role} showToast={showToast} />
        )}
      </Body>

      {/* ── toast ── */}
      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'success'
            ? <CheckCircleOutlinedIcon style={{ fontSize: 18 }} />
            : <WarningAmberOutlinedIcon style={{ fontSize: 18 }} />
          }
          {toast.message}
        </Toast>
      )}
    </PageWrap>
  )
}
