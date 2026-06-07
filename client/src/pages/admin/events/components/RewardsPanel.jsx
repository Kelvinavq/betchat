import { useState, useEffect, useCallback } from 'react';
import { useDateFormat } from '../../../../hooks/useDateFormat';
import {
  Card, CardTitle, BtnRow, Btn,
} from '../EventsPage.styles.js';
import { eventsApi } from '../services/eventsApi.js';
import styled from 'styled-components';

/* ── Local styled helpers ─────────────────────────────────────────────── */
const InfoBox = styled.div`
  padding: 14px 16px;
  background: rgba(251,191,36,.07);
  border: 1px solid rgba(251,191,36,.28);
  border-radius: 14px;
  color: rgba(253,230,138,.9);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 18px;
`;

const FiltersArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterBtn = styled.button`
  border: 1px solid ${({ $active }) => $active ? 'rgba(45,125,255,.6)' : 'rgba(255,255,255,.1)'};
  background: ${({ $active }) => $active ? 'rgba(45,125,255,.2)' : 'rgba(255,255,255,.04)'};
  color: ${({ $active }) => $active ? '#dbeafe' : 'rgba(255,255,255,.7)'};
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all .15s;
  &:disabled { opacity: .5; cursor: default; }
`;

const RefreshBtn = styled.button`
  margin-left: auto;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: background .15s;
  &:hover { background: rgba(255,255,255,.1); }
`;

const SecondaryRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const EventSelect = styled.select`
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  color: rgba(255,255,255,.8);
  padding: 7px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  min-width: 180px;
  max-width: 260px;
  transition: border-color .15s;
  option { background: #1a1f2e; color: #f1f5f9; }
  &:focus { border-color: rgba(45,125,255,.5); }
`;

const DateLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,.35);
  letter-spacing: .05em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const DateInput = styled.input`
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  color: rgba(255,255,255,.8);
  padding: 7px 11px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  color-scheme: dark;
  transition: border-color .15s;
  &:focus { border-color: rgba(45,125,255,.5); }
  &::-webkit-calendar-picker-indicator { filter: invert(.6); cursor: pointer; }
`;

const ClearBtn = styled.button`
  border: 1px solid rgba(255,255,255,.08);
  background: transparent;
  color: rgba(255,255,255,.4);
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  &:hover { color: rgba(255,255,255,.7); background: rgba(255,255,255,.06); }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  @media (max-width: 540px) { grid-template-columns: 1fr; }
`;

const SummaryCard = styled.div`
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 16px;
  padding: 14px;
  text-align: center;
`;

const SummaryValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${({ $color }) => $color || '#f1f5f9'};
`;

const SummaryLabel = styled.div`
  color: rgba(255,255,255,.5);
  font-size: 12px;
  margin-top: 4px;
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
    padding: 11px 13px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    text-align: left;
    white-space: nowrap;
  }
  th { color: rgba(255,255,255,.48); font-weight: 600; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $v }) =>
    $v === 'success' ? 'rgba(74,222,128,.15)' :
    $v === 'danger'  ? 'rgba(239,68,68,.15)'  :
    $v === 'warning' ? 'rgba(251,191,36,.15)'  :
                       'rgba(255,255,255,.08)'};
  color: ${({ $v }) =>
    $v === 'success' ? '#86efac' :
    $v === 'danger'  ? '#fca5a5' :
    $v === 'warning' ? '#fde68a' :
                       'rgba(255,255,255,.55)'};
`;

const EventBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  color: #a5b4fc;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 36px;
  text-align: center;
  color: rgba(255,255,255,.35);
  font-size: 14px;
`;

const LoadingState = styled.div`
  padding: 36px;
  text-align: center;
  color: rgba(255,255,255,.45);
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

const MutedText = styled.div`
  color: rgba(255,255,255,.4);
  font-size: 11px;
  margin-top: 3px;
  white-space: normal;
  max-width: 180px;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 0;
  gap: 8px;
`;

const PageBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.55);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color .2s, background .2s;
  &:hover:not(:disabled) { color: rgba(255,255,255,.9); background: rgba(255,255,255,.09); }
  &:disabled { opacity: .3; cursor: default; }
`;

const PageInfo = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,.35);
  flex: 1;
  text-align: center;
`;

/* ── Helpers ─────────────────────────────────────────────────────────── */
const timeAgo = (date, tz) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', ...(tz && { timeZone: tz }) });
};

const SOURCE_NAMES = {
  sorteo: 'Sorteo', quiz: 'Quiz', scratch: 'Raspa y Gana', roulette: 'Ruleta',
  slots: 'Slots', red_black: 'Rojo/Negro', briefcase: 'Maletín',
  treasure_chest: 'Cofre del Tesoro', ranking: 'Ranking',
};
const friendlySource = (key) => SOURCE_NAMES[key] || key || '—';

const STATUS_BADGE  = { pending: 'warning', failed: 'danger', paid: 'success', discarded: 'gray' };
const STATUS_LABELS = { pending: 'Pendiente', failed: 'Fallido', paid: 'Pagado', discarded: 'Descartado' };

const FILTERS = [
  { value: 'pending',   label: 'Pendientes'  },
  { value: 'paid',      label: 'Pagados'     },
  { value: 'discarded', label: 'Descartados' },
  { value: '',          label: 'Todos'       },
];

const PAGE_LIMIT = 20;
const DEFAULT_STATS = { pending: 0, paid: 0, discarded: 0 };
const DEFAULT_PAGINATION = { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1, hasMore: false };

/* ── Component ────────────────────────────────────────────────────────── */
const RewardsPanel = () => {
  const { timezone } = useDateFormat();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [eventId, setEventId]           = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [page, setPage]                 = useState(1);
  const [rewards, setRewards]           = useState([]);
  const [stats, setStats]               = useState(DEFAULT_STATS);
  const [pagination, setPagination]     = useState(DEFAULT_PAGINATION);
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError]               = useState('');

  // Load events list for the dropdown (once on mount)
  useEffect(() => {
    eventsApi.listEvents().then(res => {
      setEvents(res.events || [])
    }).catch(() => {})
  }, [])

  const loadRewards = useCallback(async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.rewards(params);
      setRewards(res.rewards || []);
      setStats(res.stats || DEFAULT_STATS);
      setPagination(res.pagination || DEFAULT_PAGINATION);
    } catch {
      setError('Error al cargar premios. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRewards({
      status:   statusFilter || undefined,
      eventId:  eventId      || undefined,
      dateFrom: dateFrom     || undefined,
      dateTo:   dateTo       || undefined,
      page,
      limit: PAGE_LIMIT,
    });
  }, [loadRewards, statusFilter, eventId, dateFrom, dateTo, page]);

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleEventChange = (e) => {
    setEventId(e.target.value);
    setPage(1);
  };

  const handleDateFrom = (e) => { setDateFrom(e.target.value); setPage(1); };
  const handleDateTo   = (e) => { setDateTo(e.target.value);   setPage(1); };

  const clearSecondary = () => {
    setEventId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasSecondary = Boolean(eventId || dateFrom || dateTo);

  const payReward = async (id) => {
    setActionLoading(id);
    setError('');
    try {
      await eventsApi.payReward(id);
      await loadRewards({
        status: statusFilter || undefined, eventId: eventId || undefined,
        dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
        page, limit: PAGE_LIMIT,
      });
    } catch {
      setError('Error al pagar el premio.');
    } finally {
      setActionLoading(null);
    }
  };

  const discardReward = async (id) => {
    const reason = window.prompt('Motivo del descarte:');
    if (reason === null) return;
    setActionLoading(id);
    setError('');
    try {
      await eventsApi.discardReward(id, reason || '');
      await loadRewards({
        status: statusFilter || undefined, eventId: eventId || undefined,
        dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
        page, limit: PAGE_LIMIT,
      });
    } catch {
      setError('Error al descartar el premio.');
    } finally {
      setActionLoading(null);
    }
  };

  const showPagination = pagination.total > PAGE_LIMIT || page > 1;

  return (
    <Card>
      <CardTitle>Premios de eventos</CardTitle>

      <InfoBox>
        <strong>Premios fallidos</strong> — premios de eventos (ruleta, quiz, etc.) que no se pudieron acreditar
        (típicamente por error C04 = sala del casino sin saldo, o cliente con bono no completado).
        El admin debe arreglar el problema en el casino externo y luego apretar <strong>Pagar</strong> para que se
        registre el premio. Si un premio NO debe pagarse (fraude, ya pagado por otra vía), apretar <strong>Descartar</strong>.
      </InfoBox>

      <FiltersArea>
        {/* Status chips + refresh */}
        <FilterRow>
          {FILTERS.map((f) => (
            <FilterBtn
              key={f.value}
              $active={statusFilter === f.value}
              onClick={() => handleStatusFilter(f.value)}
              disabled={loading}
            >
              {f.label}
            </FilterBtn>
          ))}
          <RefreshBtn
            onClick={() => loadRewards({
              status: statusFilter || undefined, eventId: eventId || undefined,
              dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
              page, limit: PAGE_LIMIT,
            })}
            disabled={loading}
          >
            ↺ Refrescar
          </RefreshBtn>
        </FilterRow>

        {/* Event + date filters */}
        <SecondaryRow>
          <EventSelect value={eventId} onChange={handleEventChange} disabled={loading}>
            <option value="">— Todos los eventos —</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.title || `Evento #${e.id}`}</option>
            ))}
          </EventSelect>
          <DateLabel>Desde</DateLabel>
          <DateInput type="date" value={dateFrom} onChange={handleDateFrom} />
          <DateLabel>Hasta</DateLabel>
          <DateInput type="date" value={dateTo} onChange={handleDateTo} />
          {hasSecondary && (
            <ClearBtn type="button" onClick={clearSecondary}>Limpiar</ClearBtn>
          )}
        </SecondaryRow>
      </FiltersArea>

      {/* Summary cards — server-side, respect event+date filter but not status */}
      <SummaryRow>
        <SummaryCard>
          <SummaryValue $color="#fde68a">{stats.pending}</SummaryValue>
          <SummaryLabel>Pendientes / Fallidos</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue $color="#86efac">{stats.paid}</SummaryValue>
          <SummaryLabel>Pagados</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue $color="rgba(255,255,255,.5)">{stats.discarded}</SummaryValue>
          <SummaryLabel>Descartados</SummaryLabel>
        </SummaryCard>
      </SummaryRow>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {loading ? (
        <LoadingState>Cargando premios...</LoadingState>
      ) : rewards.length === 0 ? (
        <EmptyState>No hay premios para este filtro</EmptyState>
      ) : (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Premio</th>
                  <th>Evento</th>
                  <th>Estado</th>
                  <th>Error / Motivo</th>
                  <th>Intentos</th>
                  <th>Cuándo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => {
                  const isPending   = r.status === 'pending' || r.status === 'failed';
                  const isPaid      = r.status === 'paid';
                  const isDiscarded = r.status === 'discarded';
                  const isActing    = actionLoading === r.id;

                  return (
                    <tr key={r.id}>
                      <td style={{ color: '#f1f5f9', fontWeight: 600 }}>
                        {r.username || r.user_id || '—'}
                      </td>

                      <td style={{ color: 'rgba(255,255,255,.82)' }}>
                        <div>{r.reward_description || r.reward_type || '—'}</div>
                        {r.amount > 0 && (
                          <div style={{ fontSize: 12, color: '#fde68a' }}>
                            ${Number(r.amount).toLocaleString('es-AR')}
                          </div>
                        )}
                      </td>

                      <td>
                        {r.event_title
                          ? <EventBadge title={r.event_title}>{r.event_title}</EventBadge>
                          : <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>
                              {friendlySource(r.event_type_label || r.event_type || r.source)}
                            </span>
                        }
                      </td>

                      <td>
                        <Badge $v={STATUS_BADGE[r.status] || 'gray'}>
                          {STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </td>

                      <td style={{ color: 'rgba(255,255,255,.55)', maxWidth: 180 }}>
                        {r.error_message || r.discard_reason || '—'}
                      </td>

                      <td style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center' }}>
                        {r.retry_count ?? '—'}
                      </td>

                      <td style={{ color: 'rgba(255,255,255,.48)', fontSize: 12 }}>
                        {r.created_at ? timeAgo(r.created_at, timezone) : '—'}
                      </td>

                      <td>
                        {isPending && (
                          <BtnRow>
                            <Btn
                              type="button"
                              disabled={isActing}
                              style={{
                                padding: '6px 12px', fontSize: 12, borderRadius: 10,
                                background: isActing ? 'rgba(255,255,255,.06)' : 'rgba(74,222,128,.18)',
                                color: isActing ? 'rgba(255,255,255,.4)' : '#86efac',
                              }}
                              onClick={() => payReward(r.id)}
                            >
                              {isActing ? '...' : 'Pagar'}
                            </Btn>
                            <Btn
                              type="button"
                              $v="danger"
                              disabled={isActing}
                              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10, opacity: isActing ? 0.5 : 1 }}
                              onClick={() => discardReward(r.id)}
                            >
                              {isActing ? '...' : 'Descartar'}
                            </Btn>
                          </BtnRow>
                        )}
                        {isPaid && <Badge $v="success">Pagado ✓</Badge>}
                        {isDiscarded && (
                          <div>
                            <Badge $v="gray">Descartado</Badge>
                            {r.discard_reason && <MutedText>{r.discard_reason}</MutedText>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>

          {showPagination && (
            <PaginationRow>
              <PageBtn type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
                ← Anterior
              </PageBtn>
              <PageInfo>
                Pág. {page} de {pagination.totalPages} · {pagination.total} total
              </PageInfo>
              <PageBtn type="button" disabled={!pagination.hasMore || loading} onClick={() => setPage(p => p + 1)}>
                Siguiente →
              </PageBtn>
            </PaginationRow>
          )}
        </>
      )}
    </Card>
  );
};

export default RewardsPanel;
