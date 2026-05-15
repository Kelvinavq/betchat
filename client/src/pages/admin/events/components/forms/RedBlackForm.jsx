import {
  Card, CardTitle, CardDesc, FieldGrid, FieldGroup, Label,
  Input, Select, ColorInput, RangeInput,
  ListRow, AddRowBtn, DeleteRowBtn,
  WinRateRow, WinRateVal, Divider,
  BtnRow, Btn,
} from '../../EventsPage.styles.js';

const DEFAULT_OPTIONS = [
  { label: 'Rojo', color: '#ef4444', icon: '🔴' },
  { label: 'Negro', color: '#111827', icon: '⚫' },
];

export default function RedBlackForm({ form, onChange }) {
  const cfg = form.config_json || {};
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } });

  const options = cfg.options && cfg.options.length >= 2 ? cfg.options : DEFAULT_OPTIONS;
  const winRate = cfg.win_rate ?? 50;

  const updateOption = (index, field, value) => {
    const updated = options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt));
    setCfg({ options: updated });
  };

  const addOption = () => {
    setCfg({
      options: [
        ...options,
        { label: 'Nueva opción', color: '#6366f1', icon: '🔵' },
      ],
    });
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setCfg({ options: options.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardTitle>Configuración — Rojo / Negro</CardTitle>
      <CardDesc>
        Los usuarios eligen una opción. El admin declara el resultado y los ganadores reciben el premio.
      </CardDesc>

      <FieldGrid>
        <Label>
          Nombre del evento
          <Input
            value={form.title || ''}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Rojo o Negro"
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

      <CardTitle style={{ fontSize: 13, marginBottom: 8 }}>Opciones de apuesta</CardTitle>

      {/* Header row */}
      <ListRow $cols="48px 64px 1fr 1fr 32px" style={{ borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Color</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Ícono</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Etiqueta</span>
        <span />
        <span />
      </ListRow>

      {options.map((opt, i) => (
        <ListRow key={i} $cols="48px 64px 1fr 1fr 32px">
          <ColorInput
            value={opt.color || '#000000'}
            onChange={(e) => updateOption(i, 'color', e.target.value)}
            title="Color de la opción"
          />
          <Input
            value={opt.icon || ''}
            onChange={(e) => updateOption(i, 'icon', e.target.value)}
            placeholder="🔴"
            style={{ width: 60, textAlign: 'center', fontSize: 20, padding: '8px 4px' }}
          />
          <Input
            value={opt.label || ''}
            onChange={(e) => updateOption(i, 'label', e.target.value)}
            placeholder="Etiqueta"
          />
          <span />
          <DeleteRowBtn
            type="button"
            onClick={() => removeOption(i)}
            disabled={options.length <= 2}
            title={options.length <= 2 ? 'Mínimo 2 opciones' : 'Eliminar opción'}
          >
            ×
          </DeleteRowBtn>
        </ListRow>
      ))}

      <AddRowBtn type="button" onClick={addOption}>
        + Agregar opción
      </AddRowBtn>

      <Divider />

      <FieldGrid>
        <Label>
          Monto del premio
          <Input
            type="number"
            min={0}
            value={form.prize_amount || ''}
            onChange={(e) => onChange({ ...form, prize_amount: Number(e.target.value) })}
            placeholder="50"
          />
        </Label>
        <Label>
          Tipo de premio
          <Select
            value={form.prize_type || 'fichas'}
            onChange={(e) => onChange({ ...form, prize_type: e.target.value })}
          >
            <option value="fichas">Fichas</option>
            <option value="bono_200">Bono 200%</option>
            <option value="otro">Otro</option>
          </Select>
        </Label>
      </FieldGrid>

      <Divider />

      <Label>
        Tasa de victoria (%)
        <FieldGroup>
          <Input
            type="number"
            min={0}
            max={100}
            value={winRate}
            onChange={(e) => setCfg({ win_rate: Math.min(100, Math.max(0, Number(e.target.value))) })}
            placeholder="50"
          />
          <RangeInput
            min={0}
            max={100}
            value={winRate}
            onChange={(e) => setCfg({ win_rate: Number(e.target.value) })}
          />
        </FieldGroup>
      </Label>

      <WinRateRow>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${winRate}%`,
              borderRadius: 999,
              background: 'linear-gradient(90deg, #ef4444, #2d7dff)',
              transition: 'width .3s',
            }}
          />
        </div>
        <WinRateVal>{winRate}%</WinRateVal>
      </WinRateRow>
    </Card>
  );
}
