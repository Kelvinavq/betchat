import { useMemo, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import { useToast } from '../../../context/ToastContext'

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`

const Card = styled.section`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  overflow: hidden;
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-wrap: wrap;
`

const CardTitle = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
`

const Badge = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(30,133,255,0.14);
  border: 1px solid rgba(30,133,255,0.24);
  color: #60a5fa;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const CodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 0;
  ${({ $compact }) => $compact && css`
    align-items: flex-start;
  `}
`

const Mono = styled.div`
  flex: 1;
  min-width: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: ${({ $compact }) => $compact ? '15px' : '21px'};
  font-weight: 800;
  letter-spacing: 0.10em;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ $skeleton }) => $skeleton && css`
    height: 22px;
    border-radius: 6px;
    background: rgba(255,255,255,0.08);
    animation: pulse 1.4s ease infinite;
  `}
`

const CopyBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(30,133,255,0.30);
  background: rgba(30,133,255,0.10);
  color: #60a5fa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s, color 0.15s;
  svg { font-size: 17px; }
  &:hover { background: rgba(30,133,255,0.18); border-color: rgba(30,133,255,0.45); }
  &:active { transform: scale(0.94); }
  &:disabled { opacity: 0.40; cursor: default; }
  ${({ $copied }) => $copied && css`
    background: rgba(34,197,94,0.14);
    border-color: rgba(34,197,94,0.34);
    color: #4ade80;
  `}
`

const LinkRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  min-width: 0;
  ${({ $compact }) => $compact && css`
    flex-direction: column;
    align-items: stretch;
  `}
`

const LinkText = styled.div`
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.80);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ $compact }) => $compact && css`
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.35;
  `}
`

const Hint = styled.p`
  padding: 0 14px 12px;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255,255,255,0.28);
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $compact }) => $compact ? 2 : 4}, minmax(0, 1fr));
  gap: 8px;
  padding: 0 14px 12px;
`

const Stat = styled.div`
  padding: 10px 10px 9px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
`

const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.30);
  ${({ $compact }) => $compact && css`
    font-size: 9px;
    letter-spacing: 0.05em;
  `}
`

const StatValue = styled.div`
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  ${({ $compact }) => $compact && css`
    font-size: 16px;
  `}
`

const List = styled.div`
  display: flex;
  flex-direction: column;
`

const ListItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,0.05);
`

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${({ $tone }) => $tone || 'rgba(30,133,255,0.12)'};
  border: 1px solid ${({ $border }) => $border || 'rgba(30,133,255,0.22)'};
  color: ${({ $color }) => $color || '#60a5fa'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
`

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemPrimary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
`

const ItemSecondary = styled.div`
  margin-top: 3px;
  font-size: 12px;
  color: rgba(255,255,255,0.34);
  line-height: 1.35;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${({ $tone }) => $tone === 'paid' ? css`
    background: rgba(34,197,94,0.12);
    border: 1px solid rgba(34,197,94,0.22);
    color: #4ade80;
  ` : $tone === 'failed' ? css`
    background: rgba(239,68,68,0.10);
    border: 1px solid rgba(239,68,68,0.22);
    color: #f87171;
  ` : css`
    background: rgba(245,158,11,0.10);
    border: 1px solid rgba(245,158,11,0.22);
    color: #f59e0b;
  `}
`

const Empty = styled.div`
  padding: 14px;
  color: rgba(255,255,255,0.30);
  font-size: 12px;
`

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusIcon = (status) => {
  if (status === 'paid') return <CheckIcon style={{ fontSize: 13 }} />
  if (status === 'failed') return <ErrorOutlinedIcon style={{ fontSize: 13 }} />
  return <HourglassEmptyOutlinedIcon style={{ fontSize: 13 }} />
}

const statusLabel = (status) => {
  if (status === 'paid') return 'Pagado'
  if (status === 'failed') return 'Falló'
  return 'Pendiente'
}

const statusTone = (status) => {
  if (status === 'paid') return 'paid'
  if (status === 'failed') return 'failed'
  return 'pending'
}

const initial = (value = '') => String(value || '?').trim().charAt(0).toUpperCase() || '?'

export default function ReferralDetailsSection({ data, loading = false, compact = false }) {
  const toast = useToast()
  const [copied, setCopied] = useState({ code: false, link: false })

  const referralCode = data?.client?.referralCode || ''
  const referralLink = useMemo(() => {
    if (!referralCode || typeof window === 'undefined') return ''
    return `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
  }, [referralCode])

  const handleCopy = async (kind) => {
    const text = kind === 'link' ? referralLink : referralCode
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [kind]: true }))
      window.setTimeout(() => setCopied(prev => ({ ...prev, [kind]: false })), 1800)
      toast.success(kind === 'link' ? 'Link de referido copiado' : 'Codigo de referido copiado')
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  const summary = data?.summary || {}
  const referrals = data?.referrals || []
  const rewards = data?.rewards || []
  const referrer = data?.referrer || null

  return (
    <Shell>
      <Card>
        <CardHead>
          <CardTitle>Referidos</CardTitle>
          <Badge>{loading ? '...' : `${summary.referredCount || 0} activos`}</Badge>
        </CardHead>
        <CodeRow $compact={compact}>
          {loading && !data ? (
            <Mono $skeleton />
          ) : (
            <Mono $compact={compact}>{referralCode || 'Sin codigo'}</Mono>
          )}
          <CopyBtn
            type="button"
            $copied={copied.code}
            onClick={() => handleCopy('code')}
            disabled={!referralCode}
            title="Copiar codigo"
          >
            {copied.code ? <CheckIcon /> : <ContentCopyIcon />}
          </CopyBtn>
        </CodeRow>
        <LinkRow $compact={compact}>
          <LinkText $compact={compact} title={referralLink || ''}>
            {referralLink || '—'}
          </LinkText>
          <CopyBtn
            type="button"
            $copied={copied.link}
            onClick={() => handleCopy('link')}
            disabled={!referralLink}
            title="Copiar link"
          >
            <LinkOutlinedIcon />
          </CopyBtn>
        </LinkRow>
        <Hint>
          Comparti el link o el codigo. El sistema acreditara las fichas configuradas al referente cuando el nuevo usuario haga su primer deposito.
        </Hint>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Resumen</CardTitle>
          <Badge>Actualizado</Badge>
        </CardHead>
        <StatsGrid $compact={compact}>
          <Stat>
            <StatLabel $compact={compact}>Referidos</StatLabel>
            <StatValue $compact={compact}>{summary.referredCount || 0}</StatValue>
          </Stat>
          <Stat>
            <StatLabel $compact={compact}>Pagados</StatLabel>
            <StatValue $compact={compact}>{summary.rewardedCount || 0}</StatValue>
          </Stat>
          <Stat>
            <StatLabel $compact={compact}>Pendientes</StatLabel>
            <StatValue $compact={compact}>{summary.pendingCount || 0}</StatValue>
          </Stat>
          <Stat>
            <StatLabel $compact={compact}>Fichas</StatLabel>
            <StatValue $compact={compact}>{summary.totalRewardedFichas || 0}</StatValue>
          </Stat>
        </StatsGrid>
      </Card>

      {referrer && (
        <Card>
          <CardHead>
            <CardTitle>Me refirio</CardTitle>
            <Badge>{referrer.username}</Badge>
          </CardHead>
          <ListItem style={{ borderTop: 'none' }}>
            <Avatar $tone="rgba(139,92,246,0.14)" $border="rgba(139,92,246,0.24)" $color="#a78bfa">
              {initial(referrer.username)}
            </Avatar>
            <ItemBody>
              <ItemPrimary>{referrer.username}</ItemPrimary>
              <ItemSecondary>
                {referrer.fullName || 'Sin nombre'}{referrer.referralCode ? ` · ${referrer.referralCode}` : ''}
              </ItemSecondary>
            </ItemBody>
          </ListItem>
        </Card>
      )}

      <Card>
        <CardHead>
          <CardTitle>Historial de referidos</CardTitle>
          <Badge>{referrals.length}</Badge>
        </CardHead>
        {loading && !data ? (
          <Empty>Cargando historial...</Empty>
        ) : referrals.length === 0 ? (
          <Empty>Sin referidos registrados</Empty>
        ) : (
          <List>
            {referrals.map(item => {
              const reward = item.reward
              const status = reward?.status || 'pending'
              return (
                <ListItem key={item.clientId}>
                  <Avatar $tone="rgba(30,133,255,0.12)" $border="rgba(30,133,255,0.22)" $color="#60a5fa">
                    {initial(item.username)}
                  </Avatar>
                  <ItemBody>
                    <ItemPrimary>
                      {item.username}
                      <Chip $tone={statusTone(status)}>
                        {statusIcon(status)}
                        {statusLabel(status)}
                      </Chip>
                    </ItemPrimary>
                    <ItemSecondary>
                      {item.fullName || 'Sin nombre'} · Alta {formatDate(item.registeredAt)}
                    </ItemSecondary>
                    <ItemSecondary>
                      {reward
                        ? `Fichas ${reward.amount || 0} · ${reward.sourceTable} #${reward.sourceMovementId || '—'}`
                        : 'Aun sin premio acreditado'
                      }
                    </ItemSecondary>
                  </ItemBody>
                </ListItem>
              )
            })}
          </List>
        )}
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Pagos por referido</CardTitle>
          <Badge>{rewards.length}</Badge>
        </CardHead>
        {loading && !data ? (
          <Empty>Cargando pagos...</Empty>
        ) : rewards.length === 0 ? (
          <Empty>Sin pagos registrados</Empty>
        ) : (
          <List>
            {rewards.map(item => (
              <ListItem key={item.id}>
                <Avatar $tone={item.status === 'paid' ? 'rgba(34,197,94,0.14)' : item.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'} $border={item.status === 'paid' ? 'rgba(34,197,94,0.24)' : item.status === 'failed' ? 'rgba(239,68,68,0.22)' : 'rgba(245,158,11,0.22)'} $color={item.status === 'paid' ? '#4ade80' : item.status === 'failed' ? '#f87171' : '#f59e0b'}>
                  <PaidOutlinedIcon style={{ fontSize: 16 }} />
                </Avatar>
                <ItemBody>
                  <ItemPrimary>
                    {item.referredUsername}
                    <Chip $tone={statusTone(item.status)}>
                      {statusIcon(item.status)}
                      {statusLabel(item.status)}
                    </Chip>
                  </ItemPrimary>
                  <ItemSecondary>
                    {item.amount || 0} fichas · {item.sourceTable} #{item.sourceMovementId || '—'}
                  </ItemSecondary>
                  <ItemSecondary>
                    {item.sourceMovementAmount != null ? `Depósito: ${item.sourceMovementAmount}` : 'Depósito: —'}
                    {item.sourceMovementCreatedAt ? ` · ${formatDate(item.sourceMovementCreatedAt)}` : ''}
                  </ItemSecondary>
                  {item.errorMessage && item.status !== 'paid' && (
                    <ItemSecondary style={{ color: '#fca5a5' }}>
                      {item.errorMessage}
                    </ItemSecondary>
                  )}
                </ItemBody>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Shell>
  )
}
