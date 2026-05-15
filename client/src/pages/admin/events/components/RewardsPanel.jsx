import { useState, useEffect } from 'react';
import { useDateFormat } from '../../../../hooks/useDateFormat';
import {
  Card, CardTitle, CardDesc, BtnRow, Btn, Divider,
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

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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
  transition: all .15s;
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
  transition: background .15s;
  &:hover { background: rgba(255,255,255,.1); }
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
  sorteo: 'Sorteo',
  quiz: 'Quiz',
  scratch: 'Raspa y Gana',
  roulette: 'Ruleta',
  slots: 'Slots',
  red_black: 'Rojo/Negro',
  briefcase: 'Maletín',
  treasure_chest: 'Cofre del Tesoro',
  ranking: 'Ranking',
};

const friendlySource = (key) => SOURCE_NAMES[key] || key || '—';

const STATUS_BADGE = {
  pending: 'warning',
  failed:  'danger',
  paid:    'success',
  discarded: 'gray',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  failed:  'Fallido',
  paid:    'Pagado',
  discarded: 'Descartado',
};

const FILTERS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid',    label: 'Pagados'    },
  { value: 'discarded', label: 'Descartados' },
  { value: '',        label: 'Todos'      },
];

/* ── Component ────────────────────────────────────────────────────────── */
const RewardsPanel = () => {
  const { timezone } = useDateFormat();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const loadRewards = async (filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.rewards(filter);
      setRewards(res.rewards || []);
    } catch {
      setError('Error al cargar premios. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards(statusFilter);
  }, [statusFilter]);

  const payReward = async (id) => {
    setActionLoading(id);
    setError('');
    try {
      await eventsApi.payReward(id);
      await loadRewards(statusFilter);
    } catch {
      setError('Error al pagar el premio.');
    } finally {
      setActionLoading(null);
    }
  };

  const discardReward = async (id) => {
    const reason = window.prompt('Motivo del descarte:');
    if (reason === null) return; // cancelled
    setActionLoading(id);
    setError('');
    try {
      await eventsApi.discardReward(id, reason || '');
      await loadRewards(statusFilter);
    } catch {
      setError('Error al descartar el premio.');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Summary counts ── */
  const countByStatus = (s) => rewards.filter((r) => r.status === s).length;
  const pendingCount   = countByStatus('pending') + countByStatus('failed');
  const paidCount      = countByStatus('paid');
  const discardedCount = countByStatus('discarded');

  return (
    <Card>
      <CardTitle>Premios de eventos</CardTitle>

      {/* Info box */}
      <InfoBox>
        <strong>Premios fallidos</strong> — premios de eventos (ruleta, quiz, etc.) que no se pudieron acreditar
        (típicamente por error C04 = sala del casino sin saldo, o cliente con bono no completado).
        El admin debe arreglar el problema en el casino externo y luego apretar <strong>Pagar</strong> para que se
        registre el premio. Si un premio NO debe pagarse (fraude, ya pagado por otra vía), apretar <strong>Descartar</strong>.
      </InfoBox>

      {/* Filter + refresh */}
      <FilterRow>
        {FILTERS.map((f) => (
          <FilterBtn
            key={f.value}
            $active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
            disabled={loading}
          >
            {f.label}
          </FilterBtn>
        ))}
        <RefreshBtn onClick={() => loadRewards(statusFilter)} disabled={loading}>
          ↺ Refrescar
        </RefreshBtn>
      </FilterRow>

      {/* Summary cards — always show global counts */}
      <SummaryRow>
        <SummaryCard>
          <SummaryValue $color="#fde68a">{pendingCount}</SummaryValue>
          <SummaryLabel>Pendientes / Fallidos</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue $color="#86efac">{paidCount}</SummaryValue>
          <SummaryLabel>Pagados</SummaryLabel>
        </SummaryCard>
        <SummaryCard>
          <SummaryValue $color="rgba(255,255,255,.5)">{discardedCount}</SummaryValue>
          <SummaryLabel>Descartados</SummaryLabel>
        </SummaryCard>
      </SummaryRow>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {/* Table */}
      {loading ? (
        <LoadingState>Cargando premios...</LoadingState>
      ) : rewards.length === 0 ? (
        <EmptyState>No hay premios para este filtro</EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Premio</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Error / Motivo</th>
                <th>Intentos</th>
                <th>Cuándo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => {
                const isPending = r.status === 'pending' || r.status === 'failed';
                const isPaid = r.status === 'paid';
                const isDiscarded = r.status === 'discarded';
                const isActing = actionLoading === r.id;

                return (
                  <tr key={r.id}>
                    {/* Usuario */}
                    <td style={{ color: '#f1f5f9', fontWeight: 600 }}>
                      {r.username || r.user_id || '—'}
                    </td>

                    {/* Premio */}
                    <td style={{ color: 'rgba(255,255,255,.82)' }}>
                      <div>{r.reward_description || r.reward_type || '—'}</div>
                      {r.amount > 0 && (
                        <div style={{ fontSize: 12, color: '#fde68a' }}>
                          ${Number(r.amount).toLocaleString('es-AR')}
                        </div>
                      )}
                    </td>

                    {/* Origen */}
                    <td style={{ color: 'rgba(255,255,255,.68)' }}>
                      {friendlySource(r.event_type || r.source)}
                    </td>

                    {/* Estado badge */}
                    <td>
                      <Badge $v={STATUS_BADGE[r.status] || 'gray'}>
                        {STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </td>

                    {/* Error / Motivo */}
                    <td style={{ color: 'rgba(255,255,255,.55)', maxWidth: 180 }}>
                      {r.error_message || r.discard_reason || '—'}
                    </td>

                    {/* Intentos */}
                    <td style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center' }}>
                      {r.retry_count ?? '—'}
                    </td>

                    {/* Cuándo */}
                    <td style={{ color: 'rgba(255,255,255,.48)', fontSize: 12 }}>
                      {r.created_at ? timeAgo(r.created_at, timezone) : '—'}
                    </td>

                    {/* Acciones */}
                    <td>
                      {isPending && (
                        <BtnRow>
                          <Btn
                            type="button"
                            disabled={isActing}
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              borderRadius: 10,
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
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              borderRadius: 10,
                              opacity: isActing ? 0.5 : 1,
                            }}
                            onClick={() => discardReward(r.id)}
                          >
                            {isActing ? '...' : 'Descartar'}
                          </Btn>
                        </BtnRow>
                      )}

                      {isPaid && (
                        <Badge $v="success">Pagado ✓</Badge>
                      )}

                      {isDiscarded && (
                        <div>
                          <Badge $v="gray">Descartado</Badge>
                          {r.discard_reason && (
                            <MutedText>{r.discard_reason}</MutedText>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
};

export default RewardsPanel;
