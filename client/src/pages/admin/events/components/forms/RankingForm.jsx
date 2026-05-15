import {
  Card, CardTitle, CardDesc, FieldGrid, Label,
  Input, Textarea, Select, Divider,
} from '../../EventsPage.styles.js';

const MISSION_TYPES = [
  { value: 'deposit_count',  label: 'Cantidad de depósitos' },
  { value: 'deposit_amount', label: 'Monto total depositado' },
  { value: 'charge_count',   label: 'Cantidad de cargas' },
  { value: 'other',          label: 'Otro configurable' },
];

const PERIOD_TYPES = [
  { value: 'daily',   label: 'Diario' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom',  label: 'Personalizado' },
];

export default function RankingForm({ form, onChange }) {
  const cfg = form.config_json || {};
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } });
  const isCustomPeriod = cfg.period_type === 'custom';

  return (
    <Card>
      <CardTitle>Configuración — Ranking / Misión</CardTitle>
      <CardDesc>
        Los jugadores compiten cumpliendo misiones. El que más avance gana el premio al finalizar el período.
      </CardDesc>

      {/* Row 1: Title + Emoji */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <Label style={{ flex: 1 }}>
          Título del ranking
          <Input
            value={form.title || ''}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Ranking Semanal"
          />
        </Label>
        <Label style={{ width: 80, flexShrink: 0 }}>
          Emoji
          <Input
            value={cfg.emoji || ''}
            onChange={(e) => setCfg({ emoji: e.target.value })}
            placeholder="🏆"
            style={{ textAlign: 'center', fontSize: 22, padding: '10px 4px', width: '100%', boxSizing: 'border-box' }}
          />
        </Label>
      </div>

      {/* Row 2: Description full-width */}
      <Label style={{ marginTop: 12 }}>
        Descripción
        <Textarea
          value={form.description || ''}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Describe la misión y los criterios de participación..."
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </Label>

      <Divider />

      {/* Row 3: Mission Type + Goal Amount */}
      <FieldGrid>
        <Label>
          Tipo de misión
          <Select
            value={cfg.mission_type || 'deposit_count'}
            onChange={(e) => setCfg({ mission_type: e.target.value })}
          >
            {MISSION_TYPES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </Label>
        <Label>
          Meta (cantidad / monto)
          <Input
            type="number"
            min={1}
            value={cfg.goal_amount || ''}
            onChange={(e) => setCfg({ goal_amount: Number(e.target.value) })}
            placeholder="10"
          />
        </Label>
      </FieldGrid>

      {/* Row 4: Prize Type + Prize Amount */}
      <FieldGrid style={{ marginTop: 12 }}>
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
        <Label>
          Monto del premio
          <Input
            type="number"
            min={0}
            value={form.prize_amount || ''}
            onChange={(e) => onChange({ ...form, prize_amount: Number(e.target.value) })}
            placeholder="1000"
          />
        </Label>
      </FieldGrid>

      <Divider />

      {/* Row 5: Period Type (+ custom range if needed) */}
      <Label>
        Período del ranking
        <Select
          value={cfg.period_type || 'weekly'}
          onChange={(e) => setCfg({ period_type: e.target.value })}
          style={{ maxWidth: 220 }}
        >
          {PERIOD_TYPES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
      </Label>

      {isCustomPeriod && (
        <div
          style={{
            background: 'rgba(45,125,255,.07)',
            border: '1px solid rgba(45,125,255,.18)',
            borderRadius: 12,
            padding: '12px',
            marginTop: 10,
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(219,234,254,.75)' }}>
            Rango de fechas personalizado
          </p>
          {/* Row 6: Starts At + Ends At */}
          <FieldGrid>
            <Label>
              Fecha de inicio
              <Input
                type="datetime-local"
                value={form.starts_at || ''}
                onChange={(e) => onChange({ ...form, starts_at: e.target.value })}
              />
            </Label>
            <Label>
              Fecha de fin
              <Input
                type="datetime-local"
                value={form.ends_at || ''}
                onChange={(e) => onChange({ ...form, ends_at: e.target.value })}
              />
            </Label>
          </FieldGrid>
        </div>
      )}

      {!isCustomPeriod && (
        <FieldGrid style={{ marginTop: 12 }}>
          <Label>
            Fecha de inicio
            <Input
              type="datetime-local"
              value={form.starts_at || ''}
              onChange={(e) => onChange({ ...form, starts_at: e.target.value })}
            />
          </Label>
          <Label>
            Fecha de fin
            <Input
              type="datetime-local"
              value={form.ends_at || ''}
              onChange={(e) => onChange({ ...form, ends_at: e.target.value })}
            />
          </Label>
        </FieldGrid>
      )}
    </Card>
  );
}
