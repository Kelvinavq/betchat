import { useState, useRef } from 'react'
import styled from 'styled-components'
import {
  Card, CardTitle, CardDesc, FieldGrid, Label, Input, Select, Divider,
} from '../../EventsPage.styles.js'

const PRIZE_TYPE_OPTIONS = [
  { value: 'fichas',   label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro',     label: 'Otro' },
  { value: 'none',     label: 'Sin premio' },
]

const GLOBAL_PRIZE_OPTIONS = [
  { value: 'fichas',   label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro',     label: 'Otro' },
]

const BLANK = { icon: '✨', label: 'Sin premio', prize_type: 'none', amount: 0 }

const DEFAULT_GRID = [
  { ...BLANK },
  { icon: '💰', label: 'Bono',         prize_type: 'bono_200', amount: 200 },
  { ...BLANK },
  { icon: '🎁', label: 'Premio',       prize_type: 'fichas',   amount: 100 },
  { icon: '🏆', label: 'Premio Mayor', prize_type: 'fichas',   amount: 500 },
  { icon: '🎁', label: 'Premio',       prize_type: 'fichas',   amount: 100 },
  { ...BLANK },
  { icon: '💰', label: 'Bono',         prize_type: 'bono_200', amount: 200 },
  { ...BLANK },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 16px 0 8px;
  max-width: 228px;
`

const GridCell = styled.div`
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid ${({ $selected, $over }) =>
    $over     ? '#3b82f6'               :
    $selected ? 'rgba(59,130,246,0.55)' :
    'rgba(255,255,255,0.08)'};
  background: ${({ $over, $selected }) =>
    $over     ? 'rgba(59,130,246,0.12)' :
    $selected ? 'rgba(59,130,246,0.07)' :
    'rgba(255,255,255,0.04)'};
  opacity: ${({ $dragging }) => $dragging ? 0.28 : 1};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: grab;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
  user-select: none;
  padding: 6px 4px;
  position: relative;
  &:active { cursor: grabbing; }
`

const CellNumber = styled.span`
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 8px;
  font-weight: 600;
  color: rgba(255,255,255,0.22);
`

const CellIcon = styled.span`
  font-size: 22px;
  line-height: 1;
`

const CellLabel = styled.span`
  font-size: 8.5px;
  color: rgba(255,255,255,0.45);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
`

const EditorWrap = styled.div`
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 14px;
  background: rgba(255,255,255,0.02);
  margin-top: 4px;
`

const EditorHead = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.38);
  margin-bottom: 12px;
`

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`

const SmallBtn = styled.button`
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.52);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.82); }
`

const WinNote = styled.div`
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  background: ${({ $ok }) => $ok ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)'};
  border: 1px solid ${({ $ok }) => $ok ? 'rgba(16,185,129,0.20)' : 'rgba(245,158,11,0.20)'};
  color: ${({ $ok }) => $ok ? '#10b981' : '#f59e0b'};
`

const HintText = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  margin: 4px 0 0;
`

// ── Component ─────────────────────────────────────────────────────────────────

const ScratchForm = ({ form, onChange }) => {
  const cfg    = form.config_json || {}
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } })
  const set    = (patch) => onChange({ ...form, ...patch })

  // Detect old probability-based format and fall back to default grid
  const raw         = cfg.prizes || []
  const isOldFormat = raw.some(p => 'probability' in p) || (raw.length > 0 && raw.length !== 9)
  const grid        = raw.length === 9 && !isOldFormat ? raw : DEFAULT_GRID

  const [selectedIdx, setSelectedIdx] = useState(0)
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

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const cleanup = () => {
    dragFrom.current = null
    setDraggingIdx(null)
    setOverIdx(null)
  }

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

  const sigOf = c => `${c.icon}|${c.label}|${c.prize_type}|${c.amount}`
  const counts = {}
  grid.forEach(c => { const k = sigOf(c); counts[k] = (counts[k] || 0) + 1 })
  const winTypes = [...new Set(
    grid
      .filter(c => c.prize_type !== 'none' && Number(c.amount) > 0 && counts[sigOf(c)] >= 3)
      .map(sigOf)
  )]
  const hasWin = winTypes.length > 0

  const sel = grid[selectedIdx] || BLANK

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardTitle>Configurar Raspa y Gana</CardTitle>
      <CardDesc>
        Definí el contenido exacto de cada celda del tablero 3×3. Arrastrá para reordenar. Hacé clic en una celda para editarla.
      </CardDesc>

      {/* Campaign fields */}
      <FieldGrid style={{ marginBottom: 18 }}>
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
      </FieldGrid>

      <div style={{ marginBottom: 16 }}>
        <Label>
          Fecha y hora de inicio
          <Input
            type="datetime-local"
            value={form.starts_at || ''}
            onChange={e => set({ starts_at: e.target.value })}
          />
        </Label>
      </div>

      <Divider />

      <CardTitle>Tablero del juego</CardTitle>

      {isOldFormat && (
        <WinNote $ok={false} style={{ marginBottom: 8 }}>
          Este evento usaba probabilidades. Se cargó el tablero por defecto — revisá las celdas y guardá para actualizarlo.
        </WinNote>
      )}

      {/* 3×3 drag grid */}
      <GridWrap>
        {grid.map((cell, i) => (
          <GridCell
            key={i}
            $selected={selectedIdx === i}
            $dragging={draggingIdx === i}
            $over={overIdx === i}
            draggable
            onClick={() => setSelectedIdx(i)}
            onDragStart={e => onDragStart(e, i)}
            onDragOver={e => onDragOver(e, i)}
            onDragLeave={() => setOverIdx(null)}
            onDrop={e => onDrop(e, i)}
            onDragEnd={cleanup}
          >
            <CellNumber>{i + 1}</CellNumber>
            <CellIcon>{cell.icon || '✨'}</CellIcon>
            <CellLabel>{cell.label || 'Sin premio'}</CellLabel>
          </GridCell>
        ))}
      </GridWrap>

      <HintText>Arrastrá las celdas para cambiar su posición en el tablero.</HintText>

      <WinNote $ok={hasWin}>
        {hasWin
          ? `✓ ${winTypes.length} tipo(s) de premio aparecen 3+ veces — combinación ganadora posible.`
          : '⚠ Ningún premio se repite 3 veces. El jugador nunca podrá ganar. Repetí al menos un premio en 3 celdas.'}
      </WinNote>

      <Divider />

      {/* Cell editor */}
      <CardTitle>Celda {selectedIdx + 1} — Editar contenido</CardTitle>
      <EditorWrap>
        <EditorHead>Campos de la celda {selectedIdx + 1} de 9</EditorHead>
        <FieldGrid>
          <Label>
            Ícono (emoji)
            <Input
              value={sel.icon || ''}
              placeholder="🏆"
              style={{ fontSize: 20, textAlign: 'center' }}
              onChange={e => updateCell(selectedIdx, { icon: e.target.value })}
            />
          </Label>
          <Label>
            Etiqueta
            <Input
              value={sel.label || ''}
              placeholder="Premio Mayor"
              onChange={e => updateCell(selectedIdx, { label: e.target.value })}
            />
          </Label>
          <Label>
            Tipo de premio
            <Select
              value={sel.prize_type || 'none'}
              onChange={e => updateCell(selectedIdx, { prize_type: e.target.value })}
            >
              {PRIZE_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Label>
          <Label>
            Monto
            <Input
              type="number"
              min={0}
              value={sel.amount ?? ''}
              placeholder="0"
              onChange={e => updateCell(selectedIdx, { amount: Number(e.target.value) })}
            />
          </Label>
        </FieldGrid>

        <BtnRow>
          <SmallBtn type="button" onClick={fillBlanks}>
            Copiar a celdas sin premio
          </SmallBtn>
          <SmallBtn type="button" onClick={fillAll}>
            Aplicar a todo el tablero
          </SmallBtn>
        </BtnRow>
      </EditorWrap>

      <Divider />

      {/* Global event prize */}
      <CardTitle>Premio global del evento</CardTitle>
      <CardDesc>Premio base para reportes globales (opcional).</CardDesc>
      <FieldGrid>
        <Label>
          Tipo
          <Select
            value={form.prize_type || 'fichas'}
            onChange={e => set({ prize_type: e.target.value })}
          >
            {GLOBAL_PRIZE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Label>
        <Label>
          Monto
          <Input
            type="number"
            min={0}
            value={form.prize_amount ?? ''}
            placeholder="0"
            onChange={e => set({ prize_amount: Number(e.target.value) })}
          />
        </Label>
      </FieldGrid>
    </Card>
  )
}

export default ScratchForm
