import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { eventsApi } from '../services/eventsApi.js'

/* ── constants ─────────────────────────────────────────── */
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
const resolveUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

const GAME_ICONS = {
  sorteo: '🎰', quiz: '🧠', scratch: '🎫', roulette: '⚙️',
  slots: '🎰', red_black: '🔴', briefcase: '💼', treasure_chest: '💎', ranking: '🏆',
}
const GAME_LABELS = {
  sorteo: 'Sorteo', quiz: 'Quiz', scratch: 'Raspa y Gana', roulette: 'Ruleta',
  slots: 'Slots', red_black: 'Rojo/Negro', briefcase: 'Maletín', treasure_chest: 'Cofre', ranking: 'Ranking',
}

const RECEIPT_CHIP = {
  paid:        { label: 'Depósito acreditado', bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.35)' },
  pending:     { label: 'En revisión',         bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
  duplicate:   { label: 'Duplicado',           bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
  error:       { label: 'Error',               bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
  invalid:     { label: 'Inválido',            bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
  amount_low:  { label: 'Monto bajo',          bg: 'rgba(249,115,22,0.1)',   color: '#f97316', border: 'rgba(249,115,22,0.25)' },
}
const REWARD_CHIP = {
  pending:   { label: 'Pendiente', bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
  paid:      { label: 'Pagado',    bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.35)' },
  failed:    { label: 'Fallido',   bg: 'rgba(249,115,22,0.1)',   color: '#f97316', border: 'rgba(249,115,22,0.25)' },
  discarded: { label: 'Descartado',bg: 'rgba(107,114,128,0.12)', color: '#6b7280', border: 'rgba(107,114,128,0.25)'},
}

const DISTRIBUTION_GAMES = new Set(['briefcase', 'treasure_chest', 'quiz', 'red_black', 'roulette', 'slots'])

/* ── animations ─────────────────────────────────────────── */
const slideIn  = keyframes`from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}`
const fadeIn   = keyframes`from{opacity:0}to{opacity:1}`
const fadeUp   = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const spin     = keyframes`to{transform:rotate(360deg)}`

/* ── layout ─────────────────────────────────────────────── */
const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 4000;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(3px);
  animation: ${fadeIn} 0.2s ease both;
`

const Panel = styled.div`
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 4001;
  width: min(820px, 100vw);
  background: var(--bc-admin-sidebar-bg, #0a0f1a);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideIn} 0.28s cubic-bezier(0.32,0.72,0,1) both;
`

/* ── header ─────────────────────────────────────────────── */
const Header = styled.div`
  background: linear-gradient(135deg, #0e1a2e 0%, #111827 100%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 20px 24px 0;
  flex-shrink: 0;
`

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
`

const GameIcon = styled.div`
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
`

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const HeaderTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 19px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
`

const HeaderMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
`

const MetaChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 3px 8px;
  white-space: nowrap;
`

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${({ $s }) => {
    if ($s === 'active')    return 'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);'
    if ($s === 'finished')  return 'background:rgba(107,114,128,0.15);color:#9ca3af;border:1px solid rgba(107,114,128,0.25);'
    if ($s === 'cancelled') return 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);'
    if ($s === 'scheduled') return 'background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.25);'
    return 'background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);'
  }}
`

const STATUS_DOT = { active: '🟢', finished: '⚫', cancelled: '🔴', scheduled: '🔵', draft: '⚪' }
const STATUS_LABEL = { active: 'Activo', finished: 'Finalizado', cancelled: 'Cancelado', scheduled: 'Programado', draft: 'Borrador' }

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

const HBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: opacity 0.15s, transform 0.15s;
  &:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.88; }
  ${({ $v }) => {
    if ($v === 'success') return 'background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.35);color:#10b981;'
    if ($v === 'danger')  return 'background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.25);color:#ef4444;'
    if ($v === 'primary') return 'background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.35);color:#60a5fa;'
    return 'background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#94a3b8;'
  }}
`

const CloseBtn = styled.button`
  width: 34px; height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.1); color: #f8fafc; }
`

/* ── stats bar ──────────────────────────────────────────── */
const StatsBar = styled.div`
  display: flex;
  gap: 0;
  margin-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
`

const StatItem = styled.div`
  flex: 1;
  padding: 12px 16px;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,0.06);
  &:last-child { border-right: none; }
`

const StatValue = styled.div`
  font-size: 22px;
  font-weight: 900;
  color: ${({ $color }) => $color || '#f8fafc'};
  line-height: 1;
`

const StatLabel = styled.div`
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

/* ── tabs ───────────────────────────────────────────────── */
const TabsRow = styled.div`
  display: flex;
  gap: 0;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 0 24px;
`

const Tab = styled.button`
  padding: 12px 18px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? '#3b82f6' : 'transparent'};
  color: ${({ $active }) => $active ? '#60a5fa' : '#64748b'};
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  &:hover { color: #94a3b8; }
`

/* ── scroll body ────────────────────────────────────────── */
const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`

/* ── search ─────────────────────────────────────────────── */
const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const SearchInput = styled.input`
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 9px 14px;
  color: #f8fafc;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  &::placeholder { color: #4b5563; }
  &:focus { border-color: rgba(59,130,246,0.4); }
`

const RefreshBtn = styled.button`
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #64748b;
  font-size: 15px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, background 0.15s;
  &:hover { color: #94a3b8; background: rgba(255,255,255,0.08); }
`

/* ── participant card ───────────────────────────────────── */
const ParticipantCard = styled.div`
  background: #0e1525;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: ${fadeUp} 0.25s ease both;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(255,255,255,0.12); }
`

const PRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const Avatar = styled.div`
  width: 36px; height: 36px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg || '#1e3a5f'};
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
`

const PName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PTime = styled.span`
  font-size: 11px;
  color: #4b5563;
  white-space: nowrap;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.06)'};
  color: ${({ $color }) => $color || '#94a3b8'};
  border: 1px solid ${({ $border }) => $border || 'rgba(255,255,255,0.1)'};
`

const VoteTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(59,130,246,0.12);
  color: #60a5fa;
  border: 1px solid rgba(59,130,246,0.25);
  white-space: nowrap;
`

const Spacer = styled.span` flex: 1; `

const ReceiptThumb = styled.button`
  width: 38px; height: 38px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  flex-shrink: 0;
  transition: border-color 0.15s;
  &:hover { border-color: rgba(59,130,246,0.4); }
  img { width: 100%; height: 100%; object-fit: cover; }
`

const ReceiptPlaceholder = styled.span`
  width: 38px; height: 38px;
  border-radius: 8px;
  border: 1px dashed rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.02);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  color: #374151;
  flex-shrink: 0;
  cursor: default;
`

/* ── action row ─────────────────────────────────────────── */
const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 10px;
`

const ABtn = styled.button`
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: opacity 0.15s, transform 0.1s;
  &:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.85; }
  ${({ $v }) => {
    if ($v === 'pay')   return 'background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.3);color:#10b981;'
    if ($v === 'reset') return 'background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2);color:#ef4444;'
    if ($v === 'chat')  return 'background:rgba(59,130,246,0.1);border-color:rgba(59,130,246,0.25);color:#60a5fa;'
    return 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#94a3b8;'
  }}
`

const WinnerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border: 1px solid rgba(245,158,11,0.3);
`

/* ── distribution tab ───────────────────────────────────── */
const DistSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const DistTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const DistCard = styled.div`
  background: #0e1525;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const BarLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  min-width: 100px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`

const BarTrack = styled.div`
  flex: 1;
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 5px;
  overflow: hidden;
`

const BarFill = styled.div`
  height: 100%;
  border-radius: 5px;
  background: ${({ $color }) => $color || '#3b82f6'};
  width: ${({ $pct }) => $pct}%;
  transition: width 0.5s ease;
  min-width: ${({ $pct }) => $pct > 0 ? '4px' : '0'};
`

const BarCount = styled.div`
  font-size: 12px;
  color: #64748b;
  min-width: 60px;
  text-align: right;
  white-space: nowrap;
`

const TieBreakBox = styled.div`
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(245,158,11,0.35);
  background: rgba(245,158,11,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TieBreakTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: 6px;
`

const TieBreakBtns = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const TiePayBtn = styled.button`
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: opacity 0.15s, transform 0.1s;
  &:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.88; }
  background: rgba(16,185,129,0.12);
  border-color: rgba(16,185,129,0.3);
  color: #10b981;
`

const AutoPaidBox = styled.div`
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(16,185,129,0.25);
  background: rgba(16,185,129,0.07);
  font-size: 13px;
  color: #10b981;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`

/* ── empty / loading ────────────────────────────────────── */
const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #4b5563;
  font-size: 14px;
`

const Spinner = styled.div`
  width: 24px; height: 24px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.75s linear infinite;
  margin: 40px auto;
`

/* ── mini confirm overlay ───────────────────────────────── */
const ConfirmOverlay = styled.div`
  position: fixed; inset: 0; z-index: 4100;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
`

const ConfirmCard = styled.div`
  background: #131826;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  padding: 28px 24px 20px;
  width: min(360px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
`

const ConfirmText = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  text-align: center;
  line-height: 1.5;
`

const ConfirmBtns = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 4px;
`

const ConfirmBtn = styled.button`
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  ${({ $danger }) => $danger
    ? 'background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.3);color:#ef4444;'
    : 'background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#94a3b8;'}
`

/* ── helpers ─────────────────────────────────────────────── */
const avatarBg = (name) => {
  const COLORS = ['#1e3a5f','#1a3a2e','#3b1a4a','#3a2a1a','#1a2e3a','#2e1a3a']
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

const initials = (name) => {
  const parts = (name || '?').split(/[\s_-]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const fmtTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const fmtAgo = (dateStr) => {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'hace instantes'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

/* ═══════════════════════════════════════════════════════════
   DISTRIBUTION TAB
═══════════════════════════════════════════════════════════ */
function DeferredWinnerBlock({ type, winnerKeys, tied, participants, isFinished, onPayWinners, payingWinners, cfg }) {
  if (!isFinished || !winnerKeys.length) return null

  // Check if already paid
  const winnerParticipants = participants.filter(p => winnerKeys.includes(String(p.vote_key || '').trim()))
  const alreadyPaid = winnerParticipants.some(p => p.reward?.status === 'paid')

  const labelOf = (key) => {
    if (type === 'treasure_chest') {
      const opt = (cfg.options || []).find(o => o.label === key)
      return opt ? `${opt.icon} ${opt.label}` : key
    }
    return `Número ${key}`
  }

  if (alreadyPaid) {
    return (
      <AutoPaidBox>
        ✅ Premio acreditado a los ganadores: {winnerKeys.map(k => <strong key={k} style={{ marginLeft: 4 }}>{labelOf(k)}</strong>)}
        {winnerParticipants.filter(p => p.reward?.status === 'paid').length > 0 && (
          <span style={{ color: '#6ee7b7', marginLeft: 4 }}>
            ({winnerParticipants.filter(p => p.reward?.status === 'paid').length} participante{winnerParticipants.filter(p => p.reward?.status === 'paid').length !== 1 ? 's' : ''})
          </span>
        )}
      </AutoPaidBox>
    )
  }

  if (!tied) {
    const key = winnerKeys[0]
    const count = winnerParticipants.length
    return (
      <TieBreakBox style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
        <TieBreakTitle style={{ color: '#10b981' }}>
          🏆 Ganador: {labelOf(key)} — {count} participante{count !== 1 ? 's' : ''}
        </TieBreakTitle>
        <TieBreakBtns>
          <TiePayBtn
            type="button"
            disabled={payingWinners}
            onClick={() => onPayWinners([key])}
          >
            {payingWinners ? '...' : `💳 Acreditar fichas a ${count} ganador${count !== 1 ? 'es' : ''}`}
          </TiePayBtn>
        </TieBreakBtns>
      </TieBreakBox>
    )
  }

  // Tie
  const tiedCounts = winnerKeys.map(k => ({
    key: k,
    label: labelOf(k),
    count: participants.filter(p => String(p.vote_key || '').trim() === k).length,
  }))

  return (
    <TieBreakBox>
      <TieBreakTitle>
        ⚠️ Hay empate — {winnerKeys.length} opciones con la misma cantidad de votos
      </TieBreakTitle>
      <div style={{ fontSize: 12, color: '#d97706', lineHeight: 1.5 }}>
        Elegí quién cobra. Podés pagar a uno, a varios o a todos los empatados.
      </div>
      <TieBreakBtns>
        {tiedCounts.map(({ key, label, count }) => (
          <TiePayBtn
            key={key}
            type="button"
            disabled={payingWinners}
            onClick={() => onPayWinners([key])}
          >
            {payingWinners ? '...' : `Pagar ${label} (${count})`}
          </TiePayBtn>
        ))}
        <TiePayBtn
          type="button"
          disabled={payingWinners}
          style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)', color: '#f59e0b' }}
          onClick={() => onPayWinners(winnerKeys)}
        >
          {payingWinners ? '...' : `Pagar todos los empatados (${tiedCounts.reduce((a, b) => a + b.count, 0)})`}
        </TiePayBtn>
      </TieBreakBtns>
    </TieBreakBox>
  )
}

function DistributionTab({ event, participants, onPayWinners, payingWinners }) {
  const type = String(event?.type || '').toLowerCase()
  const cfg = event?.config_json || {}
  const isFinished = event?.status === 'finished'

  if (type === 'briefcase') {
    const n = Number(cfg.numbers_count || 5)
    const counts = {}
    for (let i = 1; i <= n; i++) counts[i] = 0
    participants.forEach(p => { const k = String(p.vote_key || '').trim(); if (k && counts[k] !== undefined) counts[k]++ })
    const votedCounts = Object.values(counts).filter(v => v > 0)
    const minVotes = votedCounts.length ? Math.min(...votedCounts) : 0
    const maxVotes = Math.max(...Object.values(counts), 1)
    const total = participants.filter(p => p.vote_key).length
    const winnerKeys = votedCounts.length ? Object.keys(counts).filter(k => counts[k] === minVotes) : []
    const tied = winnerKeys.length > 1

    return (
      <DistSection>
        <DistTitle>Distribución de votos — Maletín</DistTitle>
        <DistCard>
          {Array.from({ length: n }, (_, i) => i + 1).map(num => {
            const count = counts[num] || 0
            const pct = maxVotes > 0 ? Math.round(count / maxVotes * 100) : 0
            const isMin = count > 0 && count === minVotes
            return (
              <BarRow key={num}>
                <BarLabel>
                  💼 Número {num}
                  {isMin && <WinnerBadge>{tied ? '🔴 empatado' : '⭐ ganador'}</WinnerBadge>}
                </BarLabel>
                <BarTrack>
                  <BarFill $pct={pct} $color={isMin ? (tied ? '#ef4444' : '#f59e0b') : '#3b82f6'} />
                </BarTrack>
                <BarCount>{count} voto{count !== 1 ? 's' : ''} ({total > 0 ? Math.round(count/total*100) : 0}%)</BarCount>
              </BarRow>
            )
          })}
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>
            Total votantes: {total} · El número con <strong style={{ color: '#f59e0b' }}>menos votos</strong> gana.
          </div>
          <DeferredWinnerBlock
            type={type} winnerKeys={winnerKeys} tied={tied}
            participants={participants} isFinished={isFinished}
            onPayWinners={onPayWinners} payingWinners={payingWinners} cfg={cfg}
          />
        </DistCard>
      </DistSection>
    )
  }

  if (type === 'treasure_chest') {
    const options = cfg.options || []
    const counts = {}
    options.forEach(o => { counts[o.label] = 0 })
    participants.forEach(p => { const k = String(p.vote_key || '').trim(); if (k && counts[k] !== undefined) counts[k]++ })
    const votedCounts = Object.values(counts).filter(v => v > 0)
    const minVotes = votedCounts.length ? Math.min(...votedCounts) : 0
    const maxVotes = Math.max(...Object.values(counts), 1)
    const total = participants.filter(p => p.vote_key).length
    const winnerKeys = votedCounts.length ? Object.keys(counts).filter(k => counts[k] === minVotes) : []
    const tied = winnerKeys.length > 1

    return (
      <DistSection>
        <DistTitle>Distribución de votos — Cofre</DistTitle>
        <DistCard>
          {options.map(opt => {
            const count = counts[opt.label] || 0
            const pct = maxVotes > 0 ? Math.round(count / maxVotes * 100) : 0
            const isMin = count > 0 && count === minVotes
            return (
              <BarRow key={opt.label}>
                <BarLabel>
                  {opt.icon} {opt.label}
                  {isMin && <WinnerBadge>{tied ? '🔴 empatado' : '⭐ ganador'}</WinnerBadge>}
                </BarLabel>
                <BarTrack>
                  <BarFill $pct={pct} $color={isMin ? (tied ? '#ef4444' : '#f59e0b') : '#8b5cf6'} />
                </BarTrack>
                <BarCount>{count} voto{count !== 1 ? 's' : ''} ({total > 0 ? Math.round(count/total*100) : 0}%)</BarCount>
              </BarRow>
            )
          })}
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>
            Total votantes: {total} · La opción con <strong style={{ color: '#f59e0b' }}>menos votos</strong> gana.
          </div>
          <DeferredWinnerBlock
            type={type} winnerKeys={winnerKeys} tied={tied}
            participants={participants} isFinished={isFinished}
            onPayWinners={onPayWinners} payingWinners={payingWinners} cfg={cfg}
          />
        </DistCard>
      </DistSection>
    )
  }

  if (type === 'quiz') {
    const opts = cfg.options || []
    const correct = String(cfg.correct_option || '').toUpperCase()
    const counts = {}
    opts.forEach(o => { counts[o.key] = 0 })
    participants.forEach(p => { const k = String(p.answer || '').trim().toUpperCase(); if (k && counts[k] !== undefined) counts[k]++ })
    const total = participants.filter(p => p.answer).length
    const maxVotes = Math.max(...Object.values(counts), 1)

    return (
      <DistSection>
        <DistTitle>Distribución de respuestas — Quiz</DistTitle>
        <DistCard>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4, lineHeight: 1.5 }}>
            <strong style={{ color: '#f8fafc' }}>Pregunta:</strong> {cfg.question || '—'}
          </div>
          {opts.map(opt => {
            const count = counts[opt.key] || 0
            const pct = maxVotes > 0 ? Math.round(count / maxVotes * 100) : 0
            const isCorrect = opt.key === correct
            return (
              <BarRow key={opt.key}>
                <BarLabel style={{ color: isCorrect ? '#10b981' : '#f1f5f9' }}>
                  {opt.key}. {opt.text}
                  {isCorrect && <Chip $bg="rgba(16,185,129,0.12)" $color="#10b981" $border="rgba(16,185,129,0.25)">✓ Correcta</Chip>}
                </BarLabel>
                <BarTrack>
                  <BarFill $pct={pct} $color={isCorrect ? '#10b981' : '#64748b'} />
                </BarTrack>
                <BarCount>{count} ({total > 0 ? Math.round(count/total*100) : 0}%)</BarCount>
              </BarRow>
            )
          })}
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>
            Total respondieron: {total}
          </div>
        </DistCard>
      </DistSection>
    )
  }

  // Win/loss games
  const won = participants.filter(p => p.is_winner).length
  const lost = participants.length - won
  const total = participants.length
  const winRate = total > 0 ? Math.round(won / total * 100) : 0

  return (
    <DistSection>
      <DistTitle>Estadísticas de juego</DistTitle>
      <DistCard>
        <BarRow>
          <BarLabel>🏆 Ganadores</BarLabel>
          <BarTrack><BarFill $pct={winRate} $color="#10b981" /></BarTrack>
          <BarCount>{won} ({winRate}%)</BarCount>
        </BarRow>
        <BarRow>
          <BarLabel>❌ Sin premio</BarLabel>
          <BarTrack><BarFill $pct={100 - winRate} $color="#374151" /></BarTrack>
          <BarCount>{lost} ({100 - winRate}%)</BarCount>
        </BarRow>
        <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>Total jugaron: {total}</div>
      </DistCard>
    </DistSection>
  )
}

/* ═══════════════════════════════════════════════════════════
   PARTICIPANTS TAB
═══════════════════════════════════════════════════════════ */
function ParticipantRow({ p, eventType, onPay, onReset, onChat, paying, resetting }) {
  const receiptCfg = RECEIPT_CHIP[p.receipt_status] || null
  const rewardCfg  = p.reward ? REWARD_CHIP[p.reward.status] || null : null
  const canPay = p.reward && p.reward.status === 'pending'
  const showReceipt = ['sorteo','briefcase','treasure_chest'].includes(eventType)
  const showVote = ['briefcase','treasure_chest','quiz'].includes(eventType)

  return (
    <ParticipantCard>
      <PRow>
        <Avatar $bg={avatarBg(p.username)}>{initials(p.username)}</Avatar>
        <PName title={p.username}>{p.username || `#${p.client_id}`}</PName>
        <PTime>{fmtTime(p.participated_at)}</PTime>
        <PTime style={{ color: '#374151' }}>({fmtAgo(p.participated_at)})</PTime>

        {showReceipt && receiptCfg && (
          <Chip $bg={receiptCfg.bg} $color={receiptCfg.color} $border={receiptCfg.border}>
            📎 {receiptCfg.label}
          </Chip>
        )}
        {!showReceipt && !receiptCfg && (
          <Chip>Sin depósito requerido</Chip>
        )}

        {showVote && p.vote_key && (
          <VoteTag>
            {eventType === 'quiz' ? `Resp: ${p.vote_key}` : `Votó: ${p.vote_key}`}
            {eventType === 'quiz' && p.is_correct !== null && (
              <span style={{ color: p.is_correct ? '#10b981' : '#ef4444' }}>
                {p.is_correct ? ' ✓' : ' ✗'}
              </span>
            )}
          </VoteTag>
        )}

        {p.is_winner && <WinnerBadge>🏆 Ganador</WinnerBadge>}

        <Spacer />

        {p.reward && rewardCfg && (
          <Chip $bg={rewardCfg.bg} $color={rewardCfg.color} $border={rewardCfg.border}>
            💰 {p.reward.reward_amount?.toLocaleString('es-AR')} fichas · {rewardCfg.label}
          </Chip>
        )}

        {p.receipt_url && (
          <ReceiptThumb
            type="button"
            title="Ver comprobante"
            onClick={() => window.open(resolveUrl(p.receipt_url), '_blank', 'noopener,noreferrer')}
          >
            <img src={resolveUrl(p.receipt_url)} alt="Comprobante" onError={e => { e.currentTarget.style.display = 'none' }} />
          </ReceiptThumb>
        )}
        {showReceipt && !p.receipt_url && (
          <ReceiptPlaceholder title="Sin comprobante">📎</ReceiptPlaceholder>
        )}
      </PRow>

      <ActionRow>
        {canPay && (
          <ABtn $v="pay" type="button" disabled={paying} onClick={() => onPay(p.reward.id)}>
            {paying ? '...' : '💳 Acreditar fichas'}
          </ABtn>
        )}
        {p.chat_id && (
          <ABtn $v="chat" type="button" onClick={() => onChat(p.chat_id)}>
            💬 Ver chat
          </ABtn>
        )}
        <ABtn $v="reset" type="button" disabled={resetting} onClick={() => onReset(p.id, p.username)}>
          {resetting ? '...' : '🔄 Habilitar participación'}
        </ABtn>
      </ActionRow>
    </ParticipantCard>
  )
}

/* ── ranking progress styled pieces ─────────────────────── */
const RankCard = styled.div`
  background: #0e1525;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: ${fadeUp} 0.22s ease both;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(255,255,255,0.12); }
`

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const RankPos = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $top }) => $top === 1 ? 'rgba(245,158,11,0.2)' : $top === 2 ? 'rgba(148,163,184,0.15)' : $top === 3 ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)'};
  color: ${({ $top }) => $top === 1 ? '#f59e0b' : $top === 2 ? '#94a3b8' : $top === 3 ? '#f97316' : '#4b5563'};
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const RankName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  min-width: 100px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RankDate = styled.span`
  font-size: 11px;
  color: #4b5563;
  white-space: nowrap;
`

const RankBarTrack = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
`

const RankBarFill = styled.div`
  height: 100%;
  border-radius: 4px;
  background: ${({ $pct }) => $pct >= 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)'};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.5s ease;
  min-width: ${({ $pct }) => $pct > 0 ? '4px' : '0'};
`

const RankValue = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $done }) => $done ? '#10b981' : '#60a5fa'};
  white-space: nowrap;
  min-width: 90px;
  text-align: right;
`

const MISSION_LABEL = {
  deposit_amount: 'Monto depositado',
  deposit_count:  'Depósitos realizados',
  charge_count:   'Cargas realizadas',
  other:          'Progreso',
}

/* ═══════════════════════════════════════════════════════════
   RANKING PROGRESS TAB
═══════════════════════════════════════════════════════════ */
function RankingProgressTab({ eventId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await eventsApi.rankingParticipants(eventId)
      setData(res)
    } catch (e) {
      setError(e.message || 'Error al cargar el progreso')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>
      {error}
    </div>
  )

  const participants = data?.participants || []
  const missionType = data?.missionType || 'deposit_amount'
  const goal = Number(data?.goal || 0)
  const isAmount = missionType === 'deposit_amount'
  const missionLabel = MISSION_LABEL[missionType] || 'Progreso'

  const fmt = (val) => isAmount
    ? `$${Number(val).toLocaleString('es-AR')}`
    : String(Math.round(val))

  return (
    <DistSection>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <DistTitle>Clasificación — {missionLabel}</DistTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#4b5563' }}>Meta: <strong style={{ color: '#f8fafc' }}>{fmt(goal)}</strong></span>
          <RefreshBtn type="button" title="Actualizar" onClick={load}>↻</RefreshBtn>
        </div>
      </div>

      {participants.length === 0 && (
        <EmptyState>Aún no hay participantes inscritos en este ranking.</EmptyState>
      )}

      {participants.map((p, idx) => {
        const pct = goal > 0 ? Math.min(Math.round((p.progress / goal) * 100), 100) : 0
        const done = pct >= 100
        const pos = idx + 1
        return (
          <RankCard key={p.clientId}>
            <RankRow>
              <RankPos $top={pos}>{pos <= 3 ? ['🥇','🥈','🥉'][pos - 1] : pos}</RankPos>
              <Avatar $bg={avatarBg(p.username)}>{initials(p.username)}</Avatar>
              <RankName title={p.username}>{p.username || `#${p.clientId}`}</RankName>
              <RankDate>desde {fmtTime(p.enrolled_at)}</RankDate>
              <span style={{ flex: 1 }} />
              {done && <Chip $bg="rgba(16,185,129,0.15)" $color="#10b981" $border="rgba(16,185,129,0.3)">✓ Meta cumplida</Chip>}
            </RankRow>
            <RankRow>
              <RankBarTrack>
                <RankBarFill $pct={pct} />
              </RankBarTrack>
              <RankValue $done={done}>{fmt(p.progress)} / {fmt(goal)} ({pct}%)</RankValue>
            </RankRow>
          </RankCard>
        )
      })}
    </DistSection>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN DRAWER
═══════════════════════════════════════════════════════════ */
export default function EventDetailDrawer({ eventId, onClose, onFinish, onCancel, onNavigateChat }) {
  const [tab, setTab]                 = useState('participants')
  const [detail, setDetail]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [paying, setPaying]           = useState(new Set())
  const [resetting, setResetting]     = useState(new Set())
  const [payingWinners, setPayingWinners] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderResult, setReminderResult] = useState(null) // { sent, total }
  const [confirm, setConfirm]         = useState(null) // { message, onOk }
  const [actionLoading, setActionLoading] = useState(false)
  const refreshRef = useRef(null)

  const load = useCallback(async () => {
    setError('')
    setReminderResult(null)
    try {
      const data = await eventsApi.eventDetail(eventId)
      setDetail(data)
      // Auto-switch to distribution tab for finished deferred-reward events
      const evType = String(data?.event?.type || '').toLowerCase()
      const evStatus = String(data?.event?.status || '').toLowerCase()
      if (['briefcase', 'treasure_chest'].includes(evType) && evStatus === 'finished') {
        setTab(t => t === 'participants' ? 'distribution' : t)
      }
    } catch (e) {
      setError(e.message || 'Error al cargar el evento')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    load()
    refreshRef.current = setInterval(load, 20_000)
    return () => clearInterval(refreshRef.current)
  }, [load])

  const event = detail?.event
  const allParticipants = detail?.participants || []
  const isActive = event?.status === 'active'
  const isDeferredType = ['briefcase', 'treasure_chest'].includes(String(event?.type || '').toLowerCase())

  const filtered = search.trim()
    ? allParticipants.filter(p =>
        (p.username || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.client_id).includes(search.trim())
      )
    : allParticipants

  // Stats
  const totalP = allParticipants.length
  const withReceipt = allParticipants.filter(p => p.receipt_status === 'paid').length
  const pendingRewards = allParticipants.filter(p => p.reward?.status === 'pending').length
  const paidRewards = allParticipants.filter(p => p.reward?.status === 'paid').length
  const winners = allParticipants.filter(p => p.is_winner).length
  const nonVoters = isDeferredType
    ? allParticipants.filter(p => p.receipt_status === 'paid' && !p.vote_key).length
    : 0

  const showDistTab    = DISTRIBUTION_GAMES.has(String(event?.type || '').toLowerCase())
  const showRankingTab = String(event?.type || '').toLowerCase() === 'ranking'

  const handlePay = async (rewardId) => {
    setPaying(s => new Set(s).add(rewardId))
    try {
      await eventsApi.payReward(rewardId)
      await load()
    } catch (e) {
      setError(e.message || 'Error al acreditar el premio')
    } finally {
      setPaying(s => { const n = new Set(s); n.delete(rewardId); return n })
    }
  }

  const handlePayWinners = async (voteKeys) => {
    setPayingWinners(true)
    setError('')
    try {
      await eventsApi.payBriefcaseWinners(eventId, voteKeys)
      await load()
    } catch (e) {
      setError(e.message || 'Error al acreditar los premios')
    } finally {
      setPayingWinners(false)
    }
  }

  const handleSendReminder = async () => {
    setSendingReminder(true)
    setError('')
    setReminderResult(null)
    try {
      const res = await eventsApi.sendVoteReminder(eventId)
      setReminderResult(res)
      if (res.sent === 0) {
        setError(`Sin destinatarios: todos los participantes con depósito ya votaron (${res.total} revisados).`)
      }
    } catch (e) {
      setError(e.message || 'Error al enviar los recordatorios')
    } finally {
      setSendingReminder(false)
    }
  }

  const handleReset = (participantId, username) => {
    setConfirm({
      message: `¿Habilitar nueva participación para ${username}? Esto eliminará su participación actual y podrá volver a jugar.`,
      onOk: async () => {
        setResetting(s => new Set(s).add(participantId))
        try {
          await eventsApi.resetParticipation(eventId, participantId)
          await load()
        } catch (e) {
          setError(e.message || 'Error al resetear la participación')
        } finally {
          setResetting(s => { const n = new Set(s); n.delete(participantId); return n })
        }
      },
    })
  }

  const handleFinish = async () => {
    setConfirm({
      message: '¿Finalizar este evento? Quedará como terminado y no se podrán registrar más participaciones.',
      onOk: async () => {
        setActionLoading(true)
        try {
          await eventsApi.finishEvent(eventId)
          onFinish?.()
          onClose()
        } catch (e) {
          setError(e.message || 'Error al finalizar el evento')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleCancel = async () => {
    setConfirm({
      message: '¿Cancelar este evento? Esta acción no se puede deshacer.',
      onOk: async () => {
        setActionLoading(true)
        try {
          await eventsApi.cancelEvent(eventId)
          onCancel?.()
          onClose()
        } catch (e) {
          setError(e.message || 'Error al cancelar el evento')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const type = String(event?.type || '').toLowerCase()
  const gameIcon = GAME_ICONS[type] || '🎮'
  const gameLabel = GAME_LABELS[type] || type

  const fmtPrize = (e) => {
    if (!e?.prize_amount) return null
    return `${Number(e.prize_amount).toLocaleString('es-AR')} ${e.prize_type || 'fichas'}`
  }

  const fmtRange = (e) => {
    if (!e) return ''
    const fmt = (s) => s ? new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
    return `${fmt(e.starts_at)} → ${fmt(e.ends_at)}`
  }

  return createPortal(
    <>
      <Backdrop onClick={onClose} />
      <Panel>

        {/* ── HEADER ── */}
        <Header>
          <HeaderTop>
            <GameIcon>{gameIcon}</GameIcon>
            <HeaderInfo>
              <HeaderTitle>{event?.title || 'Cargando...'}</HeaderTitle>
              <HeaderMeta>
                {event && <StatusBadge $s={event.status}>{STATUS_DOT[event.status]} {STATUS_LABEL[event.status] || event.status}</StatusBadge>}
                <MetaChip>🎮 {gameLabel}</MetaChip>
                {fmtPrize(event) && <MetaChip>💰 {fmtPrize(event)}</MetaChip>}
                {event?.min_deposit_amount > 0 && <MetaChip>💳 Depósito mín. ${Number(event.min_deposit_amount).toLocaleString('es-AR')}</MetaChip>}
                {event && <MetaChip>🕐 {fmtRange(event)}</MetaChip>}
              </HeaderMeta>
            </HeaderInfo>
            <HeaderActions>
              {isActive && isDeferredType && nonVoters > 0 && (
                <HBtn $v="primary" type="button" disabled={sendingReminder} onClick={handleSendReminder}
                  title={`Enviar recordatorio a ${nonVoters} participante${nonVoters !== 1 ? 's' : ''} que aún no votaron`}
                >
                  {sendingReminder ? '...' : `📢 Recordar (${nonVoters})`}
                </HBtn>
              )}
              {isActive && (
                <HBtn $v="success" type="button" disabled={actionLoading} onClick={handleFinish}>
                  ✓ Finalizar
                </HBtn>
              )}
              {isActive && (
                <HBtn $v="danger" type="button" disabled={actionLoading} onClick={handleCancel}>
                  ✕ Cancelar
                </HBtn>
              )}
              <CloseBtn type="button" onClick={onClose}>✕</CloseBtn>
            </HeaderActions>
          </HeaderTop>

          {/* ── STATS BAR ── */}
          <StatsBar>
            <StatItem>
              <StatValue>{totalP}</StatValue>
              <StatLabel>Participantes</StatLabel>
            </StatItem>
            {['sorteo','briefcase','treasure_chest'].includes(type) && (
              <StatItem>
                <StatValue $color="#10b981">{withReceipt}</StatValue>
                <StatLabel>Depósitos ok</StatLabel>
              </StatItem>
            )}
            {isDeferredType && isActive && (
              <StatItem>
                <StatValue $color={nonVoters > 0 ? '#f59e0b' : '#10b981'}>{nonVoters}</StatValue>
                <StatLabel>Sin votar</StatLabel>
              </StatItem>
            )}
            {winners > 0 && (
              <StatItem>
                <StatValue $color="#f59e0b">{winners}</StatValue>
                <StatLabel>Ganadores</StatLabel>
              </StatItem>
            )}
            <StatItem>
              <StatValue $color="#f59e0b">{pendingRewards}</StatValue>
              <StatLabel>Premios pend.</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue $color="#10b981">{paidRewards}</StatValue>
              <StatLabel>Premios pagados</StatLabel>
            </StatItem>
          </StatsBar>
        </Header>

        {/* ── TABS ── */}
        <TabsRow>
          <Tab $active={tab === 'participants'} onClick={() => setTab('participants')}>
            👥 Participantes ({totalP})
          </Tab>
          {showDistTab && (
            <Tab $active={tab === 'distribution'} onClick={() => setTab('distribution')}>
              📊 {['briefcase','treasure_chest'].includes(type) ? 'Distribución de votos' : type === 'quiz' ? 'Respuestas' : 'Estadísticas'}
            </Tab>
          )}
          {showRankingTab && (
            <Tab $active={tab === 'ranking'} onClick={() => setTab('ranking')}>
              📈 Progreso
            </Tab>
          )}
        </TabsRow>

        {/* ── BODY ── */}
        <Body>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}
          {reminderResult && reminderResult.sent > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#10b981', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>✅</span>
              <span>Recordatorio enviado a <strong>{reminderResult.sent}</strong> participante{reminderResult.sent !== 1 ? 's' : ''} que aún no votaron.</span>
            </div>
          )}

          {loading && <Spinner />}

          {/* Participants tab */}
          {!loading && tab === 'participants' && (
            <>
              <SearchRow>
                <SearchInput
                  placeholder="Buscar por usuario o ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <RefreshBtn type="button" title="Actualizar" onClick={load}>↻</RefreshBtn>
              </SearchRow>

              {filtered.length === 0 && (
                <EmptyState>
                  {search ? 'Sin resultados para esa búsqueda.' : 'Aún no hay participantes en este evento.'}
                </EmptyState>
              )}

              {filtered.map(p => (
                <ParticipantRow
                  key={p.id}
                  p={p}
                  eventType={type}
                  onPay={handlePay}
                  onReset={handleReset}
                  onChat={(chatId) => { onNavigateChat?.(chatId); onClose() }}
                  paying={paying.has(p.reward?.id)}
                  resetting={resetting.has(p.id)}
                />
              ))}
            </>
          )}

          {/* Distribution tab */}
          {!loading && tab === 'distribution' && event && (
            <DistributionTab
              event={event}
              participants={allParticipants}
              onPayWinners={handlePayWinners}
              payingWinners={payingWinners}
            />
          )}

          {/* Ranking progress tab */}
          {!loading && tab === 'ranking' && (
            <RankingProgressTab eventId={eventId} />
          )}
        </Body>
      </Panel>

      {/* ── mini confirm ── */}
      {confirm && (
        <ConfirmOverlay onClick={() => setConfirm(null)}>
          <ConfirmCard onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36 }}>⚠️</div>
            <ConfirmText>{confirm.message}</ConfirmText>
            <ConfirmBtns>
              <ConfirmBtn type="button" onClick={() => setConfirm(null)}>Cancelar</ConfirmBtn>
              <ConfirmBtn
                type="button"
                $danger
                onClick={() => { const ok = confirm.onOk; setConfirm(null); ok?.() }}
              >
                Confirmar
              </ConfirmBtn>
            </ConfirmBtns>
          </ConfirmCard>
        </ConfirmOverlay>
      )}
    </>,
    document.body
  )
}
