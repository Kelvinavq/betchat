import { useState, useEffect } from 'react';
import {
  Card, CardTitle, CardDesc, FieldGrid, FieldGroup, Label, Input, Select,
  BtnRow, Btn, AddRowBtn, Divider,
  StatGrid,
} from '../EventsPage.styles.js';
import { eventsApi } from '../services/eventsApi.js';
import styled from 'styled-components';

/* ── Local styled helpers ─────────────────────────────────────────────── */
const SubTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`;

const SubTab = styled.button`
  border: 1px solid ${({ $active }) => $active ? 'rgba(45,125,255,.6)' : 'rgba(255,255,255,.1)'};
  background: ${({ $active }) => $active ? 'rgba(45,125,255,.18)' : 'rgba(255,255,255,.04)'};
  color: ${({ $active }) => $active ? '#dbeafe' : 'rgba(255,255,255,.7)'};
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all .15s;
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 580px) { grid-template-columns: 1fr; }
`;

const TemplateCard = styled.div`
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(45,125,255,.18);
  color: #93c5fd;
  width: fit-content;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 14px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    text-align: left;
    white-space: nowrap;
  }
  th { color: rgba(255,255,255,.5); font-weight: 600; font-size: 12px; }
`;

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  color: rgba(255,255,255,.38);
  font-size: 14px;
`;

const ErrorMsg = styled.div`
  padding: 12px 16px;
  background: rgba(239,68,68,.12);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 14px;
`;

const SuccessMsg = styled.div`
  padding: 12px 16px;
  background: rgba(74,222,128,.12);
  border: 1px solid rgba(74,222,128,.25);
  border-radius: 12px;
  color: #86efac;
  font-size: 13px;
  margin-bottom: 14px;
`;

const DayPillRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const DayPill = styled.button`
  border: 1px solid ${({ $active }) => $active ? 'rgba(45,125,255,.7)' : 'rgba(255,255,255,.12)'};
  background: ${({ $active }) => $active ? 'rgba(45,125,255,.22)' : 'rgba(255,255,255,.04)'};
  color: ${({ $active }) => $active ? '#dbeafe' : 'rgba(255,255,255,.65)'};
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all .15s;
`;

const QuickRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const QuickBtn = styled.button`
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  transition: background .15s;
  &:hover { background: rgba(255,255,255,.1); }
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255,255,255,.78);
  cursor: pointer;
  input { accent-color: #2d7dff; width: 16px; height: 16px; cursor: pointer; }
`;

/* ── Constants ────────────────────────────────────────────────────────── */
const EVENT_TYPES = [
  { value: 'sorteo', label: 'Sorteo' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'scratch', label: 'Raspa y Gana' },
  { value: 'roulette', label: 'Ruleta' },
  { value: 'slots', label: 'Slots' },
  { value: 'red_black', label: 'Rojo/Negro' },
  { value: 'briefcase', label: 'Maletín' },
  { value: 'treasure_chest', label: 'Cofre del Tesoro' },
  { value: 'ranking', label: 'Ranking' },
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const INIT_FORM = {
  name: '',
  event_type: 'sorteo',
  template_id: '',
  automation_type: 'schedule',
  days_of_week: [],
  launch_time: '10:00',
  condition_type: 'deposit_amount',
  condition_value: '',
  is_active: true,
};

/* ── Component ────────────────────────────────────────────────────────── */
const AgendaPanel = ({ onUseTemplate }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(INIT_FORM);

  /* ── Loaders ── */
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await eventsApi.templates.list();
      setTemplates(res.templates || []);
    } catch {
      setError('Error al cargar templates.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadAutomations = async () => {
    setLoadingAutomations(true);
    try {
      const res = await eventsApi.automations.list();
      setAutomations(res.automations || []);
    } catch {
      setError('Error al cargar automatizaciones.');
    } finally {
      setLoadingAutomations(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadAutomations();
  }, []);

  /* ── Template actions ── */
  const handleDeleteTemplate = async (id) => {
    try {
      await eventsApi.templates.remove(id);
      await loadTemplates();
    } catch {
      setError('Error al eliminar template.');
    }
  };

  /* ── Automation actions ── */
  const handleToggleAutomation = async (id) => {
    try {
      await eventsApi.automations.toggle(id);
      await loadAutomations();
    } catch {
      setError('Error al cambiar estado de la automatización.');
    }
  };

  const handleDeleteAutomation = async (id) => {
    try {
      await eventsApi.automations.remove(id);
      await loadAutomations();
    } catch {
      setError('Error al eliminar automatización.');
    }
  };

  /* ── Days of week helpers ── */
  const toggleDay = (dayIndex) => {
    setForm((prev) => {
      const days = prev.days_of_week.includes(dayIndex)
        ? prev.days_of_week.filter((d) => d !== dayIndex)
        : [...prev.days_of_week, dayIndex].sort((a, b) => a - b);
      return { ...prev, days_of_week: days };
    });
  };

  const setQuickDays = (days) => setForm((prev) => ({ ...prev, days_of_week: days }));

  /* ── Form submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('El nombre es requerido.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        event_type: form.event_type,
        template_id: form.template_id || null,
        automation_type: form.automation_type,
        is_active: form.is_active,
      };
      if (form.automation_type === 'schedule') {
        payload.days_of_week = form.days_of_week;
        payload.launch_time = form.launch_time;
      } else {
        payload.condition_type = form.condition_type;
        payload.condition_value = Number(form.condition_value);
      }
      await eventsApi.automations.create(payload);
      setSuccess('Automatización creada correctamente.');
      setForm(INIT_FORM);
      await loadAutomations();
      setActiveTab('automations');
    } catch {
      setError('Error al crear la automatización.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  /* ── Render tabs ── */
  const renderTemplates = () => (
    <>
      <CardTitle>Templates guardados</CardTitle>
      <CardDesc>Reutilizá configuraciones de eventos previos para crear nuevos rápidamente.</CardDesc>
      {loadingTemplates ? (
        <EmptyState>Cargando templates...</EmptyState>
      ) : templates.length === 0 ? (
        <EmptyState>No hay templates guardados</EmptyState>
      ) : (
        <TemplateGrid>
          {templates.map((t) => (
            <TemplateCard key={t.id}>
              <Badge>{t.event_type}</Badge>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                {new Date(t.created_at).toLocaleDateString('es-AR')}
              </div>
              <BtnRow style={{ marginTop: 4 }}>
                <Btn
                  type="button"
                  $v="primary"
                  style={{ padding: '7px 12px', fontSize: 12, borderRadius: 10 }}
                  onClick={() => onUseTemplate && onUseTemplate(t)}
                >
                  Usar template
                </Btn>
                <Btn
                  type="button"
                  $v="danger"
                  style={{ padding: '7px 12px', fontSize: 12, borderRadius: 10 }}
                  onClick={() => handleDeleteTemplate(t.id)}
                >
                  Eliminar
                </Btn>
              </BtnRow>
            </TemplateCard>
          ))}
        </TemplateGrid>
      )}
    </>
  );

  const renderAutomations = () => (
    <>
      <CardTitle>Automatizaciones</CardTitle>
      <CardDesc>Eventos que se crean automáticamente según horario o metas configuradas.</CardDesc>
      {loadingAutomations ? (
        <EmptyState>Cargando automatizaciones...</EmptyState>
      ) : automations.length === 0 ? (
        <EmptyState>No hay automatizaciones configuradas</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo Evento</th>
                <th>Tipo Automatización</th>
                <th>Estado</th>
                <th>Última ejecución</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id}>
                  <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{a.name}</td>
                  <td>
                    <Badge>{a.event_type}</Badge>
                  </td>
                  <td style={{ color: 'rgba(255,255,255,.72)' }}>{a.automation_type}</td>
                  <td>
                    <Badge style={{
                      background: a.is_active ? 'rgba(74,222,128,.15)' : 'rgba(255,255,255,.07)',
                      color: a.is_active ? '#86efac' : 'rgba(255,255,255,.5)',
                    }}>
                      {a.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
                    {a.last_run_at
                      ? new Date(a.last_run_at).toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td>
                    <BtnRow>
                      <Btn
                        type="button"
                        style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10 }}
                        onClick={() => handleToggleAutomation(a.id)}
                      >
                        {a.is_active ? 'Desactivar' : 'Activar'}
                      </Btn>
                      <Btn
                        type="button"
                        $v="danger"
                        style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10 }}
                        onClick={() => handleDeleteAutomation(a.id)}
                      >
                        Eliminar
                      </Btn>
                    </BtnRow>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
      <AddRowBtn type="button" onClick={() => { clearMessages(); setActiveTab('new'); }}>
        + Nueva automatización
      </AddRowBtn>
    </>
  );

  const renderNewForm = () => (
    <>
      <CardTitle>Nueva Automatización</CardTitle>
      <CardDesc>Configurá un evento que se lance automáticamente según horario o metas de usuarios.</CardDesc>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FieldGrid>
            <Label>
              Nombre
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Sorteo diario mañana"
                required
              />
            </Label>
            <Label>
              Tipo de evento
              <Select
                value={form.event_type}
                onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </Select>
            </Label>
          </FieldGrid>

          <FieldGrid>
            <Label>
              Template (opcional)
              <Select
                value={form.template_id}
                onChange={(e) => setForm((p) => ({ ...p, template_id: e.target.value }))}
              >
                <option value="">— Sin template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Label>
            <Label>
              Tipo de automatización
              <Select
                value={form.automation_type}
                onChange={(e) => setForm((p) => ({ ...p, automation_type: e.target.value }))}
              >
                <option value="schedule">Horario (schedule)</option>
                <option value="goal">Meta (goal)</option>
              </Select>
            </Label>
          </FieldGrid>

          <Divider />

          {form.automation_type === 'schedule' && (
            <>
              <Label>
                Días de la semana
                <DayPillRow>
                  {DAY_LABELS.map((label, idx) => (
                    <DayPill
                      key={idx}
                      type="button"
                      $active={form.days_of_week.includes(idx)}
                      onClick={() => toggleDay(idx)}
                    >
                      {label}
                    </DayPill>
                  ))}
                </DayPillRow>
                <QuickRow>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', alignSelf: 'center' }}>
                    Selección rápida:
                  </span>
                  <QuickBtn type="button" onClick={() => setQuickDays([0,1,2,3,4,5,6])}>Todos</QuickBtn>
                  <QuickBtn type="button" onClick={() => setQuickDays([1,2,3,4,5])}>Lun–Vie</QuickBtn>
                  <QuickBtn type="button" onClick={() => setQuickDays([0,6])}>Fin de semana</QuickBtn>
                  <QuickBtn type="button" onClick={() => setQuickDays([])}>Ninguno</QuickBtn>
                </QuickRow>
              </Label>
              <Label>
                Hora de lanzamiento
                <Input
                  type="time"
                  value={form.launch_time}
                  onChange={(e) => setForm((p) => ({ ...p, launch_time: e.target.value }))}
                  style={{ maxWidth: 160 }}
                />
              </Label>
            </>
          )}

          {form.automation_type === 'goal' && (
            <FieldGrid>
              <Label>
                Condición
                <Select
                  value={form.condition_type}
                  onChange={(e) => setForm((p) => ({ ...p, condition_type: e.target.value }))}
                >
                  <option value="deposit_amount">Monto de depósito acumulado</option>
                  <option value="deposit_count">Cantidad de depósitos</option>
                  <option value="user_count">Cantidad de usuarios activos</option>
                </Select>
              </Label>
              <Label>
                Valor de la condición
                <Input
                  type="number"
                  min="1"
                  value={form.condition_value}
                  onChange={(e) => setForm((p) => ({ ...p, condition_value: e.target.value }))}
                  placeholder="Ej: 5000"
                />
              </Label>
            </FieldGrid>
          )}

          <CheckRow>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Activo — lanzar según la configuración
          </CheckRow>

          <BtnRow style={{ marginTop: 6 }}>
            <Btn type="submit" $v="primary" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Crear automatización'}
            </Btn>
            <Btn type="button" onClick={() => { clearMessages(); setActiveTab('automations'); }}>
              Cancelar
            </Btn>
          </BtnRow>
        </FieldGroup>
      </form>
    </>
  );

  return (
    <Card>
      <SubTabs>
        <SubTab $active={activeTab === 'templates'} onClick={() => { clearMessages(); setActiveTab('templates'); }}>
          Templates
        </SubTab>
        <SubTab $active={activeTab === 'automations'} onClick={() => { clearMessages(); setActiveTab('automations'); }}>
          Automatizaciones
        </SubTab>
        <SubTab $active={activeTab === 'new'} onClick={() => { clearMessages(); setActiveTab('new'); }}>
          + Nueva automatización
        </SubTab>
      </SubTabs>

      {error && <ErrorMsg>{error}</ErrorMsg>}
      {success && <SuccessMsg>{success}</SuccessMsg>}

      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'automations' && renderAutomations()}
      {activeTab === 'new' && renderNewForm()}
    </Card>
  );
};

export default AgendaPanel;
