import { useEffect, useRef, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { api } from '../../../utils/api'

const PAGE_LIMIT = 20

const DEFAULT_STATS = {
  totalDeposited: 0, totalWithdrawn: 0,
  depositCount: 0, withdrawalCount: 0, totalCount: 0,
}
const DEFAULT_PAGINATION = { total: 0, totalPages: 1, hasMore: false, page: 1 }

/* ─── helpers ─────────────────────────────────────────────── */
const fmtAmount = (n) => {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fmtDate = (value, tz) => {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return String(value)
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...(tz && { timeZone: tz }),
  })
}

const SOURCE_LABELS = {
  manual:      'Comprobante',
  hgcash:      'HGCash',
  mercadopago: 'Mercado Pago',
  withdrawal:  'Retiro',
}

const STATUS_META = {
  paid:     { label: 'Acreditado', tone: 'good' },
  approved: { label: 'Aprobado',   tone: 'good' },
  rejected: { label: 'Rechazado',  tone: 'bad'  },
  pending:  { label: 'Pendiente',  tone: 'wait' },
}

/* ─── animations ──────────────────────────────────────────── */
const fadeIn  = keyframes`from { opacity: 0; } to { opacity: 1; }`
const slideIn = keyframes`from { transform: translateX(100%); } to { transform: translateX(0); }`
const spin    = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`

/* ─── layout ─────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.20s ease both;
`

const Panel = styled.div`
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: min(460px, 100vw);
  background: #0a0a16;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  z-index: 401;
  animation: ${slideIn} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
`

/* ─── header ─────────────────────────────────────────────── */
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`

const HeadIcon = styled.div`
  width: 40px; height: 40px;
  border-radius: 12px;
  background: rgba(30, 133, 255, 0.12);
  border: 1px solid rgba(30, 133, 255, 0.22);
  display: flex; align-items: center; justify-content: center;
  color: #60a5fa; flex-shrink: 0;
  svg { font-size: 20px; }
`

const HeadText = styled.div`flex: 1; min-width: 0;`

const HeadTitle = styled.h3`
  font-size: 15px; font-weight: 700; color: #ffffff; margin: 0;
`

const HeadSub = styled.p`
  font-size: 11px; color: rgba(255, 255, 255, 0.30); margin: 3px 0 0;
`

const HeadActions = styled.div`display: flex; gap: 6px; flex-shrink: 0;`

const IconBtn = styled.button`
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.40);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 16px; transition: transform 0.3s; }
  &:hover { color: rgba(255, 255, 255, 0.80); background: rgba(255, 255, 255, 0.08); }
  ${({ $loading }) => $loading && css`svg { animation: ${spin} 0.7s linear infinite; }`}
`

/* ─── stats ──────────────────────────────────────────────── */
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`

const StatCell = styled.div`
  padding: 12px 16px;
  background: #0a0a16;
  display: flex; align-items: center; gap: 10px;
`

const StatCellIcon = styled.div`
  width: 32px; height: 32px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  ${({ $type }) => $type === 'deposit' ? css`
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.22);
    color: #4ade80;
  ` : css`
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #f87171;
  `}
  svg { font-size: 16px; }
`

const StatCellBody = styled.div``

const StatCellLabel = styled.p`
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28); margin: 0;
`

const StatCellValue = styled.p`
  font-size: 14px; font-weight: 700;
  color: ${({ $type }) => $type === 'deposit' ? '#4ade80' : '#f87171'};
  margin: 2px 0 0;
  font-variant-numeric: tabular-nums;
`

/* ─── search ─────────────────────────────────────────────── */
const SearchRow = styled.div`
  padding: 10px 14px 0;
  flex-shrink: 0;
`

const SearchField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border-color 0.2s, background 0.2s;
  &:focus-within {
    border-color: rgba(30, 133, 255, 0.40);
    background: rgba(30, 133, 255, 0.04);
  }
  > svg { font-size: 16px; color: rgba(255, 255, 255, 0.25); flex-shrink: 0; }
`

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.80);
  font-family: inherit;
  &::placeholder { color: rgba(255, 255, 255, 0.22); }
`

const SearchClearBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.40);
  cursor: pointer; flex-shrink: 0;
  svg { font-size: 12px; }
  &:hover { background: rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.70); }
`

const SearchHint = styled.p`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.18);
  margin: 5px 2px 0;
  letter-spacing: 0.01em;
`

/* ─── filters ────────────────────────────────────────────── */
const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`

const FilterChip = styled.button`
  padding: 5px 13px;
  border-radius: 20px;
  font-size: 11px; font-weight: 700;
  font-family: inherit; cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  ${({ $active }) => $active ? css`
    background: rgba(30, 133, 255, 0.20);
    border: 1px solid rgba(30, 133, 255, 0.40);
    color: #93c5fd;
  ` : css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.40);
  `}
  &:hover { border-color: rgba(30, 133, 255, 0.30); color: #93c5fd; }
`

const FilterCount = styled.span`
  display: inline-block;
  padding: 0 5px;
  margin-left: 4px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800;
  vertical-align: middle;
  ${({ $active }) => $active ? css`
    background: rgba(30, 133, 255, 0.35);
    color: #bfdbfe;
  ` : css`
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.30);
  `}
`

/* ─── list ───────────────────────────────────────────────── */
const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 4px;
  transition: opacity 0.15s;
  opacity: ${({ $dim }) => $dim ? 0.45 : 1};
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 2px; }
`

const TxItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
  &:hover { background: rgba(255, 255, 255, 0.025); }
  &:last-child { border-bottom: none; }
`

const TxKindIcon = styled.div`
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  ${({ $kind }) => $kind === 'deposit' ? css`
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.22);
    color: #4ade80;
  ` : css`
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #f87171;
  `}
  svg { font-size: 17px; }
`

const TxBody = styled.div`flex: 1; min-width: 0;`

const TxTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const TxAmount = styled.span`
  font-size: 14px; font-weight: 700;
  color: ${({ $kind }) => $kind === 'deposit' ? '#4ade80' : '#f87171'};
  font-variant-numeric: tabular-nums;
`

const TxSourceBadge = styled.span`
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 10px; font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.45);
`

const TxStatusBadge = styled.span`
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 10px; font-weight: 700;
  ${({ $tone }) =>
    $tone === 'good' ? css`background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.22); color: #4ade80;` :
    $tone === 'bad'  ? css`background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.22); color: #f87171;` :
    css`background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.22); color: #fbbf24;`
  }
`

const TxMeta = styled.div`
  display: flex; align-items: center;
  gap: 8px; margin-top: 4px;
  flex-wrap: wrap;
`

const TxDate = styled.span`
  font-size: 11px; color: rgba(255, 255, 255, 0.22);
`

const TxIdBadge = styled.span`
  font-size: 10px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  padding: 1px 6px;
  letter-spacing: 0.02em;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ─── empty / loading ────────────────────────────────────── */
const EmptyState = styled.div`
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px;
  padding: 52px 24px;
  color: rgba(255, 255, 255, 0.20);
  text-align: center;
  svg { font-size: 2.2rem; }
  p { font-size: 13px; margin: 0; }
  small { font-size: 11px; color: rgba(255,255,255,0.14); }
`

const LoadingState = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: 52px 24px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 13px; gap: 10px;
  svg { font-size: 18px; animation: ${spin} 0.7s linear infinite; }
`

/* ─── pagination ─────────────────────────────────────────── */
const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  gap: 8px;
`

const PageBtn = styled.button`
  display: flex; align-items: center; gap: 3px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px; font-family: inherit; cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 16px; }
  &:hover:not(:disabled) { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.08); }
  &:disabled { opacity: 0.30; cursor: default; }
`

const PageInfo = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.28);
  text-align: center;
  flex: 1;
  white-space: nowrap;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  svg { font-size: 14px; animation: ${spin} 0.7s linear infinite; color: rgba(255,255,255,0.35); }
`

/* ─── main component ──────────────────────────────────────── */
const TransactionHistoryDrawer = ({ chat, onClose }) => {
  const { timezone }                    = useDateFormat()
  const [transactions, setTransactions] = useState([])
  const [stats, setStats]               = useState(DEFAULT_STATS)
  const [pagination, setPagination]     = useState(DEFAULT_PAGINATION)
  const [loading, setLoading]           = useState(false)
  const [filter, setFilter]             = useState('all')
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const debounceRef                     = useRef(null)

  /* reset everything when chat changes */
  useEffect(() => {
    setFilter('all')
    setSearchInput('')
    setSearch('')
    setPage(1)
    setTransactions([])
    setStats(DEFAULT_STATS)
    setPagination(DEFAULT_PAGINATION)
  }, [chat?.id])

  /* fetch whenever any query param changes */
  useEffect(() => {
    if (!chat?.id) return
    let alive = true

    const kindParam = filter === 'deposits' ? 'deposit' : filter === 'withdrawals' ? 'withdrawal' : null
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) })
    if (search) params.set('search', search)
    if (kindParam) params.set('kind', kindParam)

    setLoading(true)
    api.get(`/api/chats/${chat.id}/transactions?${params}`)
      .then(data => {
        if (!alive) return
        setTransactions(data.transactions || [])
        setPagination(data.pagination || DEFAULT_PAGINATION)
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {
        if (!alive) return
        setTransactions([])
        setPagination(DEFAULT_PAGINATION)
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [chat?.id, filter, search, page])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setSearch(val)
    }, 380)
  }

  const clearSearch = () => {
    clearTimeout(debounceRef.current)
    setSearchInput('')
    setPage(1)
    setSearch('')
  }

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return
    setFilter(newFilter)
    setPage(1)
  }

  const showPagination = pagination.total > PAGE_LIMIT || page > 1

  return (
    <>
      <Overlay onClick={onClose} />
      <Panel>
        {/* header */}
        <Head>
          <HeadIcon><ReceiptLongOutlinedIcon /></HeadIcon>
          <HeadText>
            <HeadTitle>Historial de transacciones</HeadTitle>
            <HeadSub>{chat.username} · {stats.totalCount} registro{stats.totalCount !== 1 ? 's' : ''}</HeadSub>
          </HeadText>
          <HeadActions>
            <IconBtn type="button" $loading={loading} onClick={() => { setPage(1); setSearch(searchInput) }} aria-label="Actualizar">
              <RefreshOutlinedIcon />
            </IconBtn>
            <IconBtn type="button" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </IconBtn>
          </HeadActions>
        </Head>

        {/* stats */}
        <StatsRow>
          <StatCell>
            <StatCellIcon $type="deposit"><AccountBalanceWalletOutlinedIcon /></StatCellIcon>
            <StatCellBody>
              <StatCellLabel>Depositado</StatCellLabel>
              <StatCellValue $type="deposit">$ {fmtAmount(stats.totalDeposited)}</StatCellValue>
            </StatCellBody>
          </StatCell>
          <StatCell>
            <StatCellIcon $type="withdrawal"><CurrencyExchangeIcon /></StatCellIcon>
            <StatCellBody>
              <StatCellLabel>Retirado</StatCellLabel>
              <StatCellValue $type="withdrawal">$ {fmtAmount(stats.totalWithdrawn)}</StatCellValue>
            </StatCellBody>
          </StatCell>
        </StatsRow>

        {/* search */}
        <SearchRow>
          <SearchField>
            <SearchIcon />
            <SearchInput
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Monto, N° de transacción, COELSA..."
              type="search"
            />
            {searchInput && (
              <SearchClearBtn type="button" onClick={clearSearch} aria-label="Limpiar búsqueda">
                <ClearIcon />
              </SearchClearBtn>
            )}
          </SearchField>
          {!searchInput && (
            <SearchHint>Busca por monto, número de transacción o código COELSA</SearchHint>
          )}
        </SearchRow>

        {/* filters */}
        <FilterRow>
          <FilterChip $active={filter === 'all'} onClick={() => handleFilterChange('all')}>
            Todos<FilterCount $active={filter === 'all'}>{stats.totalCount}</FilterCount>
          </FilterChip>
          <FilterChip $active={filter === 'deposits'} onClick={() => handleFilterChange('deposits')}>
            Depósitos<FilterCount $active={filter === 'deposits'}>{stats.depositCount}</FilterCount>
          </FilterChip>
          <FilterChip $active={filter === 'withdrawals'} onClick={() => handleFilterChange('withdrawals')}>
            Retiros<FilterCount $active={filter === 'withdrawals'}>{stats.withdrawalCount}</FilterCount>
          </FilterChip>
        </FilterRow>

        {/* list */}
        <ListWrap $dim={loading && transactions.length > 0}>
          {loading && transactions.length === 0 ? (
            <LoadingState><RefreshOutlinedIcon />Cargando transacciones...</LoadingState>
          ) : transactions.length === 0 ? (
            <EmptyState>
              <ReceiptLongOutlinedIcon />
              {search
                ? <>
                    <p>Sin resultados</p>
                    <small>Ninguna transacción coincide con "{search}"</small>
                  </>
                : <p>Sin transacciones registradas</p>
              }
            </EmptyState>
          ) : (
            transactions.map((tx, i) => {
              const statusMeta = STATUS_META[tx.status] || { label: tx.status, tone: 'wait' }
              return (
                <TxItem key={`${tx.kind}-${tx.id}-${i}`}>
                  <TxKindIcon $kind={tx.kind}>
                    {tx.kind === 'deposit' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                  </TxKindIcon>
                  <TxBody>
                    <TxTopRow>
                      <TxAmount $kind={tx.kind}>
                        {tx.amount !== null ? `$ ${fmtAmount(tx.amount)}` : '—'}
                      </TxAmount>
                      <TxSourceBadge>{SOURCE_LABELS[tx.source] || tx.source}</TxSourceBadge>
                      <TxStatusBadge $tone={statusMeta.tone}>{statusMeta.label}</TxStatusBadge>
                    </TxTopRow>
                    <TxMeta>
                      <TxDate>{fmtDate(tx.createdAt, timezone)}</TxDate>
                      {tx.transactionId && <TxIdBadge title={tx.transactionId}>{tx.transactionId}</TxIdBadge>}
                    </TxMeta>
                  </TxBody>
                </TxItem>
              )
            })
          )}
        </ListWrap>

        {/* pagination */}
        {showPagination && (
          <PaginationRow>
            <PageBtn
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeftIcon />Anterior
            </PageBtn>
            <PageInfo>
              {loading
                ? <RefreshOutlinedIcon />
                : `Pág. ${page} de ${pagination.totalPages} · ${pagination.total} total`
              }
            </PageInfo>
            <PageBtn
              type="button"
              disabled={!pagination.hasMore || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente<ChevronRightIcon />
            </PageBtn>
          </PaginationRow>
        )}
      </Panel>
    </>
  )
}

export default TransactionHistoryDrawer
