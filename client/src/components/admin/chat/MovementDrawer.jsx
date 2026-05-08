import { useEffect, useMemo, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SyncIcon from '@mui/icons-material/Sync'
import { api } from '../../../utils/api'

const PROVIDERS = [
  { id: 'all', label: 'Todos' },
  { id: 'manual', label: 'Manual' },
  { id: 'hgcash', label: 'HG Cash' },
  { id: 'telepagos', label: 'Telepagos' },
  { id: 'mercadopago', label: 'Mercado Pago' },
]

const STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  rejected: 'Rechazado',
  error: 'Error',
}

const SYNC_LABELS = {
  synced: 'Sincronizado',
  not_synced: 'No sincronizado',
  error: 'Error',
}

const PROVIDER_LABELS = PROVIDERS.reduce((acc, item) => ({ ...acc, [item.id]: item.label }), {})

const money = (value) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
}).format(Number(value || 0))

const dateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const short = (value, fallback = '-') => {
  const text = String(value || '').trim()
  if (!text) return fallback
  return text.length > 28 ? `${text.slice(0, 25)}...` : text
}

const statusTone = (status) => {
  if (status === 'paid' || status === 'synced') return 'good'
  if (status === 'rejected' || status === 'error') return 'bad'
  return 'wait'
}

const MovementDrawer = ({ chat, onClose }) => {
  const [provider, setProvider] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ movements: [], accounts: [], currentProcessing: null, pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [defaultApplied, setDefaultApplied] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    setProvider('all')
    setAccountId('all')
    setSearch('')
    setPage(1)
    setDefaultApplied(false)
  }, [chat?.id])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!chat?.id) return
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          provider,
          page: String(page),
          limit: '12',
        })
        if (search.trim()) params.set('search', search.trim())
        if (accountId !== 'all') params.set('accountId', accountId)
        const result = await api.get(`/api/chats/${chat.id}/movements?${params.toString()}`)
        if (!alive) return
        setData(result)
        const current = result.currentProcessing
        if (!defaultApplied && current) {
          const nextProvider = current.mode === 'manual'
            ? 'manual'
            : current.activeProvider && current.activeProvider !== 'manual'
              ? current.activeProvider
              : 'all'
          setDefaultApplied(true)
          if (nextProvider !== provider) {
            setProvider(nextProvider)
            setPage(1)
          }
        }
      } catch (err) {
        if (alive) {
          setError(err.message || 'No se pudieron cargar los movimientos.')
          setData(prev => ({ ...prev, movements: [], pagination: null }))
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    const t = setTimeout(load, 160)
    return () => { alive = false; clearTimeout(t) }
  }, [chat?.id, provider, accountId, search, page, defaultApplied])

  const accounts = useMemo(() => {
    if (provider === 'all') return data.accounts || []
    return (data.accounts || []).filter(account => account.provider === provider)
  }, [data.accounts, provider])

  const changeProvider = (nextProvider) => {
    setProvider(nextProvider)
    setAccountId('all')
    setPage(1)
  }

  const changeSearch = (event) => {
    const value = event.target.value
    setSearch(value)
    setPage(1)
  }

  const updateManualStatus = async (movement, status) => {
    if (!chat?.id || movement.provider !== 'manual') return
    setUpdatingId(movement.id)
    try {
      const result = await api.put(`/api/chats/${chat.id}/movements/manual/${movement.id}/status`, { status })
      if (result.movement) {
        setData(prev => ({
          ...prev,
          movements: prev.movements.map(item => item.provider === 'manual' && item.id === movement.id ? result.movement : item),
        }))
      }
    } catch (err) {
      window.alert(err.message || 'No se pudo actualizar el movimiento.')
    } finally {
      setUpdatingId(null)
    }
  }

  const pagination = data.pagination || { page: 1, totalPages: 1, total: 0, hasMore: false }
  const current = data.currentProcessing

  return (
    <Overlay onMouseDown={onClose}>
      <Panel onMouseDown={event => event.stopPropagation()}>
        <Head>
          <TitleWrap>
            <TitleIcon><ReceiptLongIcon /></TitleIcon>
            <div>
              <Kicker>Movimientos del cliente</Kicker>
              <Title>{chat?.username || 'Cliente'}</Title>
            </div>
          </TitleWrap>
          <CloseBtn type="button" onClick={onClose} aria-label="Cerrar movimientos">
            <CloseIcon />
          </CloseBtn>
        </Head>

        <ProcessingBar>
          <ProcessingItem>
            <span>Modo</span>
            <strong>{current?.mode === 'auto' ? 'Banco activo' : 'Manual'}</strong>
          </ProcessingItem>
          <ProcessingItem>
            <span>Proceso</span>
            <strong>{current?.label || 'Sin proceso'}</strong>
          </ProcessingItem>
          <ProcessingItem>
            <span>Cuenta activa</span>
            <strong>{PROVIDER_LABELS[current?.activeProvider] || 'Manual'}</strong>
          </ProcessingItem>
        </ProcessingBar>

        <ProviderTabs aria-label="Filtrar por banco">
          {PROVIDERS.map(item => (
            <ProviderTab
              key={item.id}
              type="button"
              $active={provider === item.id}
              onClick={() => changeProvider(item.id)}
            >
              {item.label}
            </ProviderTab>
          ))}
        </ProviderTabs>

        <Filters>
          <SearchWrap>
            <SearchIcon />
            <SearchInput
              value={search}
              onChange={changeSearch}
              placeholder="Buscar Coelsa, monto, transaction o estatus"
            />
          </SearchWrap>
          <AccountSelect
            value={accountId}
            onChange={event => { setAccountId(event.target.value); setPage(1) }}
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.label}</option>
            ))}
          </AccountSelect>
        </Filters>

        <Body>
          {error ? (
            <Empty>{error}</Empty>
          ) : loading ? (
            <Empty>Cargando movimientos...</Empty>
          ) : data.movements?.length ? (
            <MovementList>
              {data.movements.map(movement => (
                <MovementRow key={`${movement.provider}-${movement.id}`}>
                  <MainCell>
                    <ProviderPill>{PROVIDER_LABELS[movement.provider] || movement.provider}</ProviderPill>
                    <Amount>{money(movement.amount)}</Amount>
                    <SubLine>{movement.accountLabel || 'Sin cuenta'} · {dateTime(movement.createdAt)}</SubLine>
                  </MainCell>

                  <DetailGrid>
                    <Detail>
                      <span>Coelsa</span>
                      <strong>{short(movement.coelsaId)}</strong>
                    </Detail>
                    <Detail>
                      <span>Transaction</span>
                      <strong>{short(movement.transactionId || movement.mercadopagoId)}</strong>
                    </Detail>
                    <Detail>
                      <span>CUIT / CBU</span>
                      <strong>{short(movement.cuit || movement.cbuCvu)}</strong>
                    </Detail>
                    <Detail>
                      <span>Mensaje</span>
                      <strong>{movement.messageId ? `#${movement.messageId}` : '-'}</strong>
                    </Detail>
                  </DetailGrid>

                  <StatusCell>
                    <StatusBadge $tone={statusTone(movement.status)}>
                      {STATUS_LABELS[movement.status] || movement.status}
                    </StatusBadge>
                    {movement.syncStatus && (
                      <SyncBadge $tone={statusTone(movement.syncStatus)}>
                        <SyncIcon />{SYNC_LABELS[movement.syncStatus] || movement.syncStatus}
                      </SyncBadge>
                    )}
                    {movement.isDuplicate && (
                      <Duplicate title={movement.duplicateSummary}>
                        <WarningAmberIcon />Duplicado
                      </Duplicate>
                    )}
                  </StatusCell>

                  {movement.provider === 'manual' && (
                    <Actions>
                      <ActionBtn
                        type="button"
                        $tone="wait"
                        disabled={updatingId === movement.id}
                        onClick={() => updateManualStatus(movement, 'pending')}
                        title="Marcar pendiente"
                      >
                        <HourglassEmptyIcon />
                      </ActionBtn>
                      <ActionBtn
                        type="button"
                        $tone="good"
                        disabled={updatingId === movement.id}
                        onClick={() => updateManualStatus(movement, 'paid')}
                        title="Marcar pagado"
                      >
                        <CheckCircleIcon />
                      </ActionBtn>
                      <ActionBtn
                        type="button"
                        $tone="bad"
                        disabled={updatingId === movement.id}
                        onClick={() => updateManualStatus(movement, 'rejected')}
                        title="Rechazar"
                      >
                        <CancelIcon />
                      </ActionBtn>
                    </Actions>
                  )}
                </MovementRow>
              ))}
            </MovementList>
          ) : (
            <Empty>Sin movimientos para este filtro.</Empty>
          )}
        </Body>

        <Pager>
          <PageText>{pagination.total} movimientos · pagina {pagination.page} de {pagination.totalPages}</PageText>
          <PageActions>
            <PageBtn type="button" disabled={pagination.page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Anterior
            </PageBtn>
            <PageBtn type="button" disabled={!pagination.hasMore || loading} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </PageBtn>
          </PageActions>
        </Pager>
      </Panel>
    </Overlay>
  )
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { transform: translateX(36px); opacity: 0.7; }
  to { transform: translateX(0); opacity: 1; }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1900;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: ${fadeIn} 0.16s ease both;
`

const Panel = styled.aside`
  width: min(860px, 100vw);
  height: var(--app-height, 100dvh);
  display: flex;
  flex-direction: column;
  background: #0b1020;
  border-left: 1px solid rgba(255,255,255,0.10);
  box-shadow: -22px 0 70px rgba(0,0,0,0.45);
  animation: ${slideIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
`

const TitleWrap = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`

const TitleIcon = styled.span`
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #93c5fd;
  background: rgba(37, 99, 235, 0.16);
  border: 1px solid rgba(147,197,253,0.22);
  svg { font-size: 20px; }
`

const Kicker = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: rgba(147,197,253,0.88);
  text-transform: uppercase;
`

const Title = styled.h2`
  margin: 2px 0 0;
  color: #ffffff;
  font-size: 18px;
  line-height: 1.15;
`

const CloseBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  svg { font-size: 18px; }
  &:hover { color: #ffffff; background: rgba(255,255,255,0.09); }
`

const ProcessingBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.07);

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const ProcessingItem = styled.div`
  min-width: 0;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.07);
  span {
    display: block;
    color: rgba(255,255,255,0.42);
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
  }
  strong {
    display: block;
    margin-top: 2px;
    color: rgba(255,255,255,0.86);
    font-size: 12.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const ProviderTabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 18px 8px;
  overflow-x: auto;
`

const ProviderTab = styled.button`
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.58);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  ${({ $active }) => $active && css`
    color: #ffffff;
    border-color: rgba(96,165,250,0.42);
    background: rgba(37,99,235,0.22);
  `}
`

const Filters = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px);
  gap: 10px;
  padding: 0 18px 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const SearchWrap = styled.label`
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.34);
  svg { font-size: 18px; flex-shrink: 0; }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  &::placeholder { color: rgba(255,255,255,0.28); }
`

const AccountSelect = styled.select`
  height: 38px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: #11182b;
  color: rgba(255,255,255,0.82);
  padding: 0 10px;
  font: inherit;
  font-size: 12.5px;
  outline: 0;
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18px 12px;
`

const MovementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MovementRow = styled.div`
  display: grid;
  grid-template-columns: minmax(170px, 1.05fr) minmax(260px, 1.6fr) minmax(132px, 0.75fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.045);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`

const MainCell = styled.div`
  min-width: 0;
`

const ProviderPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(96,165,250,0.14);
  color: #93c5fd;
  font-size: 10.5px;
  font-weight: 900;
`

const Amount = styled.div`
  margin-top: 6px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
`

const SubLine = styled.div`
  margin-top: 2px;
  color: rgba(255,255,255,0.42);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DetailGrid = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Detail = styled.div`
  min-width: 0;
  span {
    display: block;
    color: rgba(255,255,255,0.34);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }
  strong {
    display: block;
    margin-top: 2px;
    color: rgba(255,255,255,0.78);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const StatusCell = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 5px;
`

const badgeColors = {
  good: ['rgba(34,197,94,0.14)', '#86efac', 'rgba(34,197,94,0.26)'],
  bad: ['rgba(239,68,68,0.14)', '#fca5a5', 'rgba(239,68,68,0.26)'],
  wait: ['rgba(245,158,11,0.14)', '#fcd34d', 'rgba(245,158,11,0.26)'],
}

const StatusBadge = styled.span`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ $tone }) => badgeColors[$tone]?.[0]};
  color: ${({ $tone }) => badgeColors[$tone]?.[1]};
  border: 1px solid ${({ $tone }) => badgeColors[$tone]?.[2]};
  font-size: 11px;
  font-weight: 900;
`

const SyncBadge = styled(StatusBadge)`
  gap: 4px;
  svg { font-size: 13px; }
`

const Duplicate = styled.span`
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(245,158,11,0.10);
  color: #fcd34d;
  border: 1px solid rgba(245,158,11,0.22);
  font-size: 10.5px;
  font-weight: 900;
  svg { font-size: 13px; }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const actionColors = {
  good: '#22c55e',
  bad: '#ef4444',
  wait: '#f59e0b',
}

const ActionBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $tone }) => `${actionColors[$tone]}44`};
  background: ${({ $tone }) => `${actionColors[$tone]}18`};
  color: ${({ $tone }) => actionColors[$tone]};
  cursor: pointer;
  svg { font-size: 17px; }
  &:disabled { opacity: 0.45; cursor: default; }
`

const Empty = styled.div`
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.42);
  font-size: 13px;
`

const Pager = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid rgba(255,255,255,0.08);

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
  }
`

const PageText = styled.div`
  color: rgba(255,255,255,0.46);
  font-size: 12px;
  font-weight: 700;
`

const PageActions = styled.div`
  display: flex;
  gap: 8px;
`

const PageBtn = styled.button`
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.76);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  &:disabled { opacity: 0.42; cursor: default; }
`

export default MovementDrawer
