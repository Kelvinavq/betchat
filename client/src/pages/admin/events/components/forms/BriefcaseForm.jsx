import {
  Card, CardTitle, CardDesc, FieldGrid, Label,
  Input, Textarea,
  NumberGrid, NumberChip,
  Divider,
} from '../../EventsPage.styles.js';

export default function BriefcaseForm({ form, onChange }) {
  const cfg = form.config_json || {};
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } });

  const numbersCount = Math.min(10, Math.max(3, cfg.numbers_count || 5));
  const minDeposit = cfg.min_deposit_amount ?? form.min_deposit_amount ?? 2000;

  const handleMinDeposit = (value) => {
    const num = Number(value);
    onChange({
      ...form,
      min_deposit_amount: num,
      config_json: { ...cfg, min_deposit_amount: num },
    });
  };

  const handleNumbersCount = (value) => {
    const n = Math.min(10, Math.max(3, Number(value)));
    setCfg({ numbers_count: n });
  };

  return (
    <Card>
      <CardTitle>Configuración — Maletín Millonario</CardTitle>
      <CardDesc>
        Los jugadores eligen un número. Al terminar, el número con MENOS votos gana el premio.
      </CardDesc>

      {/* Rule explanation */}
      <div
        style={{
          background: 'rgba(45,125,255,.1)',
          border: '1px solid rgba(45,125,255,.22)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 12,
          color: 'rgba(219,234,254,.85)',
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        <strong>Regla:</strong> Los usuarios que depositen ≥ $
        {minDeposit.toLocaleString()} eligen un número. Al terminar, el número con{' '}
        <strong>MENOS votos gana</strong>. En caso de empate, se elige al azar.
      </div>

      <FieldGrid>
        <Label>
          Nombre del evento
          <Input
            value={form.title || ''}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Maletín Millonario"
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

      <Divider />

      <FieldGrid>
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
          Cantidad de números
          <Input
            type="number"
            min={3}
            max={10}
            value={numbersCount}
            onChange={(e) => handleNumbersCount(e.target.value)}
            placeholder="5"
          />
        </Label>
      </FieldGrid>

      <FieldGrid style={{ marginTop: 12 }}>
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
        <Label>
          Tipo de premio
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13 }}>
            🏆 Fichas
          </div>
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

      <Divider />

      {/* Number preview inside the form */}
      <CardTitle style={{ fontSize: 13, marginBottom: 4 }}>Vista previa de los números</CardTitle>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
        Así verán los números los usuarios ({numbersCount} números en total).
      </p>
      <NumberGrid>
        {Array.from({ length: numbersCount }, (_, i) => (
          <NumberChip key={i + 1}>{i + 1}</NumberChip>
        ))}
      </NumberGrid>
    </Card>
  );
}
