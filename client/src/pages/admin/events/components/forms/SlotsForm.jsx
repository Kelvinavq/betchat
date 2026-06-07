import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Select,
  RangeInput,
  ListRow,
  AddRowBtn,
  DeleteRowBtn,
  WinRateRow,
  WinRateVal,
  Divider,
} from '../../EventsPage.styles.js';

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
  prizes: DEFAULT_PRIZES,
  win_rate: 35,
  preview_title: 'Slots',
  button_text: 'JUGAR',
};

const PRIZE_ROW_COLS = '50px 1fr 120px 80px 70px 60px 60px 60px 32px';

const SlotsForm = ({ form, onChange }) => {
  const cfg = { ...DEFAULT_CONFIG, ...(form.config_json || {}) };
  const setCfg = (patch) => onChange({ ...form, config_json: { ...cfg, ...patch } });
  const set = (patch) => onChange({ ...form, ...patch });

  const symbols = DEFAULT_SYMBOLS;
  const prizes = cfg.prizes && cfg.prizes.length > 0 ? cfg.prizes : DEFAULT_PRIZES;

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

  const updatePrize = (index, patch) => {
    const updated = prizes.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setCfg({ prizes: updated });
  };

  const deletePrize = (index) => {
    setCfg({ prizes: prizes.filter((_, i) => i !== index) });
  };

  const updateCombo = (index, comboIndex, value) => {
    const updated = prizes.map((p, i) => {
      if (i !== index) return p;
      const combo = Array.isArray(p.combo) ? [...p.combo] : ['', '', ''];
      combo[comboIndex] = value;
      return { ...p, combo };
    });
    setCfg({ prizes: updated });
  };

  return (
    <>
      <Card>
        <CardTitle>Configurar Slots</CardTitle>
        <CardDesc>
          Ajusta el nombre del juego y la duración. Los símbolos visuales del slot son fijos
          para evitar confusiones en la configuración.
        </CardDesc>

        <FieldGrid>
          <Label>
            Nombre del juego
            <Input
              value={form.title || ''}
              placeholder="Ej: Slots"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Label>

          <Label>
            Duración (min)
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
      </Card>

      <Divider />

      <Card>
        <CardTitle>Premios y combinaciones</CardTitle>
        <CardDesc>
          Define los premios del slot y la combinación de 3 símbolos que los activa.
        </CardDesc>

        <ListRow
          $cols={PRIZE_ROW_COLS}
          style={{
            borderBottom: '1px solid rgba(255,255,255,.1)',
            paddingBottom: 6,
            marginBottom: 10,
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
            <Input
              value={prize.icon || ''}
              placeholder="7"
              style={{ padding: '6px 4px', textAlign: 'center', fontSize: 18 }}
              onChange={(e) => updatePrize(pi, { icon: e.target.value })}
            />
            <Input
              value={prize.label || ''}
              placeholder="Nombre"
              onChange={(e) => updatePrize(pi, { label: e.target.value })}
            />
            <Select
              value={prize.prize_type || 'fichas'}
              onChange={(e) => updatePrize(pi, { prize_type: e.target.value })}
            >
              <option value="fichas">Fichas</option>
              <option value="bono_200">Bono 200%</option>
              <option value="none">Sin premio</option>
            </Select>
            <Input
              type="number"
              min={0}
              value={prize.amount ?? ''}
              placeholder="0"
              style={{ padding: '6px 4px' }}
              onChange={(e) => updatePrize(pi, { amount: Number(e.target.value) })}
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={prize.probability ?? ''}
              placeholder="0"
              style={{ padding: '6px 4px' }}
              onChange={(e) => updatePrize(pi, { probability: Number(e.target.value) })}
            />

            {[0, 1, 2].map((ci) => (
              <Select
                key={ci}
                value={prize.combo?.[ci] || ''}
                onChange={(e) => updateCombo(pi, ci, e.target.value)}
                style={{ padding: '6px 4px', fontSize: 15, textAlign: 'center' }}
              >
                <option value="">—</option>
                {symbols.map((s, si) => (
                  <option key={si} value={s.icon}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </Select>
            ))}

            <DeleteRowBtn type="button" title="Eliminar premio" onClick={() => deletePrize(pi)}>
              ×
            </DeleteRowBtn>
          </ListRow>
        ))}

        <AddRowBtn type="button" onClick={addPrize}>
          + Agregar premio
        </AddRowBtn>

        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,.58)' }}>
          Los símbolos del slot son fijos en esta versión. Solo configurás premios, montos y
          probabilidades.
        </div>
      </Card>

      <Divider />

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
    </>
  );
};

export default SlotsForm;
