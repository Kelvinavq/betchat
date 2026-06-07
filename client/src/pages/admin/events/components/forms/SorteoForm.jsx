import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Textarea,
  Divider,
} from '../../EventsPage.styles.js';


const SorteoForm = ({ form, onChange }) => {
  const cfg = form.config_json || {};

  const setCfg = (patch) =>
    onChange({ ...form, config_json: { ...cfg, ...patch } });

  const set = (patch) => onChange({ ...form, ...patch });

  const handleMinDeposit = (val) => {
    const num = Number(val);
    onChange({
      ...form,
      min_deposit_amount: num,
      config_json: { ...cfg, min_deposit_amount: num },
    });
  };

  return (
    <Card>
      <CardTitle>Configurar Sorteo</CardTitle>
      <CardDesc>
        Los participantes se inscriben con un depósito mínimo. Al vencer el
        tiempo se elige un ganador al azar.
      </CardDesc>

      <FieldGrid>
        {/* Title — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>
            Título del sorteo
            <Input
              value={form.title || ''}
              placeholder="Ej: Sorteo de Bienvenida"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Label>
        </div>

        {/* Description — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>
            Descripción
            <Textarea
              value={form.description || ''}
              placeholder="Describe las reglas y condiciones del sorteo…"
              onChange={(e) => set({ description: e.target.value })}
            />
          </Label>
        </div>

        {/* Image URL — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>
            URL de imagen del sorteo
            <Input
              type="url"
              value={cfg.image_url || ''}
              placeholder="https://ejemplo.com/imagen.jpg"
              onChange={(e) => setCfg({ image_url: e.target.value })}
            />
          </Label>
          {cfg.image_url && (
            <img
              src={cfg.image_url}
              alt="Vista previa"
              style={{
                marginTop: 10,
                maxWidth: '100%',
                maxHeight: 180,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,.1)',
                objectFit: 'cover',
              }}
            />
          )}
        </div>

        {/* Min deposit */}
        <Label>
          Depósito mínimo para participar
          <Input
            type="number"
            min={0}
            value={form.min_deposit_amount ?? cfg.min_deposit_amount ?? ''}
            placeholder="Ej: 2000"
            onChange={(e) => handleMinDeposit(e.target.value)}
          />
        </Label>

        {/* Duration */}
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

        {/* Prize type — sorteo only supports fichas */}
        <Label>
          Tipo de premio
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            fontSize: 13,
          }}>
            🏆 Fichas
          </div>
        </Label>

        {/* Prize amount */}
        <Label>
          Monto del premio
          <Input
            type="number"
            min={0}
            value={form.prize_amount ?? ''}
            placeholder="Ej: 500"
            onChange={(e) => set({ prize_amount: Number(e.target.value) })}
          />
        </Label>
      </FieldGrid>

      <Divider />

      {/* Prize description — full width outside FieldGrid for clarity */}
      <Label>
        Descripción del premio
        <Textarea
          value={cfg.prize_description || ''}
          placeholder="Describe qué gana el ganador del sorteo…"
          onChange={(e) => setCfg({ prize_description: e.target.value })}
        />
      </Label>

      <div style={{ marginTop: 14 }}>
        <Label>
          Fecha y hora de inicio
          <Input
            type="datetime-local"
            value={form.starts_at || ''}
            onChange={(e) => set({ starts_at: e.target.value })}
          />
        </Label>
      </div>
    </Card>
  );
};

export default SorteoForm;
