import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SyncIcon from '@mui/icons-material/Sync'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import { api } from '../../../utils/api'
import { useToast } from '../../../context/ToastContext'
import ReceiptLogModal from './ReceiptLogModal'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

const resolveUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

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

const ID_TYPE_LABELS = {
  numerico: 'Numérico (12 dígitos)',
  alfanumerico: 'Alfanumérico',
  indefinido: 'Indefinido',
}

const AI_MODEL_LABELS = {
  'google/gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  'google/gemini-2.0-flash-001': 'Gemini 2.0 Flash',
  'openai/gpt-4o-mini': 'GPT-4o Mini',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'openai/gpt-4o': 'GPT-4o',
}

const PROVIDER_LABELS = PROVIDERS.reduce((acc, item) => ({ ...acc, [item.id]: item.label }), {})

const money = (value) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
}).format(Number(value || 0))

const dateTime = (value, tz) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
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

/* ─── Detail Sheet ──────────────────────────────────────────────────── */
const DetailInfoRow = ({ label, value, mono }) => (
  value ? (
    <InfoItem>
      <InfoLabel>{label}</InfoLabel>
      <InfoValue $mono={mono}>{value}</InfoValue>
    </InfoItem>
  ) : null
)

const REJECT_EVENTS = ['deposit_failed', 'receipt_invalid', 'receipt_amount_low', 'receipt_duplicate', 'receipt_insufficient_info']

const MovementDetail = ({ movement, chatId, onBack, onStatusChange, initialAction }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const [updatingId, setUpdatingId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [rejectMsgs, setRejectMsgs] = useState([])
  const [selectedMsg, setSelectedMsg] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customMsg, setCustomMsg] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showReceiptLog, setShowReceiptLog] = useState(false)
  const ai = movement.aiExtractedText || {}
  const receiptSrc = resolveUrl(movement.receiptUrl)

  // Apply initialAction whenever the opened movement changes
  useEffect(() => {
    setPendingAction(initialAction || null)
    setEditAmount(initialAction === 'paid' ? String(movement.amount || '') : '')
  }, [movement.id, initialAction])

  // Load rejection messages whenever the rejected form is opened
  useEffect(() => {
    if (pendingAction !== 'rejected' || rejectMsgs.length > 0) return
    setLoadingMsgs(true)
    api.get('/api/settings/auto-messages')
      .then(result => {
        const msgs = (result.messages || []).filter(m => REJECT_EVENTS.includes(m.event) && m.isActive)
        setRejectMsgs(msgs)
        if (msgs.length > 0) { setSelectedMsg(msgs[0].message); setIsCustom(false) }
        else setIsCustom(true)
      })
      .catch(() => setIsCustom(true))
      .finally(() => setLoadingMsgs(false))
  }, [pendingAction])

  const updateToPending = async () => {
    if (movement.provider !== 'manual') return
    setUpdatingId('pending')
    try {
      const result = await api.put(`/api/chats/${chatId}/movements/manual/${movement.id}/status`, { status: 'pending' })
      if (result.movement) onStatusChange(result.movement)
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el movimiento.')
    } finally {
      setUpdatingId(null)
    }
  }

  const openPaid = () => { setEditAmount(String(movement.amount || '')); setPendingAction('paid') }
  const openRejected = () => setPendingAction('rejected')
  const cancelAction = () => setPendingAction(null)

  const confirmPaid = async () => {
    const amount = parseFloat(String(editAmount).replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Ingresá un monto válido.'); return }
    setUpdatingId('paid')
    try {
      const result = await api.put(`/api/chats/${chatId}/movements/manual/${movement.id}/resolve`, { action: 'paid', amount })
      if (result.movement) { onStatusChange(result.movement); setPendingAction(null) }
    } catch (err) {
      toast.error(err.message || 'No se pudo procesar el pago.')
    } finally {
      setUpdatingId(null)
    }
  }

  const confirmRejected = async () => {
    const message = isCustom ? customMsg.trim() : selectedMsg
    if (!message) { toast.error('Seleccioná o escribí un mensaje para el cliente.'); return }
    setUpdatingId('rejected')
    try {
      const result = await api.put(`/api/chats/${chatId}/movements/manual/${movement.id}/resolve`, { action: 'rejected', message })
      if (result.movement) { onStatusChange(result.movement); setPendingAction(null) }
    } catch (err) {
      toast.error(err.message || 'No se pudo rechazar el movimiento.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <DetailSheet>
      <DetailHead>
        <BackBtn type="button" onClick={onBack}>
          <ArrowBackIcon />
          <span>Volver</span>
        </BackBtn>
        <DetailHeadTitle>Detalle del movimiento</DetailHeadTitle>
      </DetailHead>

      <DetailBody>
        {/* ── Hero ─────────────────────────────────────── */}
        <DetailHero>
          <DetailHeroChips>
            <ProviderPill>{PROVIDER_LABELS[movement.provider] || movement.provider}</ProviderPill>
            <StatusBadge $tone={statusTone(movement.status)}>
              {STATUS_LABELS[movement.status] || movement.status}
            </StatusBadge>
            {movement.isDuplicate && (
              <Duplicate><WarningAmberIcon />Duplicado</Duplicate>
            )}
          </DetailHeroChips>
          <DetailAmount>{money(movement.amount)}</DetailAmount>
          <DetailHeroSub>
            {movement.accountLabel || 'Sin cuenta'}
            <span>·</span>
            {dateTime(movement.createdAt, timezone)}
          </DetailHeroSub>
          {movement.processedBy && (
            <DetailHeroSub>
              Procesado por <strong>{movement.processedBy}</strong>
              {movement.processedAt ? ` · ${dateTime(movement.processedAt, timezone)}` : ''}
            </DetailHeroSub>
          )}
        </DetailHero>

        {/* ── Comprobante ───────────────────────────────── */}
        {receiptSrc && (
          <DetailSection>
            <SectionTitle>Comprobante</SectionTitle>
            <ReceiptBox>
              <ReceiptImg
                src={receiptSrc}
                alt="Comprobante"
                onClick={() => window.open(receiptSrc, '_blank')}
              />
              <ReceiptOpenBtn
                as="a"
                href={receiptSrc}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir en nueva pestaña"
              >
                <OpenInNewIcon />
              </ReceiptOpenBtn>
            </ReceiptBox>
          </DetailSection>
        )}

        {/* ── Extracción IA ─────────────────────────────── */}
        <DetailSection>
          <SectionTitle>
            <AutoAwesomeOutlinedIcon />
            Extracción IA
            <AiStatusChip $ok={movement.aiStatus === 'ok'}>
              {movement.aiStatus === 'ok' ? 'OK' : 'Error'}
            </AiStatusChip>
          </SectionTitle>
          <InfoGrid>
            <DetailInfoRow label="Coelsa / ID" value={movement.coelsaId || movement.transactionId} mono />
            <DetailInfoRow label="Tipo de ID"  value={ID_TYPE_LABELS[ai.id_type] || ai.id_type} />
            <DetailInfoRow label="Monto extraído" value={ai.amount != null ? money(ai.amount) : null} />
            <DetailInfoRow label="Modelo IA" value={movement.aiStatus === 'ok' ? (AI_MODEL_LABELS[movement.aiModel] || movement.aiModel || 'IA') : null} />
            <DetailInfoRow label="Mensaje origen" value={movement.messageId ? `#${movement.messageId}` : null} />
          </InfoGrid>
          {!movement.coelsaId && !movement.transactionId && movement.aiStatus !== 'ok' && (
            <InfoEmpty>La IA no pudo extraer datos del comprobante.</InfoEmpty>
          )}
          {movement.messageId && (
            <LogAiBtn type="button" onClick={() => setShowReceiptLog(true)}>
              <SmartToyOutlinedIcon />Ver log de procesamiento
            </LogAiBtn>
          )}
        </DetailSection>
        {showReceiptLog && movement.messageId && (
          <ReceiptLogModal
            chatId={chatId}
            messageId={movement.messageId}
            onClose={() => setShowReceiptLog(false)}
          />
        )}

        {/* ── Datos bancarios ───────────────────────────── */}
        {(movement.cuit || movement.cbuCvu || movement.accountHolder || movement.description) && (
          <DetailSection>
            <SectionTitle>Datos bancarios</SectionTitle>
            <InfoGrid>
              <DetailInfoRow label="CUIT"         value={movement.cuit} mono />
              <DetailInfoRow label="CBU / CVU"    value={movement.cbuCvu} mono />
              <DetailInfoRow label="Titular"      value={movement.accountHolder} />
              <DetailInfoRow label="Descripción"  value={movement.description} />
            </InfoGrid>
          </DetailSection>
        )}

        {/* ── Duplicado ─────────────────────────────────── */}
        {movement.isDuplicate && (
          <DetailSection>
            <DuplicateAlert>
              <WarningAmberIcon />
              <div>
                <strong>Comprobante duplicado</strong>
                <p>{movement.duplicateSummary || 'Este comprobante ya fue procesado anteriormente.'}</p>
              </div>
            </DuplicateAlert>
          </DetailSection>
        )}

        {/* ── Acciones ──────────────────────────────────── */}
        {movement.provider === 'manual' && (
          <DetailSection>
            <SectionTitle>Cambiar estado</SectionTitle>

            {!pendingAction && (
              <DetailActions>
                <DetailActionBtn type="button" $tone="wait" $active={movement.status === 'pending'}
                  disabled={!!updatingId} onClick={updateToPending}>
                  <HourglassEmptyIcon />Pendiente
                </DetailActionBtn>
                <DetailActionBtn type="button" $tone="good" $active={movement.status === 'paid'}
                  disabled={!!updatingId} onClick={openPaid}>
                  <CheckCircleIcon />Pagado
                </DetailActionBtn>
                <DetailActionBtn type="button" $tone="bad" $active={movement.status === 'rejected'}
                  disabled={!!updatingId} onClick={openRejected}>
                  <CancelIcon />Rechazado
                </DetailActionBtn>
              </DetailActions>
            )}

            {pendingAction === 'paid' && (
              <ConfirmCard>
                <ConfirmCardTitle $tone="good"><CheckCircleIcon />Confirmar depósito</ConfirmCardTitle>
                <ConfirmNote>Verificá el monto antes de acreditar. Se notificará al cliente automáticamente y se reiniciará el bot.</ConfirmNote>
                <AmountRow>
                  <AmountLabel>Monto a acreditar</AmountLabel>
                  <AmountInput
                    type="number" min="0.01" step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    autoFocus
                    placeholder="0.00"
                  />
                </AmountRow>
                <ConfirmActions>
                  <ResolveBtn type="button" $tone="good" disabled={!!updatingId} onClick={confirmPaid}>
                    <CheckCircleIcon />{updatingId === 'paid' ? 'Procesando...' : 'Confirmar pago'}
                  </ResolveBtn>
                  <CancelActionBtn type="button" onClick={cancelAction} disabled={!!updatingId}>Cancelar</CancelActionBtn>
                </ConfirmActions>
              </ConfirmCard>
            )}

            {pendingAction === 'rejected' && (
              <ConfirmCard>
                <ConfirmCardTitle $tone="bad"><CancelIcon />Rechazar movimiento</ConfirmCardTitle>
                <ConfirmNote>Seleccioná o escribí el mensaje que recibirá el cliente.</ConfirmNote>
                {loadingMsgs ? (
                  <ConfirmNote>Cargando mensajes...</ConfirmNote>
                ) : (
                  <MsgList>
                    {rejectMsgs.map(m => (
                      <MsgOption key={m.event} $active={!isCustom && selectedMsg === m.message}
                        onClick={() => { setSelectedMsg(m.message); setIsCustom(false) }}>
                        <MsgDot $active={!isCustom && selectedMsg === m.message} />
                        <span>{m.message}</span>
                      </MsgOption>
                    ))}
                    <MsgOption $active={isCustom} onClick={() => setIsCustom(true)}>
                      <MsgDot $active={isCustom} />
                      <span>Mensaje personalizado…</span>
                    </MsgOption>
                  </MsgList>
                )}
                {isCustom && (
                  <CustomTextarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    placeholder="Escribí el mensaje para el cliente..."
                    rows={3}
                    autoFocus={isCustom}
                  />
                )}
                <ConfirmActions>
                  <ResolveBtn type="button" $tone="bad" disabled={!!updatingId || loadingMsgs} onClick={confirmRejected}>
                    <CancelIcon />{updatingId === 'rejected' ? 'Procesando...' : 'Confirmar rechazo'}
                  </ResolveBtn>
                  <CancelActionBtn type="button" onClick={cancelAction} disabled={!!updatingId}>Cancelar</CancelActionBtn>
                </ConfirmActions>
              </ConfirmCard>
            )}
          </DetailSection>
        )}
      </DetailBody>
    </DetailSheet>
  )
}

/* ─── Main Component ────────────────────────────────────────────────── */
const MovementDrawer = ({ chat, onClose }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const [provider, setProvider] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ movements: [], accounts: [], currentProcessing: null, pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [defaultApplied, setDefaultApplied] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedMovement, setSelectedMovement] = useState(null)
  const [initialAction, setInitialAction] = useState(null)

  useEffect(() => {
    setProvider('all')
    setAccountId('all')
    setSearch('')
    setPage(1)
    setDefaultApplied(false)
    setSelectedMovement(null)
    setInitialAction(null)
  }, [chat?.id])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!chat?.id) return
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ provider, page: String(page), limit: '12' })
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
          if (nextProvider !== provider) { setProvider(nextProvider); setPage(1) }
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
  }, [chat?.id, provider, accountId, search, page, defaultApplied, refreshTick])

  const accounts = useMemo(() => {
    if (provider === 'all') return data.accounts || []
    return (data.accounts || []).filter(a => a.provider === provider)
  }, [data.accounts, provider])

  const changeProvider = (next) => { setProvider(next); setAccountId('all'); setPage(1) }
  const changeSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handleRefresh = useCallback(() => { setRefreshTick(t => t + 1) }, [])

  const updateManualStatus = async (movement, status) => {
    if (!chat?.id || movement.provider !== 'manual') return
    setUpdatingId(movement.id)
    try {
      const result = await api.put(`/api/chats/${chat.id}/movements/manual/${movement.id}/status`, { status })
      if (result.movement) {
        setData(prev => ({
          ...prev,
          movements: prev.movements.map(item =>
            item.provider === 'manual' && item.id === movement.id ? result.movement : item
          ),
        }))
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el movimiento.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDetailStatusChange = (updated) => {
    setData(prev => ({
      ...prev,
      movements: prev.movements.map(item =>
        item.provider === 'manual' && item.id === updated.id ? updated : item
      ),
    }))
    setSelectedMovement(updated)
  }

  const pagination = data.pagination || { page: 1, totalPages: 1, total: 0, hasMore: false }
  const current = data.currentProcessing

  return (
    <Overlay onMouseDown={onClose}>
      <Panel onMouseDown={e => e.stopPropagation()}>

        {/* ── Detail Sheet (slide-over) ──────────────────── */}
        {selectedMovement && (
          <MovementDetail
            movement={selectedMovement}
            chatId={chat.id}
            initialAction={initialAction}
            onBack={() => { setSelectedMovement(null); setInitialAction(null) }}
            onStatusChange={handleDetailStatusChange}
          />
        )}

        {/* ── Header ────────────────────────────────────── */}
        <Head>
          <TitleWrap>
            <TitleIcon><ReceiptLongIcon /></TitleIcon>
            <div>
              <Kicker>Movimientos del cliente</Kicker>
              <Title>{chat?.username || 'Cliente'}</Title>
            </div>
          </TitleWrap>
          <HeadRight>
            <RefreshBtn
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              title="Actualizar movimientos"
            >
              <RefreshOutlinedIcon />
            </RefreshBtn>
            <CloseBtn type="button" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </CloseBtn>
          </HeadRight>
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

        <ProviderTabs>
          {PROVIDERS.map(item => (
            <ProviderTab key={item.id} type="button" $active={provider === item.id} onClick={() => changeProvider(item.id)}>
              {item.label}
            </ProviderTab>
          ))}
        </ProviderTabs>

        <Filters>
          <SearchWrap>
            <SearchIcon />
            <SearchInput value={search} onChange={changeSearch} placeholder="Buscar Coelsa, monto, transaction o estatus" />
          </SearchWrap>
          <AccountSelect value={accountId} onChange={e => { setAccountId(e.target.value); setPage(1) }}>
            <option value="all">Todas las cuentas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
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
                <MovementRow
                  key={`${movement.provider}-${movement.id}`}
                  onClick={() => setSelectedMovement(movement)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedMovement(movement)}
                >
                  <MainCell>
                    <ProviderPill>{PROVIDER_LABELS[movement.provider] || movement.provider}</ProviderPill>
                    <Amount>{money(movement.amount)}</Amount>
                    <SubLine>{movement.accountLabel || 'Sin cuenta'} · {dateTime(movement.createdAt, timezone)}</SubLine>
                  </MainCell>

                  <DetailGrid>
                    <Detail>
                      <span>Coelsa / ID</span>
                      <strong>{short(movement.coelsaId || movement.transactionId || movement.mercadopagoId)}</strong>
                    </Detail>
                    <Detail>
                      <span>IA</span>
                      <strong style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>{movement.aiStatus === 'ok' ? '✓ OK' : movement.aiStatus === 'error' ? '✗ Error' : '-'}</span>
                        {movement.aiStatus === 'ok' && movement.aiModel && (
                          <small style={{ color: 'rgba(255,255,255,0.42)', fontSize: 10.5, fontWeight: 600 }}>
                            {AI_MODEL_LABELS[movement.aiModel] || short(movement.aiModel)}
                          </small>
                        )}
                      </strong>
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
                    <Actions onClick={e => e.stopPropagation()}>
                      <ActionBtn type="button" $tone="wait"
                        disabled={updatingId === movement.id}
                        onClick={() => updateManualStatus(movement, 'pending')}
                        title="Marcar pendiente">
                        <HourglassEmptyIcon />
                      </ActionBtn>
                      <ActionBtn type="button" $tone="good"
                        disabled={updatingId === movement.id}
                        onClick={() => { setSelectedMovement(movement); setInitialAction('paid') }}
                        title="Marcar pagado">
                        <CheckCircleIcon />
                      </ActionBtn>
                      <ActionBtn type="button" $tone="bad"
                        disabled={updatingId === movement.id}
                        onClick={() => { setSelectedMovement(movement); setInitialAction('rejected') }}
                        title="Rechazar">
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
          <PageText>{pagination.total} movimientos · página {pagination.page} de {pagination.totalPages}</PageText>
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

/* ─── Animations ────────────────────────────────────────────────────── */
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
const slideIn = keyframes`from{transform:translateX(36px);opacity:.7}to{transform:translateX(0);opacity:1}`
const detailIn = keyframes`from{transform:translateX(100%)}to{transform:translateX(0)}`

/* ─── Layout ────────────────────────────────────────────────────────── */
const Overlay = styled.div`
  position:fixed;inset:0;z-index:1900;display:flex;justify-content:flex-end;
  background:rgba(0,0,0,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  animation:${fadeIn} .16s ease both;
`
const Panel = styled.aside`
  width:min(860px,100vw);height:var(--app-height,100dvh);display:flex;flex-direction:column;
  background:#0b1020;border-left:1px solid rgba(255,255,255,.10);
  box-shadow:-22px 0 70px rgba(0,0,0,.45);animation:${slideIn} .22s cubic-bezier(.16,1,.3,1) both;
  position:relative;overflow:hidden;
`
const Head = styled.header`
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;
`
const TitleWrap = styled.div`min-width:0;display:flex;align-items:center;gap:12px;`
const TitleIcon = styled.span`
  width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:#93c5fd;background:rgba(37,99,235,.16);border:1px solid rgba(147,197,253,.22);
  svg{font-size:20px;}
`
const Kicker = styled.div`font-size:11px;font-weight:800;color:rgba(147,197,253,.88);text-transform:uppercase;`
const Title = styled.h2`margin:2px 0 0;color:#fff;font-size:18px;line-height:1.15;`
const HeadRight = styled.div`display:flex;align-items:center;gap:6px;`
const iconBtn = css`
  width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);color:rgba(255,255,255,.62);display:flex;align-items:center;
  justify-content:center;cursor:pointer;svg{font-size:18px;}
  &:hover{color:#fff;background:rgba(255,255,255,.09);}
  &:disabled{opacity:.4;cursor:default;}
`
const CloseBtn = styled.button`${iconBtn}`
const RefreshBtn = styled.button`${iconBtn}`

/* ─── Processing Bar ────────────────────────────────────────────────── */
const ProcessingBar = styled.div`
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;
  padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;
  @media(max-width:680px){grid-template-columns:1fr;}
`
const ProcessingItem = styled.div`
  min-width:0;padding:9px 10px;border-radius:8px;background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.07);
  span{display:block;color:rgba(255,255,255,.42);font-size:10.5px;font-weight:800;text-transform:uppercase;}
  strong{display:block;margin-top:2px;color:rgba(255,255,255,.86);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`

/* ─── Tabs & Filters ────────────────────────────────────────────────── */
const ProviderTabs = styled.div`display:flex;gap:6px;padding:12px 18px 8px;overflow-x:auto;flex-shrink:0;`
const ProviderTab = styled.button`
  min-height:34px;padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.045);color:rgba(255,255,255,.58);font-size:12px;font-weight:800;
  white-space:nowrap;cursor:pointer;
  ${({$active}) => $active && css`color:#fff;border-color:rgba(96,165,250,.42);background:rgba(37,99,235,.22);`}
`
const Filters = styled.div`
  display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,240px);gap:10px;
  padding:0 18px 12px;flex-shrink:0;
  @media(max-width:680px){grid-template-columns:1fr;}
`
const SearchWrap = styled.label`
  min-width:0;height:38px;display:flex;align-items:center;gap:8px;padding:0 11px;
  border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.34);svg{font-size:18px;flex-shrink:0;}
`
const SearchInput = styled.input`
  flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;color:#fff;
  font:inherit;font-size:13px;&::placeholder{color:rgba(255,255,255,.28);}
`
const AccountSelect = styled.select`
  height:38px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:#11182b;
  color:rgba(255,255,255,.82);padding:0 10px;font:inherit;font-size:12.5px;outline:0;
`

/* ─── Movement List ─────────────────────────────────────────────────── */
const Body = styled.div`flex:1;min-height:0;overflow-y:auto;padding:0 18px 12px;`
const MovementList = styled.div`display:flex;flex-direction:column;gap:8px;`
const MovementRow = styled.div`
  display:grid;grid-template-columns:minmax(170px,1.05fr) minmax(260px,1.6fr) minmax(132px,.75fr) auto;
  gap:10px;align-items:center;padding:10px;border-radius:10px;
  border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);
  cursor:pointer;transition:border-color .15s,background .15s;
  &:hover{border-color:rgba(96,165,250,.32);background:rgba(37,99,235,.10);}
  &:focus-visible{outline:2px solid rgba(96,165,250,.5);outline-offset:1px;}
  @media(max-width:920px){grid-template-columns:1fr;align-items:stretch;}
`
const MainCell = styled.div`min-width:0;`
const ProviderPill = styled.span`
  display:inline-flex;align-items:center;min-height:22px;padding:3px 8px;border-radius:999px;
  background:rgba(96,165,250,.14);color:#93c5fd;font-size:10.5px;font-weight:900;
`
const Amount = styled.div`margin-top:6px;color:#fff;font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;`
const SubLine = styled.div`margin-top:2px;color:rgba(255,255,255,.42);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const DetailGrid = styled.div`
  min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;
`
const Detail = styled.div`
  min-width:0;
  span{display:block;color:rgba(255,255,255,.34);font-size:10px;font-weight:900;text-transform:uppercase;}
  strong{display:block;margin-top:2px;color:rgba(255,255,255,.78);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`
const StatusCell = styled.div`display:flex;align-items:flex-start;flex-direction:column;gap:5px;`

const badgeColors = {
  good: ['rgba(34,197,94,.14)','#86efac','rgba(34,197,94,.26)'],
  bad:  ['rgba(239,68,68,.14)','#fca5a5','rgba(239,68,68,.26)'],
  wait: ['rgba(245,158,11,.14)','#fcd34d','rgba(245,158,11,.26)'],
}
const StatusBadge = styled.span`
  min-height:24px;display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;
  background:${({$tone}) => badgeColors[$tone]?.[0]};color:${({$tone}) => badgeColors[$tone]?.[1]};
  border:1px solid ${({$tone}) => badgeColors[$tone]?.[2]};font-size:11px;font-weight:900;
`
const SyncBadge = styled(StatusBadge)`gap:4px;svg{font-size:13px;}`
const Duplicate = styled.span`
  min-height:22px;display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:999px;
  background:rgba(245,158,11,.10);color:#fcd34d;border:1px solid rgba(245,158,11,.22);
  font-size:10.5px;font-weight:900;svg{font-size:13px;}
`
const Actions = styled.div`display:flex;align-items:center;gap:5px;`
const actionColors = { good:'#22c55e', bad:'#ef4444', wait:'#f59e0b' }
const ActionBtn = styled.button`
  width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  border:1px solid ${({$tone}) => `${actionColors[$tone]}44`};
  background:${({$tone}) => `${actionColors[$tone]}18`};
  color:${({$tone}) => actionColors[$tone]};cursor:pointer;svg{font-size:17px;}
  &:disabled{opacity:.45;cursor:default;}
`
const Empty = styled.div`
  min-height:180px;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.42);font-size:13px;
`

/* ─── Pager ─────────────────────────────────────────────────────────── */
const Pager = styled.footer`
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px 18px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;
  @media(max-width:520px){align-items:stretch;flex-direction:column;}
`
const PageText = styled.div`color:rgba(255,255,255,.46);font-size:12px;font-weight:700;`
const PageActions = styled.div`display:flex;gap:8px;`
const PageBtn = styled.button`
  min-height:34px;padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.06);color:rgba(255,255,255,.76);font-size:12px;font-weight:800;cursor:pointer;
  &:disabled{opacity:.42;cursor:default;}
`

/* ─── Detail Sheet ──────────────────────────────────────────────────── */
const DetailSheet = styled.div`
  position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;
  background:#0b1020;animation:${detailIn} .22s cubic-bezier(.16,1,.3,1) both;
`
const DetailHead = styled.header`
  display:flex;align-items:center;gap:12px;padding:14px 18px;
  border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;
`
const BackBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px 0 8px;
  border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.72);font-size:13px;font-weight:700;cursor:pointer;
  svg{font-size:18px;}&:hover{color:#fff;background:rgba(255,255,255,.09);}
`
const DetailHeadTitle = styled.span`color:rgba(255,255,255,.5);font-size:13px;font-weight:700;`
const DetailBody = styled.div`flex:1;min-height:0;overflow-y:auto;padding:0 20px 24px;`

const DetailHero = styled.div`
  padding:20px 0 18px;border-bottom:1px solid rgba(255,255,255,.07);
`
const DetailHeroChips = styled.div`display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:10px;`
const DetailAmount = styled.div`
  font-size:34px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;
  letter-spacing:-.02em;line-height:1.1;margin-bottom:6px;
`
const DetailHeroSub = styled.div`
  color:rgba(255,255,255,.48);font-size:13px;
  span{margin:0 5px;opacity:.5;}
  strong{color:rgba(255,255,255,.72);}
`

const DetailSection = styled.div`padding:18px 0 0;`
const SectionTitle = styled.div`
  display:flex;align-items:center;gap:7px;
  color:rgba(255,255,255,.42);font-size:10.5px;font-weight:900;text-transform:uppercase;
  letter-spacing:.06em;margin-bottom:12px;
  svg{font-size:14px;}
`
const AiStatusChip = styled.span`
  padding:2px 7px;border-radius:999px;font-size:10px;font-weight:900;
  background:${p => p.$ok ? 'rgba(34,197,94,.14)' : 'rgba(239,68,68,.12)'};
  color:${p => p.$ok ? '#86efac' : '#fca5a5'};
  border:1px solid ${p => p.$ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'};
`
const InfoGrid = styled.div`display:flex;flex-direction:column;gap:0;`
const InfoItem = styled.div`
  display:flex;justify-content:space-between;align-items:baseline;gap:12px;
  padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);
  &:last-child{border-bottom:0;}
`
const InfoLabel = styled.span`color:rgba(255,255,255,.42);font-size:12.5px;flex-shrink:0;`
const InfoValue = styled.span`
  color:rgba(255,255,255,.88);font-size:12.5px;font-weight:600;text-align:right;
  ${p => p.$mono && css`font-family:monospace;font-size:12px;letter-spacing:.02em;`}
  word-break:break-all;
`
const InfoEmpty = styled.div`
  color:rgba(255,255,255,.3);font-size:12px;text-align:center;padding:12px 0;
`
const LogAiBtn = styled.button`
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 10px;border-radius:6px;
  border:1px solid rgba(139,92,246,.35);
  background:rgba(139,92,246,.1);
  color:#a78bfa;font-size:10.5px;font-weight:600;
  cursor:pointer;letter-spacing:.02em;margin-top:10px;
  transition:background .15s,border-color .15s,color .15s;
  svg{font-size:12px;}
  &:hover{background:rgba(139,92,246,.22);border-color:rgba(139,92,246,.55);color:#c4b5fd;}
`

/* ─── Receipt Preview ───────────────────────────────────────────────── */
const ReceiptBox = styled.div`
  position:relative;border-radius:10px;overflow:hidden;
  border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);
  max-height:280px;display:flex;align-items:center;justify-content:center;
`
const ReceiptImg = styled.img`
  max-width:100%;max-height:280px;object-fit:contain;cursor:zoom-in;display:block;
`
const ReceiptOpenBtn = styled.button`
  position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:7px;
  background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);
  color:rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center;
  cursor:pointer;svg{font-size:16px;}&:hover{background:rgba(0,0,0,.75);color:#fff;}
`

/* ─── Duplicate Alert ───────────────────────────────────────────────── */
const DuplicateAlert = styled.div`
  display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;
  background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);
  svg{color:#fcd34d;font-size:20px;flex-shrink:0;margin-top:1px;}
  strong{display:block;color:#fcd34d;font-size:13px;margin-bottom:3px;}
  p{margin:0;color:rgba(245,158,11,.75);font-size:12px;line-height:1.45;}
`

/* ─── Detail Actions ────────────────────────────────────────────────── */
const DetailActions = styled.div`display:flex;gap:10px;flex-wrap:wrap;`
const DetailActionBtn = styled.button`
  flex:1;min-width:100px;display:inline-flex;align-items:center;justify-content:center;gap:7px;
  height:40px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;
  transition:background .15s,opacity .15s;
  border:1px solid ${({$tone}) => `${actionColors[$tone]}44`};
  background:${({$tone,$active}) => $active ? `${actionColors[$tone]}28` : `${actionColors[$tone]}10`};
  color:${({$tone}) => actionColors[$tone]};
  ${({$active}) => $active && css`box-shadow:0 0 0 1.5px currentColor;`}
  svg{font-size:18px;}&:disabled{opacity:.45;cursor:default;}
  &:hover:not(:disabled){background:${({$tone}) => `${actionColors[$tone]}22`};}
`

/* ─── Confirm Forms ─────────────────────────────────────────────────── */
const ConfirmCard = styled.div`
  margin-top:4px;padding:16px;border-radius:12px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
`
const ConfirmCardTitle = styled.div`
  display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;margin-bottom:8px;
  color:${({$tone}) => actionColors[$tone] || '#fff'};
  svg{font-size:17px;}
`
const ConfirmNote = styled.p`
  margin:0 0 14px;color:rgba(255,255,255,.45);font-size:12px;line-height:1.5;
`
const AmountRow = styled.div`
  display:flex;align-items:center;gap:12px;margin-bottom:16px;
`
const AmountLabel = styled.label`
  color:rgba(255,255,255,.55);font-size:12.5px;white-space:nowrap;
`
const AmountInput = styled.input`
  flex:1;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);color:#fff;padding:0 12px;font:inherit;font-size:15px;
  font-weight:700;outline:0;font-variant-numeric:tabular-nums;
  &::placeholder{color:rgba(255,255,255,.28);}
  &:focus{border-color:rgba(96,165,250,.5);}
`
const ConfirmActions = styled.div`display:flex;gap:8px;align-items:center;margin-top:16px;`
const ResolveBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:9px;
  font-size:13px;font-weight:700;cursor:pointer;
  border:1px solid ${({$tone}) => `${actionColors[$tone]}55`};
  background:${({$tone}) => `${actionColors[$tone]}22`};
  color:${({$tone}) => actionColors[$tone]};
  svg{font-size:16px;}
  &:disabled{opacity:.45;cursor:default;}
  &:hover:not(:disabled){background:${({$tone}) => `${actionColors[$tone]}33`};}
`
const CancelActionBtn = styled.button`
  height:38px;padding:0 14px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;
  border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);
  color:rgba(255,255,255,.55);
  &:hover:not(:disabled){color:#fff;background:rgba(255,255,255,.09);}
  &:disabled{opacity:.45;cursor:default;}
`
const MsgList = styled.div`display:flex;flex-direction:column;gap:6px;margin-bottom:6px;`
const MsgOption = styled.div`
  display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:9px;cursor:pointer;
  border:1px solid ${({$active}) => $active ? 'rgba(96,165,250,.4)' : 'rgba(255,255,255,.07)'};
  background:${({$active}) => $active ? 'rgba(37,99,235,.15)' : 'rgba(255,255,255,.03)'};
  transition:border-color .12s,background .12s;
  &:hover{border-color:rgba(96,165,250,.25);background:rgba(255,255,255,.06);}
  span{color:rgba(255,255,255,.78);font-size:12.5px;line-height:1.45;}
`
const MsgDot = styled.div`
  width:16px;height:16px;border-radius:50%;flex-shrink:0;margin-top:1px;
  border:2px solid ${({$active}) => $active ? '#60a5fa' : 'rgba(255,255,255,.28)'};
  background:${({$active}) => $active ? '#60a5fa' : 'transparent'};
  transition:border-color .12s,background .12s;
`
const CustomTextarea = styled.textarea`
  width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border-radius:9px;
  border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);
  color:#fff;font:inherit;font-size:13px;resize:vertical;outline:0;min-height:72px;
  &::placeholder{color:rgba(255,255,255,.3);}
  &:focus{border-color:rgba(96,165,250,.5);}
`

export default MovementDrawer
