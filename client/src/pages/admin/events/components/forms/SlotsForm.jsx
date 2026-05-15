import { useState } from 'react';
import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Select,
  ColorInput,
  RangeInput,
  ListRow,
  AddRowBtn,
  DeleteRowBtn,
  SymbolGrid,
  SymbolChip,
  SymbolEmoji,
  WinRateRow,
  WinRateVal,
  Divider,
} from '../../EventsPage.styles.js';

const PRIZE_TYPE_OPTIONS = [
  { value: 'fichas', label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro', label: 'Otro' },
];

const DEFAULT_SYMBOLS = [
  { icon: '7', label: 'Siete' },
  { icon: '🍒', label: 'Cereza' },
  { icon: '⭐', label: 'Estrella' },
];

const DEFAULT_PRIZES = [
  {
    icon: '7',
    label: 'Jackpot',
    prize_type: 'fichas',
    amount: 1000,
    probability: 5,
    combo: ['7', '7', '7'],
  },
];

const DEFAULT_CONFIG = {
  symbols: DEFAULT_SYMBOLS,
  prizes: DEFAULT_PRIZES,
  win_rate: 35,
  primary_color: '#1e3a8a',
  secondary_color: '#0f172a',
  preview_title: 'Slots',
  button_text: 'JUGAR',
};

// icon | label | prize_type | amount | prob% | combo×3 | delete
const PRIZE_ROW_COLS = '50px 1fr 120px 80px 70px 60px 60px 60px 32px';

const SlotsForm = ({ form, onChange }) => {
  const cfg = { ...DEFAULT_CONFIG, ...(form.config_json || {}) };

  const setCfg = (patch) =>
    onChange({ ...form, config_json: { ...cfg, ...patch } });

  const set = (patch) => onChange({ ...form, ...patch });

  // --- Symbol state for new-symbol input row ---
  const [newIcon, setNewIcon] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const symbols = cfg.symbols && cfg.symbols.length > 0 ? cfg.symbols : DEFAULT_SYMBOLS;
  const prizes = cfg.prizes && cfg.prizes.length > 0 ? cfg.prizes : DEFAULT_PRIZES;

  const symbolsError = symbols.length < 3;

  // Symbols
  const addSymbol = () => {
    if (!newIcon.trim()) return;
    setCfg({ symbols: [...symbols, { icon: newIcon.trim(), label: newLabel.trim() || newIcon.trim() }] });
    setNewIcon('');
    setNewLabel('');
  };

  const deleteSymbol = (index) => {
    setCfg({ symbols: symbols.filter((_, i) => i !== index) });
  };

  // Prizes
  const addPrize = () => {
    setCfg({
      prizes: [
        ...prizes,
        {
          icon: symbols[0]?.icon || '7',
          label: 'Nuevo premio',
          prize_type: 'fichas',
          amount: 0,
          probability: 0,
          combo: [
            symbols[0]?.icon || '7',
            symbols[0]?.icon || '7',
            symbols[0]?.icon || '7',
          ],
        },
      ],
    });
  };

  const deletePrize = (index) => {
    setCfg({ prizes: prizes.filter((_, i) => i !== index) });
  };

  const updatePrize = (index, patch) => {
    const updated = prizes.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setCfg({ prizes: updated });
  };

  const updateCombo = (prizeIndex, comboIndex, value) => {
    const updated = prizes.map((p, i) => {
      if (i !== prizeIndex) return p;
      const combo = [...(p.combo || ['', '', ''])];
      combo[comboIndex] = value;
      return { ...p, combo };
    });
    setCfg({ prizes: updated });
  };

  return (
    <>
      {/* Section 1: Basic Info */}
      <Card>
        <CardTitle>Información básica</CardTitle>
        <FieldGrid>
          <Label>
            Nombre del juego
            <Input
              value={form.title || ''}
              placeholder="Ej: Slots 777"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Label>
          <Label>
            Duración (minutos)
            <Input
              type="number"
              min={1}
              value={form.duration_minutes || ''}
              placeholder="Ej: 60"
              onChange={(e) => set({ duration_minutes: Number(e.target.value) })}
            />
          </Label>
        </FieldGrid>
      </Card>

      <Divider />

      {/* Section 2: Symbols */}
      <Card>
        <CardTitle>Símbolos del carrete</CardTitle>
        <CardDesc>
          Define los símbolos que aparecerán en los carretes. Mínimo 3 símbolos
          requeridos.
        </CardDesc>

        {symbolsError && (
          <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>
            Se necesitan al menos 3 símbolos para que el juego funcione correctamente.
          </p>
        )}

        <SymbolGrid>
          {symbols.map((sym, i) => (
            <SymbolChip key={i}>
              {/* Delete button */}
              <button
                type="button"
                title="Eliminar símbolo"
                onClick={() => deleteSymbol(i)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  border: 'none',
                  background: 'rgba(239,68,68,.2)',
                  color: '#fca5a5',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 0,
                }}
              >
                ×
              </button>
              <SymbolEmoji>{sym.icon}</SymbolEmoji>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,.65)',
                  textAlign: 'center',
                  maxWidth: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sym.label}
              </span>
            </SymbolChip>
          ))}
        </SymbolGrid>

        {/* Add symbol row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={newIcon}
            placeholder="Icono/emoji"
            style={{ width: 90, flexShrink: 0, padding: '8px 10px', fontSize: 18, textAlign: 'center' }}
            onChange={(e) => setNewIcon(e.target.value)}
          />
          <Input
            value={newLabel}
            placeholder="Nombre del símbolo"
            style={{ flex: 1, padding: '8px 10px' }}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button
            type="button"
            onClick={addSymbol}
            style={{
              border: 'none',
              background: 'linear-gradient(180deg,#2d7dff,#1e5ee8)',
              color: '#fff',
              borderRadius: 12,
              padding: '9px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            + Agregar
          </button>
        </div>
      </Card>

      <Divider />

      {/* Section 3: Prizes */}
      <Card>
        <CardTitle>Premios y combinaciones</CardTitle>
        <CardDesc>
          Configura los premios que se otorgan al alinear combinaciones de
          símbolos específicas.
        </CardDesc>

        {/* Header */}
        <ListRow
          $cols={PRIZE_ROW_COLS}
          style={{
            borderBottom: '1px solid rgba(255,255,255,.1)',
            paddingBottom: 6,
          }}
        >
          {['Icono', 'Etiqueta', 'Tipo', 'Monto', 'Prob%', 'Pos 1', 'Pos 2', 'Pos 3', ''].map(
            (h, i) => (
              <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
                {h}
              </span>
            ),
          )}
        </ListRow>

        {prizes.map((prize, pi) => (
          <ListRow key={pi} $cols={PRIZE_ROW_COLS}>
            {/* Icon */}
            <Input
              value={prize.icon || ''}
              placeholder="7"
              style={{ padding: '6px 4px', textAlign: 'center', fontSize: 18 }}
              onChange={(e) => updatePrize(pi, { icon: e.target.value })}
            />
            {/* Label */}
            <Input
              value={prize.label || ''}
              placeholder="Nombre"
              style={{ padding: '6px 8px' }}
              onChange={(e) => updatePrize(pi, { label: e.target.value })}
            />
            {/* Prize type */}
            <Select
              value={prize.prize_type || 'fichas'}
              style={{ padding: '6px 8px' }}
              onChange={(e) => updatePrize(pi, { prize_type: e.target.value })}
            >
              {PRIZE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {/* Amount */}
            <Input
              type="number"
              min={0}
              value={prize.amount ?? ''}
              placeholder="0"
              style={{ padding: '6px 8px' }}
              onChange={(e) => updatePrize(pi, { amount: Number(e.target.value) })}
            />
            {/* Probability */}
            <Input
              type="number"
              min={0}
              max={100}
              value={prize.probability ?? ''}
              placeholder="%"
              style={{ padding: '6px 8px' }}
              onChange={(e) =>
                updatePrize(pi, { probability: Number(e.target.value) })
              }
            />
            {/* Combo selects — 3 positions */}
            {[0, 1, 2].map((ci) => (
              <Select
                key={ci}
                value={(prize.combo || [])[ci] || ''}
                style={{ padding: '6px 4px', fontSize: 15, textAlign: 'center' }}
                onChange={(e) => updateCombo(pi, ci, e.target.value)}
              >
                <option value="">—</option>
                {symbols.map((s, si) => (
                  <option key={si} value={s.icon}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </Select>
            ))}
            {/* Delete */}
            <DeleteRowBtn
              type="button"
              title="Eliminar premio"
              onClick={() => deletePrize(pi)}
            >
              ×
            </DeleteRowBtn>
          </ListRow>
        ))}

        <AddRowBtn type="button" onClick={addPrize}>
          + Agregar premio
        </AddRowBtn>
      </Card>

      <Divider />

      {/* Section 4: Win Rate */}
      <Card>
        <CardTitle>Win Rate</CardTitle>
        <CardDesc>
          Porcentaje de probabilidad general de ganar algo en una tirada.
        </CardDesc>

        <WinRateRow>
          <RangeInput
            min={0}
            max={100}
            step={1}
            value={cfg.win_rate ?? 35}
            onChange={(e) => setCfg({ win_rate: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <WinRateVal>{cfg.win_rate ?? 35}%</WinRateVal>
        </WinRateRow>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>0% (nunca gana)</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>100% (siempre gana)</span>
        </div>
      </Card>

      <Divider />

      {/* Section 5: Appearance */}
      <Card>
        <CardTitle>Apariencia</CardTitle>
        <CardDesc>
          Personaliza los colores y textos que verán los jugadores.
        </CardDesc>

        <FieldGrid>
          {/* Primary color */}
          <Label>
            Color primario
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ColorInput
                value={cfg.primary_color || '#1e3a8a'}
                onChange={(e) => setCfg({ primary_color: e.target.value })}
              />
              <Input
                value={cfg.primary_color || '#1e3a8a'}
                placeholder="#1e3a8a"
                style={{ flex: 1, padding: '9px 12px', fontFamily: 'monospace' }}
                onChange={(e) => setCfg({ primary_color: e.target.value })}
              />
            </div>
          </Label>

          {/* Secondary color */}
          <Label>
            Color secundario
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ColorInput
                value={cfg.secondary_color || '#0f172a'}
                onChange={(e) => setCfg({ secondary_color: e.target.value })}
              />
              <Input
                value={cfg.secondary_color || '#0f172a'}
                placeholder="#0f172a"
                style={{ flex: 1, padding: '9px 12px', fontFamily: 'monospace' }}
                onChange={(e) => setCfg({ secondary_color: e.target.value })}
              />
            </div>
          </Label>

          {/* Preview title */}
          <Label>
            Título en la vista previa
            <Input
              value={cfg.preview_title || ''}
              placeholder="Ej: Slots BetChat"
              onChange={(e) => setCfg({ preview_title: e.target.value })}
            />
          </Label>

          {/* Button text */}
          <Label>
            Texto del botón de juego
            <Input
              value={cfg.button_text || ''}
              placeholder="Ej: JUGAR"
              onChange={(e) => setCfg({ button_text: e.target.value })}
            />
          </Label>
        </FieldGrid>

        {/* Live mini-preview */}
        <div
          style={{
            marginTop: 18,
            borderRadius: 16,
            padding: '14px 18px',
            background: `linear-gradient(135deg, ${cfg.primary_color || '#1e3a8a'}, ${cfg.secondary_color || '#0f172a'})`,
            border: '1px solid rgba(255,255,255,.1)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            {cfg.preview_title || 'Slots'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {(symbols.slice(0, 3)).map((s, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,.08)',
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                  fontSize: 24,
                }}
              >
                {s.icon}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled
            style={{
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              background: 'rgba(255,255,255,.15)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'default',
              width: '100%',
            }}
          >
            {cfg.button_text || 'JUGAR'}
          </button>
        </div>
      </Card>
    </>
  );
};

export default SlotsForm;
