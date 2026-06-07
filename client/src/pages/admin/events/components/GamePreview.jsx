import {
  PreviewFrame, PreviewLabel,
  NumberGrid, NumberChip,
  OptionChip, OptionEmoji,
} from '../EventsPage.styles.js';

/* ─────────────────────────────────────────────
   SHARED HELPERS
───────────────────────────────────────────── */
const muted = { color: 'rgba(255,255,255,.55)', fontSize: 12 };
const center = { textAlign: 'center' };
const prizeBox = {
  display: 'inline-block',
  background: 'rgba(45,125,255,.18)',
  border: '1px solid rgba(45,125,255,.32)',
  borderRadius: 10,
  padding: '6px 14px',
  fontWeight: 700,
  color: '#dbeafe',
  fontSize: 14,
  margin: '8px 0',
};
const participarBtn = {
  display: 'block',
  width: '100%',
  marginTop: 14,
  padding: '12px 0',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(180deg,#2d7dff,#1e5ee8)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'default',
  textAlign: 'center',
};

const wheelStyle = {
  position: 'relative',
  width: 220,
  height: 220,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 14px',
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeSector(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerEnd.x} ${outerEnd.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerStart.x} ${outerStart.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/* ─────────────────────────────────────────────
   SORTEO PREVIEW
───────────────────────────────────────────── */
function renderSorteoPreview(form, cfg) {
  return (
    <div
      style={{
        background: 'linear-gradient(160deg,#0d1b4b,#060a18)',
        border: '1px solid rgba(45,125,255,.22)',
        borderRadius: 20,
        padding: 20,
        textAlign: 'center',
      }}
    >
      {cfg.image_url && (
        <img
          src={cfg.image_url}
          alt="banner"
          style={{ maxHeight: 120, width: '100%', objectFit: 'cover', borderRadius: 10, marginBottom: 12 }}
        />
      )}
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        {form.title || 'Sorteo Especial'}
      </div>
      <div style={{ ...muted, marginBottom: 10, lineHeight: 1.5 }}>
        {form.description || 'Participa y gana premios increíbles.'}
      </div>
      <div style={prizeBox}>
        🏆 {form.prize_amount || 0} {form.prize_type || 'fichas'}
      </div>
      <div style={{ ...muted, marginTop: 6 }}>
        Depósito mínimo: ${(form.min_deposit_amount || cfg.min_deposit_amount || 0).toLocaleString()}
      </div>
      <div style={{ ...muted, marginTop: 2 }}>
        Duración: {form.duration_minutes || 0} min
      </div>
      <div style={participarBtn}>PARTICIPAR</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUIZ PREVIEW
───────────────────────────────────────────── */
function renderQuizPreview(form, cfg) {
  const opts = cfg.options || [
    { key: 'A', text: 'Opción A' },
    { key: 'B', text: 'Opción B' },
    { key: 'C', text: 'Opción C' },
    { key: 'D', text: 'Opción D' },
  ];
  const correct = cfg.correct_option || 'A';

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      {/* Timer badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{form.title || 'Quiz Express'}</div>
        <div
          style={{
            background: 'rgba(239,68,68,.18)',
            border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            color: '#fca5a5',
            fontWeight: 700,
          }}
        >
          ⏱ {cfg.answer_time_seconds || 15}s
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          background: 'rgba(45,125,255,.12)',
          border: '1px solid rgba(45,125,255,.22)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 13,
          color: '#dbeafe',
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        {cfg.question || '¿Cuál es la respuesta correcta?'}
      </div>

      {/* Options 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {opts.slice(0, 4).map((opt) => {
          const isCorrect = opt.key === correct;
          return (
            <div
              key={opt.key}
              style={{
                border: `1px solid ${isCorrect ? 'rgba(74,222,128,.5)' : 'rgba(255,255,255,.1)'}`,
                background: isCorrect ? 'rgba(74,222,128,.15)' : 'rgba(255,255,255,.04)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 13,
                color: isCorrect ? '#4ade80' : 'rgba(255,255,255,.8)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700 }}>{opt.key}.</span>
              <span>{opt.text || `Opción ${opt.key}`}</span>
              {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCRATCH PREVIEW
───────────────────────────────────────────── */
function renderScratchPreview(form, cfg) {
  const prizes = cfg.prizes || [
    { icon: '🏆', label: 'Premio Mayor', probability: 10 },
    { icon: '✨', label: 'Sin premio', probability: 90 },
  ];

  const scratchers = Array.from({ length: 9 }, (_, i) => prizes[i % prizes.length]);

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ ...center, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        {form.title || 'Raspa y Gana'}
      </div>

      {/* 3x3 scratch grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {scratchers.map((p, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(135deg,rgba(100,100,120,.4),rgba(60,60,80,.6))',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 10,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              filter: 'blur(1px)',
              cursor: 'default',
            }}
          >
            {p.icon || '?'}
          </div>
        ))}
      </div>

      {/* Prize probability list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {prizes.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontSize: 16 }}>{p.icon}</span>
            <span style={{ flex: 1, color: 'rgba(255,255,255,.75)' }}>{p.label}</span>
            <span
              style={{
                background: 'rgba(255,255,255,.08)',
                borderRadius: 6,
                padding: '2px 7px',
                color: '#a5b4fc',
                fontWeight: 600,
              }}
            >
              {p.probability}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROULETTE PREVIEW
───────────────────────────────────────────── */
function renderRoulettePreview(form, cfg) {
  const segs = cfg.segments || [
    { color: '#ef4444', label: 'Premio Mayor', icon: '🏆', probability: 20 },
    { color: '#f59e0b', label: 'Premio Medio', icon: '🥈', probability: 20 },
    { color: '#10b981', label: 'Premio Menor', icon: '🥉', probability: 20 },
    { color: '#2563eb', label: 'Bonus 200%', icon: '🎁', probability: 20 },
    { color: '#7c3aed', label: 'Sin premio', icon: '⚪', probability: 20 },
  ];
  const equalTotal = segs.length || 1;
  const center = 110;
  const rOuter = 100;
  const rInner = 30;

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ ...center, fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
        {form.title || 'Ruleta VIP'}
      </div>

      <div style={wheelStyle}>
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '24px solid #fff',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
            zIndex: 4,
          }}
        />

        <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: 'visible' }}>
          {segs.map((seg, index) => {
            const startAngle = (index / equalTotal) * 360;
            const endAngle = ((index + 1) / equalTotal) * 360;
            return (
              <path
                key={`${seg.label}-${index}`}
                d={describeSector(center, center, rOuter, rInner, startAngle, endAngle)}
                fill={seg.color || '#3b82f6'}
                stroke="#0c1220"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            );
          })}
          <circle
            cx={center}
            cy={center}
            r={rInner}
            fill="rgba(10,16,34,.95)"
            stroke="rgba(255,255,255,.12)"
            strokeWidth="2"
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #1e2a3a, #0c1220 70%)',
            border: '3px solid rgba(255,255,255,.12)',
            boxShadow: '0 0 12px rgba(0,0,0,0.75), inset 0 0 10px rgba(255,255,255,.04)',
          }}
        />
      </div>

      {/* Segment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 14 }}>{s.icon}</span>
            <span style={{ flex: 1, color: 'rgba(255,255,255,.8)' }}>{s.label}</span>
            <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{s.probability}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SLOTS PREVIEW
───────────────────────────────────────────── */
function renderSlotsPreview(form, cfg) {
  const symbols = cfg.symbols && cfg.symbols.length > 0
    ? cfg.symbols
    : [
      { icon: '7', label: 'Siete' },
      { icon: '🍒', label: 'Cereza' },
      { icon: '⭐', label: 'Estrella' },
    ];
  const displaySymbols = symbols.slice(0, 3);
  while (displaySymbols.length < 3) displaySymbols.push({ icon: '?' });

  const primary = cfg.primary_color || '#1e3a8a';
  const secondary = cfg.secondary_color || '#0f172a';

  return (
    <div
      style={{
        background: `linear-gradient(160deg,${primary},${secondary})`,
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 20,
        padding: 20,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, letterSpacing: 1 }}>
        {cfg.preview_title || form.title || 'Slots BetChat'}
      </div>

      {/* Win rate badge */}
      <div
        style={{
          display: 'inline-block',
          background: 'rgba(74,222,128,.15)',
          border: '1px solid rgba(74,222,128,.3)',
          borderRadius: 8,
          padding: '3px 10px',
          fontSize: 11,
          color: '#4ade80',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Win Rate: {cfg.win_rate ?? 35}%
      </div>

      {/* Symbol reels */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
        {displaySymbols.map((s, i) => (
          <div
            key={i}
            style={{
              width: 70,
              height: 70,
              borderRadius: 14,
              background: 'rgba(255,255,255,.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              border: '1px solid rgba(255,255,255,.18)',
            }}
          >
            {s.icon || '?'}
          </div>
        ))}
      </div>

      {/* Play button */}
      <div
        style={{
          ...participarBtn,
          background: `linear-gradient(180deg,${primary},${secondary})`,
          border: '1px solid rgba(255,255,255,.18)',
        }}
      >
        {cfg.button_text || 'JUGAR'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RED / BLACK PREVIEW
───────────────────────────────────────────── */
function renderRedBlackPreview(form, cfg) {
  const options = cfg.options || [
    { label: 'Rojo', color: '#ef4444', icon: '🔴' },
    { label: 'Negro', color: '#111827', icon: '⚫' },
  ];
  const winRate = cfg.win_rate ?? 50;

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ ...center, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        {form.title || 'Rojo o Negro'}
      </div>
      <div style={{ ...muted, ...center, marginBottom: 14 }}>
        {form.description || 'Elige tu opción y gana.'}
      </div>

      {/* Option cards */}
      <div style={{ display: 'flex', gap: 10 }}>
        {options.map((opt, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: opt.color || '#333',
              borderRadius: 16,
              padding: '18px 10px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,.12)',
              cursor: 'default',
            }}
          >
            <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>{opt.icon || '?'}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{opt.label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...muted, ...center, marginTop: 10 }}>
        Probabilidad de ganar: {winRate}%
      </div>
      <div style={{ ...center, marginTop: 4, fontSize: 13, fontWeight: 600, color: '#dbeafe' }}>
        Premio: {form.prize_amount || 0} {form.prize_type || 'fichas'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BRIEFCASE PREVIEW
───────────────────────────────────────────── */
function renderBriefcasePreview(form, cfg) {
  const count = Math.min(10, Math.max(3, cfg.numbers_count || 5));
  const minDeposit = cfg.min_deposit_amount || form.min_deposit_amount || 0;

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ ...center, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        {form.title || 'Maletín Millonario'}
      </div>
      <div style={{ ...muted, ...center, marginBottom: 14 }}>
        {form.description || 'Elige el número menos popular y gana.'}
      </div>

      {/* Number grid */}
      <NumberGrid style={{ marginBottom: 14 }}>
        {Array.from({ length: count }, (_, i) => (
          <NumberChip key={i + 1}>{i + 1}</NumberChip>
        ))}
      </NumberGrid>

      <div style={{ ...muted, ...center }}>
        Depósito mínimo: ${minDeposit.toLocaleString()}
      </div>
      <div style={{ ...muted, ...center, fontStyle: 'italic', marginTop: 4 }}>
        El número con MENOS votos gana
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TREASURE CHEST PREVIEW
───────────────────────────────────────────── */
function renderTreasureChestPreview(form, cfg) {
  const options = cfg.options || [
    { label: 'Diamantes', icon: '💎' },
    { label: 'Monedas', icon: '💰' },
    { label: 'Joyas', icon: '💍' },
  ];
  const minDeposit = cfg.min_deposit_amount || form.min_deposit_amount || 0;

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ ...center, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        {form.title || 'Cofre del Tesoro'}
      </div>
      <div style={{ ...muted, ...center, marginBottom: 14 }}>
        {form.description || 'Elige la opción menos popular y gana.'}
      </div>

      {/* Option chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
        {options.map((opt, i) => (
          <OptionChip key={i}>
            <OptionEmoji>{opt.icon || '⭐'}</OptionEmoji>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', textAlign: 'center' }}>
              {opt.label}
            </span>
          </OptionChip>
        ))}
      </div>

      <div style={{ ...muted, ...center }}>
        Depósito mínimo: ${minDeposit.toLocaleString()}
      </div>
      <div style={{ ...muted, ...center, fontStyle: 'italic', marginTop: 4 }}>
        La opción con MENOS votos gana
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RANKING PREVIEW
───────────────────────────────────────────── */
const MISSION_LABEL = {
  deposit_count:  'depósitos',
  deposit_amount: 'depositados',
  charge_count:   'cargas',
  other:          'puntos',
};

const PERIOD_LABEL = {
  daily:   'Diario',
  weekly:  'Semanal',
  monthly: 'Mensual',
  custom:  'Personalizado',
};

function renderRankingPreview(form, cfg) {
  const missionLabel = MISSION_LABEL[cfg.mission_type] || 'puntos';
  const periodLabel = PERIOD_LABEL[cfg.period_type] || 'Semanal';
  const goal = cfg.goal_amount || 0;
  const isAmount = cfg.mission_type === 'deposit_amount';
  const goalDisplay = isAmount ? `$${goal.toLocaleString()}` : goal;

  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      {/* Emoji + Title */}
      <div style={{ ...center, marginBottom: 4 }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}>{cfg.emoji || '🏆'}</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{form.title || 'Ranking Semanal'}</div>
      </div>

      <div style={{ ...muted, ...center, marginBottom: 14, lineHeight: 1.5 }}>
        {form.description || 'Completa la misión y gana el premio.'}
      </div>

      {/* Mission info */}
      <div
        style={{
          background: 'rgba(45,125,255,.1)',
          border: '1px solid rgba(45,125,255,.2)',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 10,
          fontSize: 13,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>Meta:</span>
          <span style={{ fontWeight: 700, color: '#dbeafe' }}>
            {goalDisplay} {missionLabel}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>Período:</span>
          <span style={{ fontWeight: 600, color: '#dbeafe' }}>{periodLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>Premio:</span>
          <span style={{ fontWeight: 700, color: '#fbbf24' }}>
            {form.prize_amount || 0} {form.prize_type || 'fichas'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>Tu progreso:</span>
          <span style={{ color: '#a5b4fc', fontWeight: 600 }}>0 / {goal}</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: 'rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '0%',
              borderRadius: 999,
              background: 'linear-gradient(90deg,#2d7dff,#818cf8)',
              transition: 'width .3s',
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', textAlign: 'center', marginBottom: 8 }}>
        Gana si formás 3 iguales en línea horizontal, vertical o diagonal.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DEFAULT / FALLBACK PREVIEW
───────────────────────────────────────────── */
function renderDefaultPreview(form) {
  return (
    <div
      style={{
        background: 'rgba(15,23,42,.96)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 20,
        padding: 20,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {form.title || 'Evento'}
      </div>
      <div style={{ ...muted, lineHeight: 1.5, marginBottom: 14 }}>
        {form.description || 'Previsualización del evento.'}
      </div>
      <div style={prizeBox}>
        🏆 {form.prize_amount || 0} {form.prize_type || 'fichas'}
      </div>
      {form.duration_minutes ? (
        <div style={{ ...muted, marginTop: 8 }}>
          Duración: {form.duration_minutes} min
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DISPATCHER
───────────────────────────────────────────── */
function renderPreview(gameType, form, cfg) {
  switch (gameType) {
    case 'sorteo':        return renderSorteoPreview(form, cfg);
    case 'quiz':          return renderQuizPreview(form, cfg);
    case 'scratch':       return renderScratchPreview(form, cfg);
    case 'roulette':      return renderRoulettePreview(form, cfg);
    case 'slots':         return renderSlotsPreview(form, cfg);
    case 'red_black':     return renderRedBlackPreview(form, cfg);
    case 'briefcase':     return renderBriefcasePreview(form, cfg);
    case 'treasure_chest':return renderTreasureChestPreview(form, cfg);
    case 'ranking':       return renderRankingPreview(form, cfg);
    default:              return renderDefaultPreview(form);
  }
}

/* ─────────────────────────────────────────────
   EXPORTED COMPONENT
───────────────────────────────────────────── */
export default function GamePreview({ gameType, form }) {
  const safeForm = form || {};
  const cfg = safeForm.config_json || {};

  return (
    <PreviewFrame>
      <PreviewLabel>Vista previa del cliente</PreviewLabel>
      {renderPreview(gameType, safeForm, cfg)}
    </PreviewFrame>
  );
}
