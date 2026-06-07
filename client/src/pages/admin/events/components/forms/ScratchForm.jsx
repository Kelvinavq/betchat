import { useEffect, useState, useRef } from 'react'
import styled from 'styled-components'
import {
  Card, CardTitle, CardDesc, FieldGrid, Label, Input, Divider,
} from '../../EventsPage.styles.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_WIN_RULE = {
  match_count: 3,
  label: 'Premio único',
  amount: 500,
  enabled: true,
}

const EMOJI_CATEGORIES = [
  {
    label: 'Premios',
    emojis: ['🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '🎗️'],
  },
  {
    label: 'Dinero',
    emojis: ['💰', '💵', '💸', '🤑', '💎', '💍', '🪙', '💴'],
  },
  {
    label: 'Regalos',
    emojis: ['🎁', '🎀', '🎊', '🎉', '🎈', '🎯', '🎲', '🃏'],
  },
  {
    label: 'Estrellas',
    emojis: ['⭐', '🌟', '💫', '✨', '🌠', '🔥', '⚡', '💥'],
  },
  {
    label: 'Suerte',
    emojis: ['🍀', '🌈', '🦋', '🚀', '🎰', '🪄', '🔮', '🌙'],
  },
  {
    label: 'Frutas',
    emojis: ['🍒', '🍋', '🍊', '🍇', '🍓', '🍉', '🍑', '🫐'],
  },
]

const BLANK = { icon: '✨', label: 'Sin premio', prize_type: 'none', amount: 0 }

const DEFAULT_GRID = [
  { ...BLANK },
  { icon: '💰', label: 'Premio',       prize_type: 'fichas', amount: 0 },
  { ...BLANK },
  { icon: '🎁', label: 'Premio',       prize_type: 'fichas', amount: 0 },
  { icon: '🏆', label: 'Premio Mayor', prize_type: 'fichas', amount: 0 },
  { icon: '🎁', label: 'Premio',       prize_type: 'fichas', amount: 0 },
  { ...BLANK },
  { icon: '💰', label: 'Premio',       prize_type: 'fichas', amount: 0 },
  { ...BLANK },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const BoardLayout = styled.div`
  display: flex;
  gap: 18px;
  align-items: flex-start;
  flex-wrap: wrap;
`

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 80px);
  gap: 7px;
  flex-shrink: 0;
`

const GridCell = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 2px solid ${({ $selected, $over, $hasPrize }) =>
    $over     ? '#3b82f6'
    : $selected ? '#3b82f6'
    : $hasPrize ? 'rgba(16,185,129,0.35)'
    : 'rgba(255,255,255,0.08)'};
  background: ${({ $over, $selected, $hasPrize }) =>
    $over     ? 'rgba(59,130,246,0.14)'
    : $selected ? 'rgba(59,130,246,0.10)'
    : $hasPrize ? 'rgba(16,185,129,0.06)'
    : 'rgba(255,255,255,0.03)'};
  opacity: ${({ $dragging }) => $dragging ? 0.25 : 1};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s, transform 0.12s;
  user-select: none;
  padding: 6px 4px 8px;
  position: relative;
  &:hover { transform: scale(1.04); }
  &:active { cursor: grabbing; }
`

const CellNum = styled.span`
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 9px;
  font-weight: 700;
  color: ${({ $selected }) => $selected ? 'rgba(147,197,253,0.8)' : 'rgba(255,255,255,0.22)'};
`

const CellIcon = styled.span`
  font-size: 26px;
  line-height: 1;
`

const CellLabel = styled.span`
  font-size: 8px;
  color: rgba(255,255,255,0.45);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
`

const CellAmount = styled.span`
  font-size: 9px;
  font-weight: 700;
  color: #10b981;
`

// Cell editor panel
const EditorPanel = styled.div`
  flex: 1;
  min-width: 220px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const EditorCellPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(59,130,246,0.07);
  border: 1px solid rgba(59,130,246,0.20);
  border-radius: 10px;
`

const EditorCellBadge = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
`

const EditorCellInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EditorCellName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
`

const EditorCellSub = styled.div`
  font-size: 11px;
  color: rgba(255,255,255,0.4);
`

const TypeToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
`

const TypeBtn = styled.button`
  padding: 9px 6px;
  border-radius: 8px;
  border: 1.5px solid ${({ $active }) => $active ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'};
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? '#93c5fd' : 'rgba(255,255,255,0.45)'};
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: rgba(59,130,246,0.45); color: rgba(255,255,255,0.75); }
`

const QuickActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const QuickBtn = styled.button`
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.8); }
`

// Prize summary
const PrizeSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
`

const PrizeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid ${({ $ok }) => $ok ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.30)'};
  background: ${({ $ok }) => $ok ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.06)'};
  color: ${({ $ok }) => $ok ? '#6ee7b7' : '#fcd34d'};
`

const CountDot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $ok }) => $ok ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.20)'};
  font-size: 10px;
  font-weight: 800;
`

const WinNote = styled.div`
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  background: ${({ $ok }) => $ok ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)'};
  border: 1px solid ${({ $ok }) => $ok ? 'rgba(16,185,129,0.20)' : 'rgba(245,158,11,0.20)'};
  color: ${({ $ok }) => $ok ? '#10b981' : '#f59e0b'};
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.35);
  margin-bottom: 6px;
`

const HintText = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.25);
  margin: 4px 0 0;
  text-align: center;
`

const WinRuleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.06)'};
  flex-wrap: wrap;
`

// Emoji picker
const EmojiPickerWrap = styled.div`
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: rgba(0,0,0,0.20);
  overflow: hidden;
`

const EmojiPickerTabs = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const EmojiTab = styled.button`
  flex-shrink: 0;
  padding: 7px 12px;
  border: none;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? '#93c5fd' : 'rgba(255,255,255,0.38)'};
  font-size: 11px;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  font-family: inherit;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? '#3b82f6' : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { color: rgba(255,255,255,0.7); }
`

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 8px;
`

const EmojiBtn = styled.button`
  aspect-ratio: 1;
  border-radius: 6px;
  border: none;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.18)' : 'transparent'};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.12s;
  outline: ${({ $active }) => $active ? '1.5px solid rgba(59,130,246,0.5)' : 'none'};
  &:hover { background: rgba(255,255,255,0.08); transform: scale(1.15); }
  &:active { transform: scale(0.95); }
`

// ── Component ─────────────────────────────────────────────────────────────────

const ScratchForm = ({ form, onChange }) => {
  const cfg    = form.config_json || {}
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } })
  const set    = (patch) => onChange({ ...form, ...patch })

  const raw         = cfg.prizes || []
  const isOldFormat = raw.some(p => 'probability' in p) || (raw.length > 0 && raw.length !== 9)
  const grid        = raw.length === 9 && !isOldFormat ? raw : DEFAULT_GRID

  const rawRules = cfg.win_rules
  const rawWinRule = Array.isArray(rawRules) ? rawRules[0] : rawRules
  const winRule = rawWinRule && typeof rawWinRule === 'object'
    ? { ...DEFAULT_WIN_RULE, ...rawWinRule, amount: Number(rawWinRule.amount ?? form.prize_amount ?? DEFAULT_WIN_RULE.amount) || 0, match_count: 3 }
    : { ...DEFAULT_WIN_RULE, amount: Number(form.prize_amount ?? DEFAULT_WIN_RULE.amount) || 0 }
  const winRules = [winRule]
  const [winAmountDraft, setWinAmountDraft] = useState(() => String(winRule.amount ?? ''))

  useEffect(() => {
    setWinAmountDraft(String(winRule.amount ?? ''))
  }, [winRule.amount])

  const updateWinRule = (patch) => {
    const next = { ...winRule, ...patch, match_count: 3 }
    onChange({
      ...form,
      prize_type: 'fichas',
      prize_amount: Number(next.amount) || 0,
      config_json: {
        ...cfg,
        win_rules: [next],
      },
    })
  }

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [emojiTab, setEmojiTab] = useState(0)
  const dragFrom    = useRef(null)
  const [draggingIdx, setDraggingIdx] = useState(null)
  const [overIdx,     setOverIdx]     = useState(null)

  // ── Cell editing ────────────────────────────────────────────────────────────

  const updateCell = (idx, patch) => {
    const next = grid.map((c, i) => i === idx ? { ...c, ...patch } : c)
    setCfg({ prizes: next })
  }

  const fillBlanks = () => {
    const src  = grid[selectedIdx]
    const next = grid.map(c => c.prize_type === 'none' ? { ...src } : c)
    setCfg({ prizes: next })
  }

  const fillAll = () => {
    const src  = grid[selectedIdx]
    const next = grid.map(() => ({ ...src }))
    setCfg({ prizes: next })
  }

  const resetGrid = () => setCfg({ prizes: DEFAULT_GRID })

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const cleanup = () => { dragFrom.current = null; setDraggingIdx(null); setOverIdx(null) }

  const onDragStart = (e, i) => {
    dragFrom.current = i
    setDraggingIdx(i)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, i) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (i !== overIdx) setOverIdx(i)
  }

  const onDrop = (e, i) => {
    e.preventDefault()
    const from = dragFrom.current
    if (from === null || from === i) { cleanup(); return }
    const next = [...grid]
    ;[next[from], next[i]] = [next[i], next[from]]
    setCfg({ prizes: next })
    if (selectedIdx === from) setSelectedIdx(i)
    else if (selectedIdx === i) setSelectedIdx(from)
    cleanup()
  }

  // ── Win analysis ─────────────────────────────────────────────────────────────

  const sigOf = c => `${c.icon}|${c.label}|${c.prize_type}`
  const counts = {}
  grid.forEach(c => { const k = sigOf(c); counts[k] = (counts[k] || 0) + 1 })

  // Unique prizes (excluding blanks)
  const seenSigs = new Set()
  const uniquePrizes = grid.filter(c => {
    if (c.prize_type === 'none') return false
    const sig = sigOf(c)
    if (seenSigs.has(sig)) return false
    seenSigs.add(sig)
    return true
  })

  const sel = grid[selectedIdx] || BLANK

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardTitle>Configurar Raspa y Gana</CardTitle>
      <CardDesc>
        Diseñá el tablero 3×3. El cliente gana cuando forma 3 símbolos iguales en línea horizontal, vertical o diagonal. El premio es único por partida.
      </CardDesc>

      {/* Basic info */}
      <FieldGrid style={{ marginBottom: 4 }}>
        <Label>
          Nombre de la campaña
          <Input
            value={form.title || ''}
            placeholder="Ej: Raspa y Gana de Verano"
            onChange={e => set({ title: e.target.value })}
          />
        </Label>
        <Label>
          Duración (minutos)
          <Input
            type="number"
            min={1}
            value={form.duration_minutes || ''}
            placeholder="Ej: 45"
            onChange={e => set({ duration_minutes: Number(e.target.value) })}
          />
        </Label>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>
            Fecha y hora de inicio
            <Input
              type="datetime-local"
              value={form.starts_at || ''}
              onChange={e => set({ starts_at: e.target.value })}
            />
          </Label>
        </div>
      </FieldGrid>

      <Divider />

      {isOldFormat && (
        <WinNote $ok={false} style={{ marginBottom: 12 }}>
          Este evento usaba probabilidades. Se cargó el tablero por defecto — revisá las celdas y guardá para actualizarlo.
        </WinNote>
      )}

      {/* Board + editor side-by-side */}
      <BoardLayout>

        {/* Left — grid */}
        <div>
          <SectionLabel>Tablero 3×3 — clic para editar, arrastrá para mover</SectionLabel>
          <GridWrap>
            {grid.map((cell, i) => (
              <GridCell
                key={i}
                $selected={selectedIdx === i}
                $dragging={draggingIdx === i}
                $over={overIdx === i}
                $hasPrize={cell.prize_type !== 'none'}
                draggable
                onClick={() => setSelectedIdx(i)}
                onDragStart={e => onDragStart(e, i)}
                onDragOver={e => onDragOver(e, i)}
                onDragLeave={() => setOverIdx(null)}
                onDrop={e => onDrop(e, i)}
                onDragEnd={cleanup}
              >
                <CellNum $selected={selectedIdx === i}>{i + 1}</CellNum>
                <CellIcon>{cell.icon || '✨'}</CellIcon>
                <CellLabel>{cell.label || 'Sin premio'}</CellLabel>
                {/* El premio económico se define por línea ganadora, no por celda */}
              </GridCell>
            ))}
          </GridWrap>
          <HintText>Arrastrá las celdas para reordenar</HintText>
        </div>

        {/* Right — cell editor */}
        <EditorPanel>
          <SectionLabel>Editando celda {selectedIdx + 1} de 9</SectionLabel>

              <EditorCellPreview>
                <EditorCellBadge>{sel.icon || '✨'}</EditorCellBadge>
                <EditorCellInfo>
                  <EditorCellName>{sel.label || 'Sin premio'}</EditorCellName>
                  <EditorCellSub>
                    {sel.prize_type === 'none'
                      ? 'Sin premio'
                      : '🏆 Forma parte del tablero ganador'}
                  </EditorCellSub>
                </EditorCellInfo>
              </EditorCellPreview>

          {/* Prize type toggle */}
          <div>
            <SectionLabel>Tipo de celda</SectionLabel>
              <TypeToggle>
                <TypeBtn
                  type="button"
                  $active={sel.prize_type !== 'none'}
                  onClick={() => updateCell(selectedIdx, { prize_type: 'fichas' })}
                >
                  🏆 Con premio
                </TypeBtn>
              <TypeBtn
                type="button"
                $active={sel.prize_type === 'none'}
                onClick={() => updateCell(selectedIdx, { ...BLANK })}
              >
                ✗ Sin premio
              </TypeBtn>
            </TypeToggle>
          </div>

          {/* Fields — only show when prize */}
          {sel.prize_type !== 'none' && (
            <>
              {/* Emoji picker */}
              <div>
                <SectionLabel>Ícono</SectionLabel>
                <EmojiPickerWrap>
                  <EmojiPickerTabs>
                    {EMOJI_CATEGORIES.map((cat, ci) => (
                      <EmojiTab
                        key={ci}
                        type="button"
                        $active={emojiTab === ci}
                        onClick={() => setEmojiTab(ci)}
                      >
                        {cat.label}
                      </EmojiTab>
                    ))}
                  </EmojiPickerTabs>
                  <EmojiGrid>
                    {EMOJI_CATEGORIES[emojiTab].emojis.map(emoji => (
                      <EmojiBtn
                        key={emoji}
                        type="button"
                        $active={sel.icon === emoji}
                        onClick={() => updateCell(selectedIdx, { icon: emoji })}
                        title={emoji}
                      >
                        {emoji}
                      </EmojiBtn>
                    ))}
                  </EmojiGrid>
                </EmojiPickerWrap>
                {/* Manual input fallback */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>O escribí:</span>
                  <Input
                    value={sel.icon || ''}
                    placeholder="🏆"
                    style={{ fontSize: 18, textAlign: 'center', width: 64, padding: '7px 4px' }}
                    onChange={e => updateCell(selectedIdx, { icon: e.target.value })}
                  />
                  <span style={{ fontSize: 22 }}>{sel.icon}</span>
                </div>
              </div>

              <FieldGrid>
                <Label>
                  Etiqueta
                  <Input
                    value={sel.label || ''}
                    placeholder="Premio Mayor"
                    onChange={e => updateCell(selectedIdx, { label: e.target.value })}
                  />
                </Label>
              </FieldGrid>
            </>
          )}

          {/* Quick actions */}
          <div>
            <SectionLabel>Acciones rápidas</SectionLabel>
            <QuickActions>
              <QuickBtn type="button" onClick={fillBlanks}>
                Copiar a celdas vacías
              </QuickBtn>
              <QuickBtn type="button" onClick={fillAll}>
                Aplicar a todo el tablero
              </QuickBtn>
              <QuickBtn type="button" onClick={resetGrid}>
                Restablecer tablero
              </QuickBtn>
            </QuickActions>
          </div>
        </EditorPanel>
      </BoardLayout>

      {/* Prize summary */}
      <div style={{ marginTop: 16 }}>
        <SectionLabel>Símbolos decorativos del tablero</SectionLabel>
        <PrizeSummary>
          {uniquePrizes.map(c => {
            const sig = sigOf(c)
            const count = counts[sig] || 0
            const ok = count >= 2
            return (
              <PrizeBadge key={sig} $ok={ok}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <CountDot $ok={ok}>{count}</CountDot>
              </PrizeBadge>
            )
          })}
          {uniquePrizes.length === 0 && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Sin premios configurados</span>
          )}
        </PrizeSummary>
      </div>

      <Divider />

      {/* Win rules */}
      <div>
        <CardTitle style={{ fontSize: 13, marginBottom: 4 }}>Premio por línea ganadora</CardTitle>
        <CardDesc style={{ margin: '0 0 12px' }}>
          Configurá un único premio. El jugador gana si completa 3 símbolos iguales en fila, columna o diagonal.
        </CardDesc>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {winRules.map((rule, ri) => {
            const matchCount = Number(rule.match_count)
            const enabled    = rule.enabled !== false
            const hasCells   = uniquePrizes.some(c => (counts[sigOf(c)] || 0) >= matchCount)
            return (
              <WinRuleRow key={ri} $active={enabled}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => updateWinRule(ri, { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6', flexShrink: 0 }}
                />
                <span style={{
                  fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                  color: enabled ? '#93c5fd' : 'rgba(255,255,255,0.25)',
                  minWidth: 72,
                }}>
                  {matchCount} iguales en línea
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>→</span>
                <Input
                  value={rule.label || ''}
                  placeholder="Premio Mayor"
                  disabled={!enabled}
                  style={{ width: 130, minWidth: 80 }}
                  onChange={e => updateWinRule(ri, { label: e.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={winAmountDraft}
                    placeholder="500"
                    disabled={!enabled}
                    style={{ width: 80, minWidth: 60 }}
                    onChange={e => {
                      const next = String(e.target.value || '').replace(/[^\d]/g, '')
                      setWinAmountDraft(next)
                      updateWinRule({ amount: next === '' ? 0 : Number(next) })
                    }}
                  />
                </div>
                {enabled && (
                  <span style={{
                    fontSize: 11, whiteSpace: 'nowrap',
                    color: hasCells ? '#10b981' : '#f59e0b',
                  }}>
                    {hasCells ? `✓ posible` : `⚠ necesita ${matchCount} celdas iguales`}
                  </span>
                )}
              </WinRuleRow>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '8px 0 0' }}>
          Si el jugador completa la línea ganadora, se acredita ese premio una sola vez.
        </p>
      </div>
    </Card>
  )
}

export default ScratchForm
