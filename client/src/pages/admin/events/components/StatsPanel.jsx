import { useState, useEffect } from 'react';
import { useDateFormat } from '../../../../hooks/useDateFormat';
import {
  Card, CardTitle, CardDesc, BtnRow, Btn,
  StatGrid, Divider,
} from '../EventsPage.styles.js';
import { eventsApi } from '../services/eventsApi.js';
import styled from 'styled-components';

/* ── Local styled helpers ─────────────────────────────────────────────── */
const PeriodRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const PeriodBtn = styled.button`
  border: 1px solid ${({ $active }) => $active ? 'rgba(45,125,255,.6)' : 'rgba(255,255,255,.1)'};
  background: ${({ $active }) => $active ? 'rgba(45,125,255,.22)' : 'rgba(255,255,255,.04)'};
  color: ${({ $active }) => $active ? '#dbeafe' : 'rgba(255,255,255,.7)'};
  padding: 9px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all .15s;
  &:hover { background: ${({ $active }) => $active ? 'rgba(45,125,255,.30)' : 'rgba(255,255,255,.09)'}; }
`;

const StatCard = styled.div`
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px;
  padding: 16px;
`;

const StatValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: ${({ $color }) => $color || '#f1f5f9'};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  color: rgba(255,255,255,.52);
  font-size: 12px;
  margin-top: 4px;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  @media (max-width: 840px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 14px;
  margin-top: 10px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    text-align: left;
    white-space: nowrap;
  }
  th { color: rgba(255,255,255,.48); font-weight: 600; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
`;

const EmptyState = styled.div`
  padding: 28px;
  text-align: center;
  color: rgba(255,255,255,.35);
  font-size: 14px;
`;

const LoadingState = styled.div`
  padding: 40px;
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
  margin-bottom: 16px;
`;

/* ── Constants ────────────────────────────────────────────────────────── */
const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

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

const friendlySource = (key) => SOURCE_NAMES[key] || key;

/* ── Component ────────────────────────────────────────────────────────── */
const StatsPanel = () => {
  const { timezone } = useDateFormat();
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadStats = async (p) => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.stats(p);
      setStats(res);
    } catch {
      setError('Error al cargar estadísticas. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(period);
  }, [period]);

  const kpis = stats?.kpis || {};
  const bySource = stats?.bySource || [];
  const daily = stats?.daily || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Period filter */}
      <Card>
        <CardTitle>Estadísticas de premios</CardTitle>
        <CardDesc>Métricas de eventos y premios por período seleccionado.</CardDesc>
        <PeriodRow>
          {PERIODS.map((p) => (
            <PeriodBtn
              key={p.value}
              $active={period === p.value}
              onClick={() => setPeriod(p.value)}
              disabled={loading}
            >
              {p.label}
            </PeriodBtn>
          ))}
        </PeriodRow>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        {loading ? (
          <LoadingState>Cargando estadísticas...</LoadingState>
        ) : (
          <KpiGrid>
            <StatCard>
              <StatValue>{(kpis.total_rewards ?? 0).toLocaleString('es-AR')}</StatValue>
              <StatLabel>Total generados</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#86efac">{(kpis.paid_rewards ?? 0).toLocaleString('es-AR')}</StatValue>
              <StatLabel>Pagados</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#fca5a5">{(kpis.failed_rewards ?? 0).toLocaleString('es-AR')}</StatValue>
              <StatLabel>Fallidos</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="rgba(255,255,255,.6)">{(kpis.discarded_rewards ?? 0).toLocaleString('es-AR')}</StatValue>
              <StatLabel>Descartados</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#fde68a">
                ${(kpis.total_amount ?? 0).toLocaleString('es-AR')}
              </StatValue>
              <StatLabel>Fichas entregadas</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue $color="#93c5fd">{(kpis.unique_users ?? 0).toLocaleString('es-AR')}</StatValue>
              <StatLabel>Usuarios beneficiados</StatLabel>
            </StatCard>
          </KpiGrid>
        )}
      </Card>

      {/* By source table */}
      {!loading && (
        <Card>
          <CardTitle>Desglose por tipo de juego</CardTitle>
          <CardDesc>Total de premios generados y fichas entregadas por tipo de evento.</CardDesc>
          {bySource.length === 0 ? (
            <EmptyState>Sin datos para este período</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Juego</th>
                    <th>Total premios</th>
                    <th>Fichas entregadas</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: '#f1f5f9', fontWeight: 600 }}>
                        {friendlySource(row.source)}
                      </td>
                      <td style={{ color: 'rgba(255,255,255,.78)' }}>
                        {(row.total ?? 0).toLocaleString('es-AR')}
                      </td>
                      <td style={{ color: '#fde68a' }}>
                        ${(row.amount ?? 0).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* Daily breakdown table */}
      {!loading && (
        <Card>
          <CardTitle>Actividad por día</CardTitle>
          <CardDesc>Detalle diario de premios por tipo de evento.</CardDesc>
          {daily.length === 0 ? (
            <EmptyState>Sin actividad registrada para este período</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Pagados</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>
                        {row.day ? new Date(row.day + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', ...(timezone && { timeZone: timezone }) }) : '—'}
                      </td>
                      <td style={{ color: '#f1f5f9', fontWeight: 600 }}>
                        {friendlySource(row.event_type)}
                      </td>
                      <td style={{ color: 'rgba(255,255,255,.78)' }}>
                        {(row.total ?? 0).toLocaleString('es-AR')}
                      </td>
                      <td style={{ color: '#86efac' }}>
                        {(row.paid ?? 0).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      )}

    </div>
  );
};

export default StatsPanel;
