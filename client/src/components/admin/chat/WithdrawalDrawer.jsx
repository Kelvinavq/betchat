import { useCallback, useEffect, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import { api } from '../../../utils/api'
import { useToast } from '../../../context/ToastContext'

const STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }

const dateTime = (value, tz) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
}

const statusTone = (s) => s === 'approved' ? 'good' : s === 'rejected' ? 'bad' : 'wait'

function parseFormData(text) {
  if (!text) return []
  return text.split('\n').map(line => {
    const idx = line.indexOf(':')
    if (idx < 0) return null
    return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
  }).filter(Boolean)
}

/* ─── Detail Component ──────────────────────────────────────── */
const WithdrawalDetail = ({ withdrawal, chatId, onBack, onStatusChange }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const [updatingId, setUpdatingId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [rejectMsgs, setRejectMsgs] = useState([])
  const [selectedMsg, setSelectedMsg] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customMsg, setCustomMsg] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  useEffect(() => {
    setPendingAction(null)
  }, [withdrawal.id])

  useEffect(() => {
    if (pendingAction !== 'rejected' || rejectMsgs.length > 0) return
    setLoadingMsgs(true)
    api.get('/api/settings/auto-messages')
      .then(result => {
        const msgs = (result.messages || []).filter(m => m.event === 'withdrawal_rejected' && m.isActive)
        setRejectMsgs(msgs)
        if (msgs.length > 0) { setSelectedMsg(msgs[0].message); setIsCustom(false) }
        else setIsCustom(true)
      })
      .catch(() => setIsCustom(true))
      .finally(() => setLoadingMsgs(false))
  }, [pendingAction])

  const updateToPending = async () => {
    setUpdatingId('pending')
    try {
      const result = await api.put(`/api/withdrawals/${withdrawal.id}/pending`)
      if (result.withdrawal) onStatusChange(result.withdrawal)
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar la solicitud.')
    } finally { setUpdatingId(null) }
  }

  const confirmApproved = async () => {
    setUpdatingId('approved')
    try {
      const result = await api.put(`/api/withdrawals/${withdrawal.id}/resolve`, { action: 'approved' })
      if (result.withdrawal) { onStatusChange(result.withdrawal); setPendingAction(null) }
    } catch (err) {
      toast.error(err.message || 'No se pudo aprobar el retiro.')
    } finally { setUpdatingId(null) }
  }

  const confirmRejected = async () => {
    const message = isCustom ? customMsg.trim() : selectedMsg
    if (!message) { toast.error('Seleccioná o escribí un mensaje para el cliente.'); return }
    setUpdatingId('rejected')
    try {
      const result = await api.put(`/api/withdrawals/${withdrawal.id}/resolve`, { action: 'rejected', message })
      if (result.withdrawal) { onStatusChange(result.withdrawal); setPendingAction(null) }
    } catch (err) {
      toast.error(err.message || 'No se pudo rechazar el retiro.')
    } finally { setUpdatingId(null) }
  }

  const rows = parseFormData(withdrawal.formData)
  const titleRow = rows.find(r => r.label === 'Formulario')
  const dataRows = rows.filter(r => r.label !== 'Formulario')

  return (
    <DetailSheet>
      <DetailHead>
        <BackBtn type="button" onClick={onBack}>
          <ArrowBackIcon /><span>Volver</span>
        </BackBtn>
        <DetailHeadTitle>Detalle del retiro</DetailHeadTitle>
      </DetailHead>

      <DetailBody>
        <DetailHero>
          <DetailHeroChips>
            <StatusBadge $tone={statusTone(withdrawal.status)}>
              {STATUS_LABELS[withdrawal.status] || withdrawal.status}
            </StatusBadge>
          </DetailHeroChips>
          <DetailTitle>{titleRow?.value || 'Solicitud de retiro'}</DetailTitle>
          <DetailHeroSub>{dateTime(withdrawal.createdAt, timezone)}</DetailHeroSub>
          {withdrawal.processedBy && (
            <DetailHeroSub>
              Procesado por <strong>{withdrawal.processedBy}</strong>
              {withdrawal.processedAt ? ` · ${dateTime(withdrawal.processedAt, timezone)}` : ''}
            </DetailHeroSub>
          )}
        </DetailHero>

        {dataRows.length > 0 && (
          <DetailSection>
            <SectionTitle>Datos del formulario</SectionTitle>
            <InfoGrid>
              {dataRows.map((r, i) => (
                <InfoItem key={i}>
                  <InfoLabel>{r.label}</InfoLabel>
                  <InfoValue>{r.value || '—'}</InfoValue>
                </InfoItem>
              ))}
            </InfoGrid>
          </DetailSection>
        )}

        {withdrawal.rejectionMessage && (
          <DetailSection>
            <SectionTitle>Motivo de rechazo</SectionTitle>
            <RejectionNote>{withdrawal.rejectionMessage}</RejectionNote>
          </DetailSection>
        )}

        <DetailSection>
          <SectionTitle>Cambiar estado</SectionTitle>

          {!pendingAction && (
            <DetailActions>
              <DetailActionBtn type="button" $tone="wait" $active={withdrawal.status === 'pending'}
                disabled={!!updatingId} onClick={updateToPending}>
                <HourglassEmptyIcon />Pendiente
              </DetailActionBtn>
              <DetailActionBtn type="button" $tone="good" $active={withdrawal.status === 'approved'}
                disabled={!!updatingId} onClick={() => setPendingAction('approved')}>
                <CheckCircleIcon />Aprobado
              </DetailActionBtn>
              <DetailActionBtn type="button" $tone="bad" $active={withdrawal.status === 'rejected'}
                disabled={!!updatingId} onClick={() => setPendingAction('rejected')}>
                <CancelIcon />Rechazado
              </DetailActionBtn>
            </DetailActions>
          )}

          {pendingAction === 'approved' && (
            <ConfirmCard>
              <ConfirmCardTitle $tone="good"><CheckCircleIcon />Aprobar retiro</ConfirmCardTitle>
              <ConfirmNote>Se enviará el mensaje automático de retiro aprobado y se reiniciará el bot del cliente.</ConfirmNote>
              <ConfirmActions>
                <ResolveBtn type="button" $tone="good" disabled={!!updatingId} onClick={confirmApproved}>
                  <CheckCircleIcon />{updatingId === 'approved' ? 'Procesando...' : 'Confirmar aprobación'}
                </ResolveBtn>
                <CancelActionBtn type="button" onClick={() => setPendingAction(null)} disabled={!!updatingId}>Cancelar</CancelActionBtn>
              </ConfirmActions>
            </ConfirmCard>
          )}

          {pendingAction === 'rejected' && (
            <ConfirmCard>
              <ConfirmCardTitle $tone="bad"><CancelIcon />Rechazar retiro</ConfirmCardTitle>
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
                <CancelActionBtn type="button" onClick={() => setPendingAction(null)} disabled={!!updatingId}>Cancelar</CancelActionBtn>
              </ConfirmActions>
            </ConfirmCard>
          )}
        </DetailSection>
      </DetailBody>
    </DetailSheet>
  )
}

/* ─── Main Component ────────────────────────────────────────── */
const WithdrawalDrawer = ({ chat, onClose }) => {
  const { timezone } = useDateFormat()
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setSelected(null)
    setWithdrawals([])
  }, [chat?.id])

  useEffect(() => {
    let alive = true
    if (!chat?.id) return
    setLoading(true)
    setError('')
    api.get(`/api/chats/${chat.id}/withdrawals`)
      .then(result => { if (alive) setWithdrawals(result.withdrawals || []) })
      .catch(err => { if (alive) setError(err.message || 'No se pudieron cargar las solicitudes.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [chat?.id, refreshTick])

  const handleRefresh = useCallback(() => setRefreshTick(t => t + 1), [])

  const handleStatusChange = (updated) => {
    setWithdrawals(prev => prev.map(w => w.id === updated.id ? updated : w))
    setSelected(updated)
  }

  return (
    <Overlay onMouseDown={onClose}>
      <Panel onMouseDown={e => e.stopPropagation()}>

        {selected && (
          <WithdrawalDetail
            withdrawal={selected}
            chatId={chat.id}
            onBack={() => setSelected(null)}
            onStatusChange={handleStatusChange}
          />
        )}

        <Head>
          <TitleWrap>
            <TitleIcon><CurrencyExchangeIcon /></TitleIcon>
            <div>
              <Kicker>Solicitudes de retiro</Kicker>
              <Title>{chat?.username || 'Cliente'}</Title>
            </div>
          </TitleWrap>
          <HeadRight>
            <RefreshBtn type="button" onClick={handleRefresh} disabled={loading} title="Actualizar">
              <RefreshOutlinedIcon />
            </RefreshBtn>
            <CloseBtn type="button" onClick={onClose} title="Cerrar">
              <CloseIcon />
            </CloseBtn>
          </HeadRight>
        </Head>

        <Body>
          {loading && <Empty>Cargando solicitudes...</Empty>}
          {error && <Empty style={{ color: '#fca5a5' }}>{error}</Empty>}
          {!loading && !error && withdrawals.length === 0 && (
            <Empty>Sin solicitudes de retiro para este cliente.</Empty>
          )}
          {!loading && !error && withdrawals.length > 0 && (
            <WithdrawalList>
              {withdrawals.map(w => {
                const rows = parseFormData(w.formData)
                const titleRow = rows.find(r => r.label === 'Formulario')
                const previewRows = rows.filter(r => r.label !== 'Formulario').slice(0, 2)
                return (
                  <WithdrawalRow key={w.id} onClick={() => setSelected(w)}>
                    <RowMain>
                      <RowTitle>{titleRow?.value || 'Solicitud de retiro'}</RowTitle>
                      <RowSub>{dateTime(w.createdAt, timezone)}</RowSub>
                      {previewRows.map((r, i) => (
                        <RowField key={i}><span>{r.label}:</span> {r.value}</RowField>
                      ))}
                    </RowMain>
                    <StatusBadge $tone={statusTone(w.status)}>
                      {STATUS_LABELS[w.status] || w.status}
                    </StatusBadge>
                  </WithdrawalRow>
                )
              })}
            </WithdrawalList>
          )}
        </Body>
      </Panel>
    </Overlay>
  )
}

export default WithdrawalDrawer

/* ─── Animations ────────────────────────────────────────────── */
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
const slideIn = keyframes`from{transform:translateX(36px);opacity:.7}to{transform:translateX(0);opacity:1}`
const detailIn = keyframes`from{transform:translateX(100%)}to{transform:translateX(0)}`

/* ─── Layout ────────────────────────────────────────────────── */
const Overlay = styled.div`
  position:fixed;inset:0;z-index:1900;display:flex;justify-content:flex-end;
  background:rgba(0,0,0,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  animation:${fadeIn} .16s ease both;
`
const Panel = styled.aside`
  width:min(580px,100vw);height:var(--app-height,100dvh);display:flex;flex-direction:column;
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
  flex-shrink:0;color:#a5f3fc;background:rgba(8,145,178,.16);border:1px solid rgba(165,243,252,.22);
  svg{font-size:20px;}
`
const Kicker = styled.div`font-size:11px;font-weight:800;color:rgba(165,243,252,.88);text-transform:uppercase;`
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

/* ─── List ──────────────────────────────────────────────────── */
const Body = styled.div`flex:1;min-height:0;overflow-y:auto;padding:14px 18px;`
const WithdrawalList = styled.div`display:flex;flex-direction:column;gap:8px;`
const WithdrawalRow = styled.div`
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.045);cursor:pointer;transition:border-color .15s,background .15s;
  &:hover{border-color:rgba(165,243,252,.28);background:rgba(8,145,178,.09);}
`
const RowMain = styled.div`min-width:0;flex:1;`
const RowTitle = styled.div`color:#fff;font-size:14px;font-weight:700;`
const RowSub = styled.div`color:rgba(255,255,255,.4);font-size:11.5px;margin-top:3px;`
const RowField = styled.div`
  color:rgba(255,255,255,.6);font-size:12px;margin-top:4px;
  span{color:rgba(255,255,255,.35);}
`
const Empty = styled.div`
  min-height:180px;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.42);font-size:13px;
`

/* ─── Status Badge ──────────────────────────────────────────── */
const badgeColors = {
  good: ['rgba(34,197,94,.14)','#86efac','rgba(34,197,94,.26)'],
  bad:  ['rgba(239,68,68,.14)','#fca5a5','rgba(239,68,68,.26)'],
  wait: ['rgba(245,158,11,.14)','#fcd34d','rgba(245,158,11,.26)'],
}
const StatusBadge = styled.span`
  min-height:24px;flex-shrink:0;display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;
  background:${({$tone}) => badgeColors[$tone]?.[0]};color:${({$tone}) => badgeColors[$tone]?.[1]};
  border:1px solid ${({$tone}) => badgeColors[$tone]?.[2]};font-size:11px;font-weight:900;
`

/* ─── Detail Sheet ──────────────────────────────────────────── */
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

const DetailHero = styled.div`padding:20px 0 18px;border-bottom:1px solid rgba(255,255,255,.07);`
const DetailHeroChips = styled.div`display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:10px;`
const DetailTitle = styled.div`font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;`
const DetailHeroSub = styled.div`
  color:rgba(255,255,255,.48);font-size:13px;
  strong{color:rgba(255,255,255,.72);}
`
const DetailSection = styled.div`padding:18px 0 0;`
const SectionTitle = styled.div`
  color:rgba(255,255,255,.42);font-size:10.5px;font-weight:900;text-transform:uppercase;
  letter-spacing:.06em;margin-bottom:12px;
`
const InfoGrid = styled.div`display:flex;flex-direction:column;`
const InfoItem = styled.div`
  display:flex;justify-content:space-between;align-items:baseline;gap:12px;
  padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);
  &:last-child{border-bottom:0;}
`
const InfoLabel = styled.span`color:rgba(255,255,255,.42);font-size:12.5px;flex-shrink:0;`
const InfoValue = styled.span`color:rgba(255,255,255,.88);font-size:12.5px;font-weight:600;text-align:right;word-break:break-all;`
const RejectionNote = styled.div`
  padding:12px 14px;border-radius:9px;background:rgba(239,68,68,.07);
  border:1px solid rgba(239,68,68,.18);color:rgba(255,255,255,.7);font-size:13px;line-height:1.5;
`

/* ─── Actions ───────────────────────────────────────────────── */
const actionColors = { good: '#22c55e', bad: '#ef4444', wait: '#f59e0b' }
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
const ConfirmCard = styled.div`
  margin-top:4px;padding:16px;border-radius:12px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
`
const ConfirmCardTitle = styled.div`
  display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;margin-bottom:8px;
  color:${({$tone}) => actionColors[$tone] || '#fff'};svg{font-size:17px;}
`
const ConfirmNote = styled.p`margin:0 0 14px;color:rgba(255,255,255,.45);font-size:12px;line-height:1.5;`
const ConfirmActions = styled.div`display:flex;gap:8px;align-items:center;margin-top:16px;`
const ResolveBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:9px;
  font-size:13px;font-weight:700;cursor:pointer;
  border:1px solid ${({$tone}) => `${actionColors[$tone]}55`};
  background:${({$tone}) => `${actionColors[$tone]}22`};
  color:${({$tone}) => actionColors[$tone]};
  svg{font-size:16px;}&:disabled{opacity:.45;cursor:default;}
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
