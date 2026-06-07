import { useState } from 'react';
import {
  Card, CardTitle, CardDesc, FieldGrid, Label,
  Input, Textarea,
  OptionChip, OptionEmoji,
  AddRowBtn,
  Divider,
} from '../../EventsPage.styles.js';

const DEFAULT_OPTIONS = [
  { label: 'Diamantes', icon: '💎' },
  { label: 'Monedas', icon: '💰' },
  { label: 'Joyas', icon: '💍' },
];

const deleteBtnStyle = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(239,68,68,.75)',
  color: '#fff',
  fontSize: 12,
  lineHeight: '20px',
  textAlign: 'center',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function TreasureChestForm({ form, onChange }) {
  const cfg = form.config_json || {};
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } });

  const options = cfg.options && cfg.options.length ? cfg.options : DEFAULT_OPTIONS;
  const minDeposit = cfg.min_deposit_amount ?? form.min_deposit_amount ?? 2000;

  /* New option inline state */
  const [newEmoji, setNewEmoji] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleMinDeposit = (value) => {
    const num = Number(value);
    onChange({
      ...form,
      min_deposit_amount: num,
      config_json: { ...cfg, min_deposit_amount: num },
    });
  };

  const removeOption = (index) => {
    setCfg({ options: options.filter((_, i) => i !== index) });
  };

  const addOption = () => {
    const emoji = newEmoji.trim() || '⭐';
    const label = newLabel.trim() || 'Nueva opción';
    setCfg({ options: [...options, { label, icon: emoji }] });
    setNewEmoji('');
    setNewLabel('');
  };

  return (
    <Card>
      <CardTitle>Configuración — Cofre del Tesoro</CardTitle>
      <CardDesc>
        Los jugadores eligen una opción. Al terminar, la opción con MENOS votos gana el premio.
      </CardDesc>

      {/* Rule explanation */}
      <div
        style={{
          background: 'rgba(251,191,36,.08)',
          border: '1px solid rgba(251,191,36,.22)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 12,
          color: 'rgba(253,230,138,.9)',
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        <strong>Regla:</strong> Los usuarios que depositen ≥ ${minDeposit.toLocaleString()} eligen
        una opción. Al terminar, la opción con <strong>MENOS votos gana</strong>.
      </div>

      <FieldGrid>
        <Label>
          Nombre del evento
          <Input
            value={form.title || ''}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Cofre del Tesoro"
          />
        </Label>
        <Label>
          Duración (minutos)
          <Input
            type="number"
            min={1}
            value={form.duration_minutes || ''}
            onChange={(e) => onChange({ ...form, duration_minutes: Number(e.target.value) })}
            placeholder="30"
          />
        </Label>
      </FieldGrid>

      <Divider />

      <Label style={{ marginTop: 12 }}>
        Descripción
        <Textarea
          value={form.description || ''}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Describe el evento..."
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </Label>

      <FieldGrid style={{ marginTop: 12 }}>
        <Label>
          Depósito mínimo ($)
          <Input
            type="number"
            min={0}
            value={minDeposit}
            onChange={(e) => handleMinDeposit(e.target.value)}
            placeholder="2000"
          />
        </Label>
        <Label>
          Monto del premio
          <Input
            type="number"
            min={0}
            value={form.prize_amount || ''}
            onChange={(e) => onChange({ ...form, prize_amount: Number(e.target.value) })}
            placeholder="500"
          />
        </Label>
      </FieldGrid>

      <div style={{ marginTop: 12 }}>
        <Label>
          Fecha y hora de inicio
          <Input
            type="datetime-local"
            value={form.starts_at || ''}
            onChange={(e) => onChange({ ...form, starts_at: e.target.value })}
          />
        </Label>
      </div>

      <Label style={{ marginTop: 12 }}>
        Tipo de premio
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13 }}>
          🏆 Fichas
        </div>
      </Label>

      <Divider />

      {/* Options configuration */}
      <CardTitle style={{ fontSize: 13, marginBottom: 8 }}>Opciones del cofre</CardTitle>

      {/* Preview row of OptionChips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          padding: '12px 0',
        }}
      >
        {options.map((opt, i) => (
          <OptionChip key={i} style={{ position: 'relative' }}>
            <button
              type="button"
              style={deleteBtnStyle}
              onClick={() => removeOption(i)}
              title="Eliminar opción"
            >
              ×
            </button>
            <OptionEmoji>{opt.icon || '⭐'}</OptionEmoji>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opt.label || 'Opción'}
            </span>
          </OptionChip>
        ))}
      </div>

      {/* Add option form */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,.03)',
          border: '1px dashed rgba(255,255,255,.12)',
          borderRadius: 12,
          padding: '10px 12px',
        }}
      >
        <Label style={{ width: 72 }}>
          Emoji
          <Input
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="⭐"
            style={{ textAlign: 'center', fontSize: 20, padding: '8px 4px', width: 64 }}
          />
        </Label>
        <Label style={{ flex: 1, minWidth: 120 }}>
          Etiqueta
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nueva opción"
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
          />
        </Label>
        <button
          type="button"
          onClick={addOption}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '10px 16px',
            background: 'rgba(45,125,255,.22)',
            color: '#dbeafe',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            alignSelf: 'flex-end',
            marginBottom: 0,
          }}
        >
          Agregar
        </button>
      </div>
    </Card>
  );
}
