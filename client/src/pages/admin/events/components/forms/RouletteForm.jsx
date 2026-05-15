import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Select,
  ColorInput,
  ListRow,
  AddRowBtn,
  DeleteRowBtn,
  ProbTotal,
  ProbBar,
  ProbFill,
  ProbLabel,
  Divider,
} from '../../EventsPage.styles.js';

const PRIZE_TYPE_OPTIONS = [
  { value: 'fichas', label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro', label: 'Otro' },
  { value: 'none', label: 'Sin premio' },
];

const DEFAULT_SEGMENTS = [
  { color: '#ef4444', label: 'Premio Mayor', icon: '🏆', prize_type: 'fichas', amount: 500, probability: 20 },
  { color: '#f59e0b', label: 'Premio Medio', icon: '🥈', prize_type: 'fichas', amount: 200, probability: 20 },
  { color: '#10b981', label: 'Premio Menor', icon: '🥉', prize_type: 'fichas', amount: 50, probability: 20 },
  { color: '#2563eb', label: 'Bonus 200%', icon: '🎁', prize_type: 'bono_200', amount: 0, probability: 20 },
  { color: '#7c3aed', label: 'Sin premio', icon: '⚪', prize_type: 'none', amount: 0, probability: 20 },
];

// color | label | icon | prize_type | amount | prob% | delete
const ROW_COLS = '48px 1fr 60px 1fr 80px 80px 32px';

const RouletteForm = ({ form, onChange }) => {
  const cfg = form.config_json || {};

  const setCfg = (patch) =>
    onChange({ ...form, config_json: { ...cfg, ...patch } });

  const set = (patch) => onChange({ ...form, ...patch });

  const segments =
    cfg.segments && cfg.segments.length > 0 ? cfg.segments : DEFAULT_SEGMENTS;

  const totalProbability = segments.reduce(
    (sum, s) => sum + (Number(s.probability) || 0),
    0,
  );
  const probOk = totalProbability === 100;

  const updateSegment = (index, patch) => {
    const updated = segments.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    setCfg({ segments: updated });
  };

  const addSegment = () => {
    const nextCount = segments.length + 1;
    const equalProbability = Math.max(1, Math.floor(100 / nextCount));
    setCfg({
      segments: [
        ...segments,
        {
          color: '#6366f1',
          label: 'Nuevo segmento',
          icon: '🎯',
          prize_type: 'fichas',
          amount: 0,
          probability: equalProbability,
        },
      ],
    });
  };

  const deleteSegment = (index) => {
    setCfg({ segments: segments.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardTitle>Configurar Ruleta</CardTitle>
      <CardDesc>
        Define los segmentos de la rueda con colores, iconos y premios. La suma
        de probabilidades debe ser exactamente 100%.
      </CardDesc>

      {/* Name + Duration */}
      <FieldGrid style={{ marginBottom: 18 }}>
        <Label>
          Nombre de la ruleta
          <Input
            value={form.title || ''}
            placeholder="Ej: Ruleta VIP"
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

      <div style={{ marginTop: 12 }}>
        <Label>
          Fecha y hora de inicio
          <Input
            type="datetime-local"
            value={form.starts_at || ''}
            onChange={(e) => set({ starts_at: e.target.value })}
          />
        </Label>
      </div>

      <Divider />

      <CardTitle>Segmentos de la ruleta</CardTitle>

      {/* Header row */}
      <ListRow
        $cols={ROW_COLS}
        style={{
          borderBottom: '1px solid rgba(255,255,255,.1)',
          paddingBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Color</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Etiqueta</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Icono</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Tipo</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Monto</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Prob%</span>
        <span />
      </ListRow>

      {segments.map((seg, i) => (
        <ListRow key={i} $cols={ROW_COLS}>
          {/* Color picker with live preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ColorInput
              value={seg.color || '#6366f1'}
              title="Elige el color del segmento"
              onChange={(e) => updateSegment(i, { color: e.target.value })}
              style={{ width: 40, height: 36 }}
            />
          </div>

          {/* Label */}
          <Input
            value={seg.label || ''}
            placeholder="Etiqueta"
            style={{ padding: '8px 10px' }}
            onChange={(e) => updateSegment(i, { label: e.target.value })}
          />

          {/* Icon (emoji) */}
          <Input
            value={seg.icon || ''}
            placeholder="🎁"
            style={{ padding: '8px 6px', textAlign: 'center', fontSize: 18 }}
            onChange={(e) => updateSegment(i, { icon: e.target.value })}
          />

          {/* Prize type */}
          <Select
            value={seg.prize_type || 'fichas'}
            style={{ padding: '8px 10px' }}
            onChange={(e) => updateSegment(i, { prize_type: e.target.value })}
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
            value={seg.amount ?? ''}
            placeholder="0"
            style={{ padding: '8px 10px' }}
            onChange={(e) => updateSegment(i, { amount: Number(e.target.value) })}
          />

          {/* Probability */}
          <Input
            type="number"
            min={0}
            max={100}
            value={seg.probability ?? ''}
            placeholder="%"
            style={{ padding: '8px 10px' }}
            onChange={(e) =>
              updateSegment(i, { probability: Number(e.target.value) })
            }
          />

          {/* Delete */}
          <DeleteRowBtn
            type="button"
            title="Eliminar segmento"
            onClick={() => deleteSegment(i)}
          >
            ×
          </DeleteRowBtn>
        </ListRow>
      ))}

      <AddRowBtn type="button" onClick={addSegment}>
        + Agregar segmento
      </AddRowBtn>

      {/* Probability bar */}
      <ProbTotal>
        <ProbLabel $ok={probOk}>Total: {totalProbability}%</ProbLabel>
        <ProbBar>
          <ProbFill
            $ok={probOk}
            style={{ width: `${Math.min(totalProbability, 100)}%` }}
          />
        </ProbBar>
        {!probOk && (
          <ProbLabel $ok={false}>
            {totalProbability < 100
              ? `Faltan ${100 - totalProbability}%`
              : `Excede por ${totalProbability - 100}%`}
          </ProbLabel>
        )}
      </ProbTotal>

      {!probOk && (
        <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
          La suma de probabilidades debe ser exactamente 100%.
        </p>
      )}

      {/* Visual segment preview */}
      {segments.length > 0 && (
        <>
          <Divider />
          <CardTitle>Vista previa de colores</CardTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {segments.map((seg, i) => (
              <div
                key={i}
                style={{
                  background: seg.color || '#6366f1',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {seg.icon} {seg.label}
                <span style={{ opacity: 0.7, fontWeight: 400 }}>
                  ({seg.probability}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default RouletteForm;
