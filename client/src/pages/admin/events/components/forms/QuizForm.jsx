import {
  Card,
  CardTitle,
  CardDesc,
  FieldGrid,
  Label,
  Input,
  Textarea,
  Select,
  CorrectBtn,
  BtnRow,
  Divider,
} from '../../EventsPage.styles.js';

const PRIZE_TYPE_OPTIONS = [
  { value: 'fichas', label: 'Fichas' },
  { value: 'bono_200', label: 'Bono 200%' },
  { value: 'otro', label: 'Otro' },
];

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const DEFAULT_OPTIONS = OPTION_KEYS.map((key) => ({ key, text: '' }));

const QuizForm = ({ form, onChange }) => {
  const cfg = form.config_json || {};

  const setCfg = (patch) =>
    onChange({ ...form, config_json: { ...cfg, ...patch } });

  const set = (patch) => onChange({ ...form, ...patch });

  const options = cfg.options && cfg.options.length === 4
    ? cfg.options
    : DEFAULT_OPTIONS;

  const handleOptionChange = (key, text) => {
    const updated = options.map((o) => (o.key === key ? { ...o, text } : o));
    setCfg({ options: updated });
  };

  return (
    <Card>
      <CardTitle>Configurar Quiz</CardTitle>
      <CardDesc>
        Los jugadores responden una pregunta de opción múltiple. Solo quienes
        elijan la opción correcta participan en el premio.
      </CardDesc>

      <FieldGrid>
        {/* Title */}
        <Label>
          Título del quiz
          <Input
            value={form.title || ''}
            placeholder="Ej: Quiz Express de Fútbol"
            onChange={(e) => set({ title: e.target.value })}
          />
        </Label>

        {/* Duration */}
        <Label>
          Duración (minutos)
          <Input
            type="number"
            min={1}
            value={form.duration_minutes || ''}
            placeholder="Ej: 30"
            onChange={(e) => set({ duration_minutes: Number(e.target.value) })}
          />
        </Label>

        {/* Question — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>
            Pregunta
            <Textarea
              value={cfg.question || ''}
              placeholder="Escribe aquí la pregunta del quiz…"
              onChange={(e) => setCfg({ question: e.target.value })}
            />
          </Label>
        </div>

        {/* Options A/B/C/D — 2 per row */}
        {options.map((opt) => (
          <Label key={opt.key}>
            Opción {opt.key}
            <Input
              value={opt.text}
              placeholder={`Texto de la opción ${opt.key}`}
              onChange={(e) => handleOptionChange(opt.key, e.target.value)}
            />
          </Label>
        ))}
      </FieldGrid>

      <Divider />

      {/* Correct option selector */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,.72)',
            marginBottom: 8,
          }}
        >
          Opción correcta
          {cfg.correct_option && (
            <span
              style={{
                marginLeft: 8,
                color: '#4ade80',
                fontWeight: 700,
              }}
            >
              — Seleccionada: {cfg.correct_option}
            </span>
          )}
        </div>
        <BtnRow>
          {OPTION_KEYS.map((key) => (
            <CorrectBtn
              key={key}
              type="button"
              $selected={cfg.correct_option === key}
              onClick={() => setCfg({ correct_option: key })}
            >
              {key}
            </CorrectBtn>
          ))}
        </BtnRow>
      </div>

      <FieldGrid>
        {/* Answer time seconds */}
        <Label>
          Tiempo de respuesta (segundos)
          <Input
            type="number"
            min={5}
            max={120}
            value={cfg.answer_time_seconds || ''}
            placeholder="Ej: 15 (5–120)"
            onChange={(e) =>
              setCfg({ answer_time_seconds: Number(e.target.value) })
            }
          />
        </Label>

        {/* Prize type */}
        <Label>
          Tipo de premio
          <Select
            value={form.prize_type || 'fichas'}
            onChange={(e) => set({ prize_type: e.target.value })}
          >
            {PRIZE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Label>

        {/* Prize amount */}
        <Label>
          Monto del premio
          <Input
            type="number"
            min={0}
            value={form.prize_amount ?? ''}
            placeholder="Ej: 50"
            onChange={(e) => set({ prize_amount: Number(e.target.value) })}
          />
        </Label>
      </FieldGrid>
    </Card>
  );
};

export default QuizForm;
