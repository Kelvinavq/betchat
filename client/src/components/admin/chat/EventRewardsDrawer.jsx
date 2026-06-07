import { useCallback, useEffect, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CancelIcon from '@mui/icons-material/Cancel'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { api, resolveApiAsset } from '../../../utils/api'
import { useToast } from '../../../context/ToastContext'

const EVENT_TYPE_LABELS = {
  sorteo: 'Sorteo',
  quiz: 'Quiz',
  scratch: 'Raspadita',
  roulette: 'Ruleta',
  slots: 'Slots',
  red_black: 'Rojo/Negro',
  briefcase: 'Maletín',
  treasure_chest: 'Cofre',
  ranking: 'Ranking',
}

const REWARD_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Acreditado',
  failed: 'Fallido',
  discarded: 'Descartado',
}

const money = (value) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

const dateTime = (value, tz) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...(tz && { timeZone: tz }),
  })
}

const RECEIPT_STATUS_LABELS = {
  paid:              'Comprobante válido',
  pending:           'Pendiente revisión',
  duplicate:         'Comprobante duplicado',
  invalid:           'Comprobante inválido',
  error:             'Error de procesamiento',
  amount_low:        'Monto insuficiente',
  insufficient_info: 'Info incompleta',
}

const receiptStatusTone = (s) => {
  if (s === 'paid') return 'good'
  if (['duplicate', 'invalid', 'error', 'amount_low'].includes(s)) return 'bad'
  return 'wait'
}

const rewardTone = (status) => {
  if (status === 'paid') return 'good'
  if (status === 'failed' || status === 'discarded') return 'bad'
  return 'wait'
}

const isReceiptImage = (url = '') => /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

const EventRewardsDrawer = ({ chat, onClose }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!chat?.id) return
    let alive = true
    setLoading(true)
    setError('')
    api.get(`/api/chats/${chat.id}/event-rewards`)
      .then(result => { if (alive) setRewards(result.rewards || []) })
      .catch(err => { if (alive) setError(err.message || 'No se pudieron cargar los premios.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [chat?.id, refreshTick])

  const handleRefresh = useCallback(() => setRefreshTick(t => t + 1), [])

  const payReward = async (reward) => {
    if (payingId) return
    setPayingId(reward.id)
    try {
      const result = await api.post(`/api/events/rewards/${reward.id}/pay`)
      if (result.reward) {
        setRewards(prev => prev.map(r => Number(r.id) === Number(reward.id) ? { ...r, ...result.reward } : r))
        toast.success('Premio marcado como acreditado. Se notificó al cliente.')
      } else {
        setRefreshTick(t => t + 1)
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo acreditar el premio.')
    } finally {
      setPayingId(null)
    }
  }

  const pending = rewards.filter(r => r.status === 'pending' || r.status === 'failed')
  const rest = rewards.filter(r => r.status !== 'pending' && r.status !== 'failed')

  return (
    <Overlay onMouseDown={onClose}>
      <Panel onMouseDown={e => e.stopPropagation()}>

        <Head>
          <TitleWrap>
            <TitleIcon><EmojiEventsIcon /></TitleIcon>
            <div>
              <Kicker>Fichas de eventos</Kicker>
              <Title>{chat?.username || 'Cliente'}</Title>
            </div>
          </TitleWrap>
          <HeadRight>
            <IconBtn type="button" onClick={handleRefresh} disabled={loading} title="Actualizar">
              <RefreshOutlinedIcon />
            </IconBtn>
            <IconBtn type="button" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </IconBtn>
          </HeadRight>
        </Head>

        <SummaryBar>
          <SumItem>
            <span>Total premios</span>
            <strong>{rewards.length}</strong>
          </SumItem>
          <SumItem>
            <span>Pendientes</span>
            <strong style={{ color: pending.length ? '#fbbf24' : 'rgba(255,255,255,.5)' }}>{pending.length}</strong>
          </SumItem>
          <SumItem>
            <span>Acreditados</span>
            <strong style={{ color: '#86efac' }}>{rewards.filter(r => r.status === 'paid').length}</strong>
          </SumItem>
        </SummaryBar>

        <Body>
          {error ? (
            <Empty>{error}</Empty>
          ) : loading ? (
            <Empty>Cargando premios...</Empty>
          ) : rewards.length === 0 ? (
            <EmptyState>
              <EmojiEventsOutlinedIcon />
              <p>Este cliente aún no tiene premios de eventos.</p>
            </EmptyState>
          ) : (
            <>
              {pending.length > 0 && (
                <Section>
                  <SectionLabel><HourglassEmptyIcon />Requieren acción</SectionLabel>
                  {pending.map(reward => {
                    const receiptUrl = reward.receipt_url ? resolveApiAsset(reward.receipt_url) : null
                    const receiptStatusRaw = (reward.receipt_status_raw && reward.receipt_status_raw !== 'null') ? reward.receipt_status_raw : null
                    return (
                    <RewardCard key={reward.id} $tone={rewardTone(reward.status)}>
                      <CardLeft>
                        <EventTypePill>{EVENT_TYPE_LABELS[reward.event_type] || reward.event_type || 'Evento'}</EventTypePill>
                        <CardTitle>{reward.event_title || 'Evento sin título'}</CardTitle>
                        <CardMeta>{dateTime(reward.created_at, timezone)}</CardMeta>
                        {reward.reward_description && (
                          <CardDesc>{reward.reward_description}</CardDesc>
                        )}
                        {(receiptUrl || receiptStatusRaw) && (
                          <ReceiptRow>
                            {receiptUrl && (
                              <ReceiptLink href={receiptUrl} target="_blank" rel="noopener noreferrer">
                                {isReceiptImage(reward.receipt_url)
                                  ? <ReceiptThumb src={receiptUrl} alt="Comprobante" />
                                  : <ReceiptLongOutlinedIcon style={{ fontSize: 15 }} />
                                }
                                <span>Ver comprobante</span>
                                <OpenInNewIcon style={{ fontSize: 12, opacity: 0.6 }} />
                              </ReceiptLink>
                            )}
                            {receiptStatusRaw && (
                              <ReceiptStatusChip $tone={receiptStatusTone(receiptStatusRaw)}>
                                {RECEIPT_STATUS_LABELS[receiptStatusRaw] || receiptStatusRaw}
                              </ReceiptStatusChip>
                            )}
                          </ReceiptRow>
                        )}
                      </CardLeft>
                      <CardRight>
                        {reward.reward_amount != null && (
                          <CardAmount>{money(reward.reward_amount)}</CardAmount>
                        )}
                        <StatusChip $tone={rewardTone(reward.status)}>
                          {REWARD_STATUS_LABELS[reward.status] || reward.status}
                        </StatusChip>
                        <PayBtn
                          type="button"
                          disabled={Number(payingId) === Number(reward.id)}
                          onClick={() => payReward(reward)}
                        >
                          <AutoAwesomeOutlinedIcon />
                          {Number(payingId) === Number(reward.id) ? 'Acreditando...' : 'Acreditar fichas'}
                        </PayBtn>
                      </CardRight>
                    </RewardCard>
                    )
                  })}
                </Section>
              )}

              {rest.length > 0 && (
                <Section>
                  <SectionLabel><CheckCircleIcon style={{ color: '#86efac' }} />Historial</SectionLabel>
                  {rest.map(reward => {
                    const receiptUrl = reward.receipt_url ? resolveApiAsset(reward.receipt_url) : null
                    const receiptStatusRaw = (reward.receipt_status_raw && reward.receipt_status_raw !== 'null') ? reward.receipt_status_raw : null
                    return (
                    <RewardCard key={reward.id} $tone={rewardTone(reward.status)} $muted>
                      <CardLeft>
                        <EventTypePill>{EVENT_TYPE_LABELS[reward.event_type] || reward.event_type || 'Evento'}</EventTypePill>
                        <CardTitle>{reward.event_title || 'Evento sin título'}</CardTitle>
                        <CardMeta>
                          Creado: {dateTime(reward.created_at, timezone)}
                          {reward.paid_at ? ` · Acreditado: ${dateTime(reward.paid_at, timezone)}` : ''}
                          {reward.discarded_at ? ` · Descartado: ${dateTime(reward.discarded_at, timezone)}` : ''}
                        </CardMeta>
                        {(reward.discard_reason || reward.error_message) && (
                          <CardDesc $warn>{reward.discard_reason || reward.error_message}</CardDesc>
                        )}
                        {reward.reward_description && !reward.discard_reason && (
                          <CardDesc>{reward.reward_description}</CardDesc>
                        )}
                        {(receiptUrl || receiptStatusRaw) && (
                          <ReceiptRow>
                            {receiptUrl && (
                              <ReceiptLink href={receiptUrl} target="_blank" rel="noopener noreferrer">
                                {isReceiptImage(reward.receipt_url)
                                  ? <ReceiptThumb src={receiptUrl} alt="Comprobante" />
                                  : <ReceiptLongOutlinedIcon style={{ fontSize: 15 }} />
                                }
                                <span>Ver comprobante</span>
                                <OpenInNewIcon style={{ fontSize: 12, opacity: 0.6 }} />
                              </ReceiptLink>
                            )}
                            {receiptStatusRaw && (
                              <ReceiptStatusChip $tone={receiptStatusTone(receiptStatusRaw)}>
                                {RECEIPT_STATUS_LABELS[receiptStatusRaw] || receiptStatusRaw}
                              </ReceiptStatusChip>
                            )}
                          </ReceiptRow>
                        )}
                      </CardLeft>
                      <CardRight>
                        {reward.reward_amount != null && (
                          <CardAmount $muted={reward.status !== 'paid'}>{money(reward.reward_amount)}</CardAmount>
                        )}
                        <StatusChip $tone={rewardTone(reward.status)}>
                          {REWARD_STATUS_LABELS[reward.status] || reward.status}
                        </StatusChip>
                      </CardRight>
                    </RewardCard>
                    )
                  })}
                </Section>
              )}
            </>
          )}
        </Body>
      </Panel>
    </Overlay>
  )
}

/* ─── Animations ─────────────────────────────────────────────────────── */
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
const slideIn = keyframes`from{transform:translateX(36px);opacity:.7}to{transform:translateX(0);opacity:1}`

/* ─── Layout ─────────────────────────────────────────────────────────── */
const Overlay = styled.div`
  position:fixed;inset:0;z-index:1900;display:flex;justify-content:flex-end;
  background:rgba(0,0,0,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  animation:${fadeIn} .16s ease both;
`
const Panel = styled.aside`
  width:min(680px,100vw);height:var(--app-height,100dvh);display:flex;flex-direction:column;
  background:#0b1020;border-left:1px solid rgba(255,255,255,.10);
  box-shadow:-22px 0 70px rgba(0,0,0,.45);animation:${slideIn} .22s cubic-bezier(.16,1,.3,1) both;
  overflow:hidden;
`
const Head = styled.header`
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;
`
const TitleWrap = styled.div`min-width:0;display:flex;align-items:center;gap:12px;`
const TitleIcon = styled.span`
  width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:#fbbf24;background:rgba(245,158,11,.16);border:1px solid rgba(251,191,36,.22);
  svg{font-size:20px;}
`
const Kicker = styled.div`font-size:11px;font-weight:800;color:rgba(251,191,36,.88);text-transform:uppercase;`
const Title = styled.h2`margin:2px 0 0;color:#fff;font-size:18px;line-height:1.15;`
const HeadRight = styled.div`display:flex;align-items:center;gap:6px;`
const IconBtn = styled.button`
  width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);color:rgba(255,255,255,.62);display:flex;align-items:center;
  justify-content:center;cursor:pointer;svg{font-size:18px;}
  &:hover{color:#fff;background:rgba(255,255,255,.09);}
  &:disabled{opacity:.4;cursor:default;}
`

/* ─── Summary Bar ────────────────────────────────────────────────────── */
const SummaryBar = styled.div`
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;
  padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;
`
const SumItem = styled.div`
  padding:9px 10px;border-radius:8px;background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.07);
  span{display:block;color:rgba(255,255,255,.42);font-size:10.5px;font-weight:800;text-transform:uppercase;}
  strong{display:block;margin-top:2px;color:rgba(255,255,255,.86);font-size:16px;font-weight:900;}
`

/* ─── Body ───────────────────────────────────────────────────────────── */
const Body = styled.div`flex:1;min-height:0;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:16px;`

const Empty = styled.div`
  min-height:180px;display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,.42);font-size:13px;
`
const EmptyState = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  color:rgba(255,255,255,.3);
  svg{font-size:48px;opacity:.3;}
  p{margin:0;font-size:13px;}
`

const Section = styled.div`display:flex;flex-direction:column;gap:8px;`
const SectionLabel = styled.div`
  display:flex;align-items:center;gap:6px;
  font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;
  color:rgba(255,255,255,.38);padding-bottom:2px;
  svg{font-size:13px;}
`

/* ─── Reward Card ────────────────────────────────────────────────────── */
const toneColors = {
  good: { bg: 'rgba(34,197,94,.07)',  border: 'rgba(34,197,94,.20)',  text: '#86efac' },
  bad:  { bg: 'rgba(239,68,68,.07)',  border: 'rgba(239,68,68,.18)',  text: '#fca5a5' },
  wait: { bg: 'rgba(245,158,11,.07)', border: 'rgba(245,158,11,.20)', text: '#fbbf24' },
}
const RewardCard = styled.div`
  display:flex;align-items:flex-start;gap:12px;padding:14px 14px 14px 16px;border-radius:12px;
  border:1px solid ${({$tone,$muted}) => $muted ? 'rgba(255,255,255,.07)' : (toneColors[$tone]?.border || toneColors.wait.border)};
  background:${({$tone,$muted}) => $muted ? 'rgba(255,255,255,.03)' : (toneColors[$tone]?.bg || toneColors.wait.bg)};
  border-left:3px solid ${({$tone,$muted}) => $muted ? 'rgba(255,255,255,.08)' : (toneColors[$tone]?.text || toneColors.wait.text)};
  transition:border-color .15s,background .15s;
`
const CardLeft = styled.div`flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;`
const CardRight = styled.div`flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:7px;`

const EventTypePill = styled.span`
  display:inline-flex;align-items:center;min-height:20px;padding:2px 8px;border-radius:999px;
  background:rgba(99,102,241,.16);color:#a5b4fc;border:1px solid rgba(99,102,241,.28);
  font-size:10px;font-weight:900;width:fit-content;
`
const CardTitle = styled.div`color:#fff;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const CardMeta = styled.div`color:rgba(255,255,255,.38);font-size:11px;`
const CardDesc = styled.div`
  font-size:11.5px;line-height:1.4;
  color:${({$warn}) => $warn ? '#fcd34d' : 'rgba(255,255,255,.48)'};
`

const CardAmount = styled.div`
  font-size:20px;font-weight:900;font-variant-numeric:tabular-nums;
  color:${({$muted}) => $muted ? 'rgba(255,255,255,.38)' : '#fff'};
  letter-spacing:-.02em;
`

const badgeColors = {
  good: ['rgba(34,197,94,.14)','#86efac','rgba(34,197,94,.26)'],
  bad:  ['rgba(239,68,68,.14)','#fca5a5','rgba(239,68,68,.26)'],
  wait: ['rgba(245,158,11,.14)','#fcd34d','rgba(245,158,11,.26)'],
}
const StatusChip = styled.span`
  display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;
  background:${({$tone}) => badgeColors[$tone]?.[0]};
  color:${({$tone}) => badgeColors[$tone]?.[1]};
  border:1px solid ${({$tone}) => badgeColors[$tone]?.[2]};
  font-size:11px;font-weight:900;
`

const PayBtn = styled.button`
  display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:9px;
  font-size:12px;font-weight:700;cursor:pointer;
  border:1px solid rgba(251,191,36,.35);background:rgba(245,158,11,.14);color:#fbbf24;
  transition:background .15s,border-color .15s;svg{font-size:15px;}
  &:hover:not(:disabled){background:rgba(245,158,11,.22);border-color:rgba(251,191,36,.55);}
  &:disabled{opacity:.5;cursor:default;}
`

/* ─── Receipt Row ────────────────────────────────────────────────────── */
const ReceiptRow = styled.div`
  display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:4px;
`
const ReceiptLink = styled.a`
  display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:7px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);
  color:rgba(255,255,255,.6);font-size:11px;font-weight:600;text-decoration:none;
  transition:background .15s,color .15s;
  &:hover{background:rgba(255,255,255,.10);color:#fff;}
  span{white-space:nowrap;}
`
const ReceiptThumb = styled.img`
  width:18px;height:18px;border-radius:3px;object-fit:cover;flex-shrink:0;
`
const smallBadge = {
  good: ['rgba(34,197,94,.12)','#86efac','rgba(34,197,94,.22)'],
  bad:  ['rgba(239,68,68,.12)','#fca5a5','rgba(239,68,68,.22)'],
  wait: ['rgba(245,158,11,.12)','#fcd34d','rgba(245,158,11,.22)'],
}
const ReceiptStatusChip = styled.span`
  display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;
  background:${({$tone}) => smallBadge[$tone]?.[0]};
  color:${({$tone}) => smallBadge[$tone]?.[1]};
  border:1px solid ${({$tone}) => smallBadge[$tone]?.[2]};
  font-size:10px;font-weight:800;white-space:nowrap;
`

export default EventRewardsDrawer
