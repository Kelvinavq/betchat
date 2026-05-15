import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Select,
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

const GLOBAL_PRIZE_OPTIONS = [
  { value: 'fichas', label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro', label: 'Otro' },
];

const DEFAULT_PRIZES = [
  { icon: '🏆', label: 'Premio Mayor', prize_type: 'fichas', amount: 500, probability: 10 },
  { icon: '✨', label: 'Sin premio', prize_type: 'none', amount: 0, probability: 90 },
];

const ROW_COLS = '60px 1fr 130px 80px 80px 32px';

const ScratchForm = ({ form, onChange }) => {
  const cfg = form.config_json || {};

  const setCfg = (patch) =>
    onChange({ ...form, config_json: { ...cfg, ...patch } });

  const set = (patch) => onChange({ ...form, ...patch });

  const prizes = cfg.prizes && cfg.prizes.length > 0 ? cfg.prizes : DEFAULT_PRIZES;

  const totalProbability = prizes.reduce((sum, p) => sum + (Number(p.probability) || 0), 0);
  const probOk = totalProbability === 100;

  const updatePrize = (index, patch) => {
    const updated = prizes.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setCfg({ prizes: updated });
  };

  const addPrize = () => {
    setCfg({
      prizes: [
        ...prizes,
        { icon: '🎁', label: 'Nuevo premio', prize_type: 'fichas', amount: 0, probability: 0 },
      ],
    });
  };

  const deletePrize = (index) => {
    setCfg({ prizes: prizes.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardTitle>Configurar Raspa y Gana</CardTitle>
      <CardDesc>
        Define los premios disponibles y su probabilidad de aparición. La suma
        de probabilidades debe ser exactamente 100%.
      </CardDesc>

      {/* Campaign name + Duration */}
      <FieldGrid style={{ marginBottom: 18 }}>
        <Label>
          Nombre de la campaña
          <Input
            value={form.title || ''}
            placeholder="Ej: Raspa y Gana de Verano"
            onChange={(e) => set({ title: e.target.value })}
          />
        </Label>
        <Label>
          Duración (minutos)
          <Input
            type="number"
            min={1}
            value={form.duration_minutes || ''}
            placeholder="Ej: 45"
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

      {/* Prizes list */}
      <CardTitle>Premios y probabilidades</CardTitle>

      {/* Header row */}
      <ListRow $cols={ROW_COLS} style={{ borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Icono</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Etiqueta</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Tipo</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Monto</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Prob%</span>
        <span />
      </ListRow>

      {prizes.map((prize, i) => (
        <ListRow key={i} $cols={ROW_COLS}>
          {/* Emoji icon */}
          <Input
            value={prize.icon || ''}
            placeholder="🏆"
            style={{ padding: '8px 6px', textAlign: 'center', fontSize: 18 }}
            onChange={(e) => updatePrize(i, { icon: e.target.value })}
          />
          {/* Label */}
          <Input
            value={prize.label || ''}
            placeholder="Nombre del premio"
            style={{ padding: '8px 10px' }}
            onChange={(e) => updatePrize(i, { label: e.target.value })}
          />
          {/* Prize type */}
          <Select
            value={prize.prize_type || 'fichas'}
            style={{ padding: '8px 10px' }}
            onChange={(e) => updatePrize(i, { prize_type: e.target.value })}
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
            style={{ padding: '8px 10px' }}
            onChange={(e) => updatePrize(i, { amount: Number(e.target.value) })}
          />
          {/* Probability */}
          <Input
            type="number"
            min={0}
            max={100}
            value={prize.probability ?? ''}
            placeholder="%"
            style={{ padding: '8px 10px' }}
            onChange={(e) => updatePrize(i, { probability: Number(e.target.value) })}
          />
          {/* Delete */}
          <DeleteRowBtn
            type="button"
            title="Eliminar premio"
            onClick={() => deletePrize(i)}
          >
            ×
          </DeleteRowBtn>
        </ListRow>
      ))}

      <AddRowBtn type="button" onClick={addPrize}>
        + Agregar premio
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

      <Divider />

      {/* Global event prize */}
      <CardTitle>Premio global del evento</CardTitle>
      <CardDesc>
        Premio base asociado al evento (opcional, se usa para reportes globales).
      </CardDesc>

      <FieldGrid>
        <Label>
          Tipo de premio global
          <Select
            value={form.prize_type || 'fichas'}
            onChange={(e) => set({ prize_type: e.target.value })}
          >
            {GLOBAL_PRIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          Monto del premio global
          <Input
            type="number"
            min={0}
            value={form.prize_amount ?? ''}
            placeholder="Ej: 0"
            onChange={(e) => set({ prize_amount: Number(e.target.value) })}
          />
        </Label>
      </FieldGrid>
    </Card>
  );
};

export default ScratchForm;
