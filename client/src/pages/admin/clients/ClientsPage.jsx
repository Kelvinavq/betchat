import { useState, useRef, useEffect, useCallback } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import AddCardIcon from '@mui/icons-material/AddCard'
import RemoveIcon from '@mui/icons-material/Remove'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { api } from '../../../utils/api'
import { useConfirm } from '../../../context/ToastContext'
import { getPaginationItems } from '../../../utils/pagination'
import ReferralDetailsSection from '../../../components/admin/referrals/ReferralDetailsSection'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub,
  HeaderActions, AddBtn, OutlineBtn,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  ClientCell, ClientAvatar, ClientMeta, ClientName, ClientId,
  MonoText, StatusBadge, OnlineDot,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn, EmptyRow, EmptyCell,
  Overlay, ModalCard, ModalCardWide, PwdModalCard,
  ModalHead, ModalTitle, ModalSub, ModalClose, ModalBody,
  ModalTabBar, ModalTab, ModalTabPill,
  AvatarRow, AvatarBox, AvatarHint,
  SecLabel, FormGrid, Field, FieldLabel, FieldInput, FieldInputError, ErrorMsg,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  ModalFoot, FootLeft, FootRight, ModalBtn,
  DetailSection, DetailSectionTitle, DetailStatsGrid, DetailStat, DetailStatLabel, DetailStatValue,
  DetailChips, DetailChip, DetailList, DetailRow, DetailRowLabel, DetailRowValue, DetailGrid, DetailEmpty,
  Toast, ToastIconBox, ToastBody, ToastTitle, ToastMsg, ToastClose,
  StatsGrid, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  BtnSpinner,
  BalanceModalCard, BalanceClientRow, BalanceClientAvatar, BalanceClientMeta,
  BalanceClientName, BalanceClientSub, BalanceBody, BalanceSectionLabel,
  QuickGrid, QuickBtn, BalanceInputWrap, BalanceCurrencySign, BalanceInput,
  BalanceBtnRow, BalanceCreditBtn, BalanceDebitBtn,
} from './ClientsPage.styles'

const PER_PAGE = 10
const hasWhitespace = (value) => /\s/.test(value)
const hasUppercase = (value) => /[A-Z]/.test(value)

const validateClientCredentials = ({ username, password, includeUsername = true }) => {
  const cleanUsername = String(username || '').trim()
  const cleanPassword = String(password || '')

  if (includeUsername && (!cleanUsername || hasWhitespace(cleanUsername) || hasUppercase(cleanUsername))) {
    return 'El usuario no puede tener espacios ni mayusculas.'
  }
  if (!cleanPassword || cleanPassword.length < 4 || hasWhitespace(cleanPassword) || hasUppercase(cleanPassword)) {
    return 'La contrasena debe tener minimo 4 caracteres, sin espacios ni mayusculas.'
  }
  return ''
}

const todayStr = () =>
  new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/* ── view / add modal ── */
const ClientModal = ({ mode, client, onClose, onSave, onDelete, notify, saving }) => {
  const { timezone } = useDateFormat()
  const [form, setForm] = useState(() =>
    mode === 'view' && client
      ? {
          username: client.username,
          fullName: client.fullName || '',
          email: client.email || '',
          externalId: client.externalId || '',
          cuil: client.cuil || '',
          active: client.active,
          registeredAt: client.registeredAt || '',
        }
      : { username: '', password: '', balance: '' }
  )
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const avatarChar = form.username.trim() ? form.username.trim()[0].toUpperCase() : '?'
  const isViewMode = mode === 'view'
  const isAddMode = mode === 'add'
  const isEditMode = mode === 'edit'
  const [tab, setTab] = useState('info')
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setTab('info')
  }, [client?.id, mode])

  useEffect(() => {
    if (!isViewMode || !client?.id) {
      setDetailData(null)
      setDetailLoading(false)
      return undefined
    }

    let active = true
    setDetailLoading(true)
    setDetailData(null)

    api.get(`/api/clients/${client.id}/detail`)
      .then((payload) => {
        if (active) setDetailData(payload || null)
      })
      .catch(() => {
        if (active) setDetailData(null)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => { active = false }
  }, [client?.id, isViewMode])

  const detailClient = detailData?.client || null
  const detailWithdrawals = detailData?.withdrawals || []
  const detailSessions = detailData?.sessions || []
  const detailCbus = detailData?.cbus || []
  const detailAdjustments = detailData?.adjustments || []
  const detailLabels = detailData?.labels || []
  const CardComponent = isViewMode ? ModalCardWide : ModalCard

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      notify('Copiado al portapapeles', 'success')
    }).catch(() => {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      notify('Copiado al portapapeles', 'success')
    })
  }

  return (
    <Overlay onClick={onClose}>
      <CardComponent
        onClick={e => e.stopPropagation()}
        style={isViewMode ? { width: '100%' } : undefined}
      >

        <ModalHead>
          <div>
            <ModalTitle>
              {isAddMode ? 'Nuevo cliente' : isViewMode ? 'Detalle de cliente' : 'Editar cliente'}
            </ModalTitle>
            <ModalSub>
              {isAddMode ? 'Registrar nuevo cliente en el sistema' : `Información de ${client.username}`}
            </ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>

          <AvatarRow>
            <AvatarBox>{avatarChar}</AvatarBox>
            <AvatarHint>Avatar generado automáticamente</AvatarHint>
          </AvatarRow>

          {isAddMode ? (
            // Modo agregar: solo usuario y contraseña
            <div>
              <SecLabel>Datos del cliente</SecLabel>
              <FormGrid style={{ marginTop: 14 }}>
                <Field $full>
                  <FieldLabel>Nombre de usuario</FieldLabel>
                  <FieldInput
                    placeholder="usuario123"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    autoComplete="username"
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Contraseña</FieldLabel>
                  <FieldInput
                    type="text"
                    placeholder="contraseña123"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Saldo inicial (opcional)</FieldLabel>
                  <FieldInput
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.balance}
                    onChange={e => set('balance', e.target.value)}
                  />
                </Field>
              </FormGrid>
            </div>
          ) : isViewMode ? (
            // Modo ver: campos readonly con botones de copiar
            <div>
              <SecLabel>Datos del cliente</SecLabel>
              <FormGrid style={{ marginTop: 14 }}>
                <Field $full>
                  <FieldLabel>Nombre de usuario</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <FieldInput
                      value={form.username}
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <ModalBtn
                      style={{ padding: '8px', minWidth: 'auto' }}
                      onClick={() => copyToClipboard(form.username)}
                      title="Copiar usuario"
                    >
                      <ContentCopyIcon style={{ fontSize: 16 }} />
                    </ModalBtn>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Nombre completo</FieldLabel>
                  <FieldInput
                    placeholder="No especificado"
                    value={form.fullName}
                    onChange={e => set('fullName', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Correo electrónico</FieldLabel>
                  <FieldInput
                    type="email"
                    placeholder="usuario@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>ID Externo (plataforma)</FieldLabel>
                  <FieldInput
                    value={form.externalId}
                    readOnly
                  />
                </Field>
                <Field>
                  <FieldLabel>CUIT / CUIL</FieldLabel>
                  <FieldInput
                    placeholder="XX-XXXXXXXX-X"
                    value={form.cuil}
                    onChange={e => set('cuil', e.target.value)}
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Fecha de registro</FieldLabel>
                  <FieldInput
                    value={form.registeredAt ? new Date(form.registeredAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', ...(timezone && { timeZone: timezone }) }) : ''}
                    readOnly
                  />
                </Field>
              </FormGrid>

              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>El cliente puede iniciar sesión en la plataforma</StatusRowSub>
                </StatusRowLabel>
                <Toggle $on={form.active} onClick={() => set('active', !form.active)}>
                  <ToggleThumb $on={form.active} />
                </Toggle>
              </StatusRow>

            </div>
          ) : (
            // Modo editar (si se implementa en el futuro)
            <div>Modo editar no implementado</div>
          )}

          {isViewMode && (
            <>
              <SecLabel>Detalle ampliado</SecLabel>
              <DetailSection>
                <DetailSectionTitle>Resumen general</DetailSectionTitle>
                {detailLoading ? (
                  <DetailEmpty>Cargando detalles del cliente...</DetailEmpty>
                ) : (
                  <>
                    <DetailStatsGrid>
                      <DetailStat>
                        <DetailStatLabel>Chats</DetailStatLabel>
                        <DetailStatValue>{detailClient?.chatCount ?? 0}</DetailStatValue>
                      </DetailStat>
                      <DetailStat>
                        <DetailStatLabel>Retiros</DetailStatLabel>
                        <DetailStatValue>{detailClient?.withdrawalCount ?? 0}</DetailStatValue>
                      </DetailStat>
                      <DetailStat>
                        <DetailStatLabel>Pendientes</DetailStatLabel>
                        <DetailStatValue>{detailClient?.pendingWithdrawalCount ?? 0}</DetailStatValue>
                      </DetailStat>
                      <DetailStat>
                        <DetailStatLabel>Sesiones</DetailStatLabel>
                        <DetailStatValue>{detailClient?.sessionCount ?? 0}</DetailStatValue>
                      </DetailStat>
                      <DetailStat>
                        <DetailStatLabel>CBUs</DetailStatLabel>
                        <DetailStatValue>{detailClient?.cbuCount ?? 0}</DetailStatValue>
                      </DetailStat>
                      <DetailStat>
                        <DetailStatLabel>Ajustes</DetailStatLabel>
                        <DetailStatValue>{detailClient?.balanceAdjustmentCount ?? 0}</DetailStatValue>
                      </DetailStat>
                    </DetailStatsGrid>

                    {detailLabels.length > 0 && (
                      <DetailChips>
                        {detailLabels.map(label => (
                          <DetailChip key={label.id || `${label.name}-${label.color}`}>{label.name}</DetailChip>
                        ))}
                      </DetailChips>
                    )}
                  </>
                )}
              </DetailSection>

              <DetailGrid>
                <DetailSection>
                  <DetailSectionTitle>Retiros recientes</DetailSectionTitle>
                  {detailWithdrawals.length > 0 ? (
                    <DetailList>
                      {detailWithdrawals.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>#{item.id} · {item.status || 'pending'}</DetailRowLabel>
                          <DetailRowValue>
                            {item.amount ?? '0'} {item.method ? `· ${item.method}` : ''}
                          </DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin retiros registrados.</DetailEmpty>
                  )}
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>Sesiones recientes</DetailSectionTitle>
                  {detailSessions.length > 0 ? (
                    <DetailList>
                      {detailSessions.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>{item.deviceType || 'Sesión'}</DetailRowLabel>
                          <DetailRowValue>
                            {[item.browser || '', item.country || item.city || ''].filter(Boolean).join(' · ') || 'Sin datos'}
                          </DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin sesiones registradas.</DetailEmpty>
                  )}
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>CBUs / CVUs</DetailSectionTitle>
                  {detailCbus.length > 0 ? (
                    <DetailList>
                      {detailCbus.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>{item.label || 'CBU/CVU'}</DetailRowLabel>
                          <DetailRowValue>{item.cbu}</DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin CBUs cargados.</DetailEmpty>
                  )}
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>Ajustes de saldo</DetailSectionTitle>
                  {detailAdjustments.length > 0 ? (
                    <DetailList>
                      {detailAdjustments.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>{item.operation || 'ajuste'}</DetailRowLabel>
                          <DetailRowValue>
                            {item.amount ?? '0'} {item.note ? `· ${item.note}` : ''}
                          </DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin ajustes de saldo.</DetailEmpty>
                  )}
                </DetailSection>
              </DetailGrid>
            </>
          )}

        </ModalBody>

        <ModalFoot>
          <FootLeft>
            {isViewMode && (
              <ModalBtn $v="danger" onClick={() => onDelete(client.id)}>Eliminar</ModalBtn>
            )}
          </FootLeft>
          <FootRight>
            <ModalBtn onClick={onClose}>Cerrar</ModalBtn>
            {isViewMode && (
              <ModalBtn $v="primary" disabled={saving} onClick={() => onSave(form)}>
                {saving ? <><BtnSpinner />Guardando...</> : 'Guardar cambios'}
              </ModalBtn>
            )}
            {isAddMode && (
              <ModalBtn $v="primary" disabled={saving} onClick={() => onSave(form)}>
                {saving ? <><BtnSpinner />Creando...</> : 'Crear cliente'}
              </ModalBtn>
            )}
          </FootRight>
        </ModalFoot>

      </CardComponent>
    </Overlay>
  )
}

/* ── change password modal ── */
/* ── client detail / form modals v2 ── */
const ClientDetailModalV2 = ({ client, onClose, onEdit, onDelete, notify }) => {
  const { timezone } = useDateFormat()
  const [tab, setTab] = useState('info')
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [referralData, setReferralData] = useState(null)
  const [referralLoading, setReferralLoading] = useState(false)

  useEffect(() => {
    setTab('info')
  }, [client?.id])

  useEffect(() => {
    if (!client?.id) {
      setDetailData(null)
      setDetailLoading(false)
      return undefined
    }

    let active = true
    setDetailLoading(true)
    setDetailData(null)

    api.get(`/api/clients/${client.id}/detail`)
      .then((payload) => {
        if (active) setDetailData(payload || null)
      })
      .catch(() => {
        if (active) setDetailData(null)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })

    return () => { active = false }
  }, [client?.id])

  useEffect(() => {
    if (!client?.id) {
      setReferralData(null)
      setReferralLoading(false)
      return undefined
    }

    let active = true
    setReferralLoading(true)
    setReferralData(null)

    api.get(`/api/clients/${client.id}/referral`)
      .then((payload) => {
        if (active) setReferralData(payload || null)
      })
      .catch(() => {
        if (active) setReferralData(null)
      })
      .finally(() => {
        if (active) setReferralLoading(false)
      })

    return () => { active = false }
  }, [client?.id])

  const detailClient = detailData?.client || client || null
  const detailWithdrawals = detailData?.withdrawals || []
  const detailSessions = detailData?.sessions || []
  const detailCbus = detailData?.cbus || []
  const detailAdjustments = detailData?.adjustments || []
  const detailLabels = detailData?.labels || []

  const formatDate = (value, includeTime = true) => {
    if (!value) return 'Sin datos'
    return new Date(value).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      ...(timezone && { timeZone: timezone }),
    })
  }

  const infoRows = [
    ['Usuario', detailClient?.username || 'Sin usuario'],
    ['Nombre completo', detailClient?.fullName || 'No especificado'],
    ['Correo', detailClient?.email || 'No especificado'],
    ['CUIT / CUIL', detailClient?.cuil || 'No especificado'],
    ['ID externo', detailClient?.externalId || 'Sin ID externo'],
    ['Registro', formatDate(detailClient?.registeredAt, true)],
  ]

  const accessRows = [
    ['Estado', detailClient?.active ? 'Activo' : 'Inactivo'],
    ['Online', detailClient?.online ? 'En linea' : 'Offline'],
    ['Sesion temporal', detailClient?.tempSessionActive ? 'Activa' : 'Inactiva'],
    ['Push bloqueado', detailClient?.pushBlocked ? 'Si' : 'No'],
    ['Ultima actividad', formatDate(detailClient?.lastSeenAt, true)],
  ]

  const summaryStats = [
    ['Chats', detailClient?.chatCount ?? 0],
    ['Retiros', detailClient?.withdrawalCount ?? 0],
    ['Pendientes', detailClient?.pendingWithdrawalCount ?? 0],
    ['Sesiones', detailClient?.sessionCount ?? 0],
    ['CBUs', detailClient?.cbuCount ?? 0],
    ['Ajustes', detailClient?.balanceAdjustmentCount ?? 0],
  ]

  return (
    <Overlay onClick={onClose}>
      <ModalCardWide onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>Detalle de cliente</ModalTitle>
            <ModalSub>{detailClient?.username || client?.username || 'Cliente'}</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalTabBar>
          <ModalTab type="button" $active={tab === 'info'} onClick={() => setTab('info')}>
            <InfoOutlinedIcon />
            <span className="tab-label">Info</span>
            <ModalTabPill>{detailLoading ? '...' : summaryStats[0][1]}</ModalTabPill>
          </ModalTab>
          <ModalTab type="button" $active={tab === 'archivo'} onClick={() => setTab('archivo')}>
            <FolderOutlinedIcon />
            <span className="tab-label">Archivo</span>
            <ModalTabPill>{detailLoading || referralLoading ? '...' : detailWithdrawals.length}</ModalTabPill>
          </ModalTab>
          <ModalTab type="button" $active={tab === 'saldo'} onClick={() => setTab('saldo')}>
            <AccountBalanceWalletOutlinedIcon />
            <span className="tab-label">Saldo</span>
            <ModalTabPill>{detailAdjustments.length}</ModalTabPill>
          </ModalTab>
          <ModalTab type="button" $active={tab === 'perfil'} onClick={() => setTab('perfil')}>
            <PersonOutlinedIcon />
            <span className="tab-label">Perfil</span>
            <ModalTabPill>{detailSessions.length + detailCbus.length}</ModalTabPill>
          </ModalTab>
        </ModalTabBar>

        <ModalBody>
          <AvatarRow>
            <AvatarBox>{(detailClient?.username || client?.username || '?')[0].toUpperCase()}</AvatarBox>
            <AvatarHint>Vista de solo lectura</AvatarHint>
          </AvatarRow>

          {tab === 'info' && (
            <>
              <DetailSection>
                <DetailSectionTitle>Resumen general</DetailSectionTitle>
                {detailLoading ? (
                  <DetailEmpty>Cargando detalles del cliente...</DetailEmpty>
                ) : (
                  <>
                    <DetailStatsGrid>
                      {summaryStats.map(([label, value]) => (
                        <DetailStat key={label}>
                          <DetailStatLabel>{label}</DetailStatLabel>
                          <DetailStatValue>{value}</DetailStatValue>
                        </DetailStat>
                      ))}
                    </DetailStatsGrid>
                    {detailLabels.length > 0 && (
                      <DetailChips>
                        {detailLabels.map(label => (
                          <DetailChip key={label.id || `${label.name}-${label.color}`}>{label.name}</DetailChip>
                        ))}
                      </DetailChips>
                    )}
                  </>
                )}
              </DetailSection>

              <DetailGrid>
                <DetailSection>
                  <DetailSectionTitle>Datos de cuenta</DetailSectionTitle>
                  <DetailList>
                    {infoRows.map(([label, value]) => (
                      <DetailRow key={label}>
                        <DetailRowLabel>{label}</DetailRowLabel>
                        <DetailRowValue>{value}</DetailRowValue>
                      </DetailRow>
                    ))}
                  </DetailList>
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>Estado y acceso</DetailSectionTitle>
                  <DetailList>
                    {accessRows.map(([label, value]) => (
                      <DetailRow key={label}>
                        <DetailRowLabel>{label}</DetailRowLabel>
                        <DetailRowValue>{value}</DetailRowValue>
                      </DetailRow>
                    ))}
                  </DetailList>
                </DetailSection>
              </DetailGrid>
            </>
          )}

          {tab === 'archivo' && (
            <>
              <DetailGrid>
                <DetailSection>
                  <DetailSectionTitle>Retiros recientes</DetailSectionTitle>
                  {detailWithdrawals.length > 0 ? (
                    <DetailList>
                      {detailWithdrawals.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>#{item.id} · {item.status || 'pending'}</DetailRowLabel>
                          <DetailRowValue>
                            {item.amount ?? '0'} {item.method ? `· ${item.method}` : ''}
                          </DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin retiros registrados.</DetailEmpty>
                  )}
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>Ajustes de saldo</DetailSectionTitle>
                  {detailAdjustments.length > 0 ? (
                    <DetailList>
                      {detailAdjustments.slice(0, 4).map(item => (
                        <DetailRow key={item.id}>
                          <DetailRowLabel>{item.operation || 'ajuste'}</DetailRowLabel>
                          <DetailRowValue>
                            {item.amount ?? '0'} {item.note ? `· ${item.note}` : ''}
                          </DetailRowValue>
                        </DetailRow>
                      ))}
                    </DetailList>
                  ) : (
                    <DetailEmpty>Sin ajustes de saldo.</DetailEmpty>
                  )}
                </DetailSection>
              </DetailGrid>

              {detailLabels.length > 0 && (
                <DetailSection>
                  <DetailSectionTitle>Etiquetas actuales</DetailSectionTitle>
                  <DetailChips>
                    {detailLabels.map(label => (
                      <DetailChip key={label.id || `${label.name}-${label.color}`}>{label.name}</DetailChip>
                    ))}
                  </DetailChips>
                </DetailSection>
              )}

              <ReferralDetailsSection data={referralData} loading={referralLoading} compact />
            </>
          )}

          {tab === 'saldo' && (
            <DetailSection>
              <DetailSectionTitle>Gestion de saldo</DetailSectionTitle>
              <BalanceControls client={detailClient} notify={notify} />
              <DetailEmpty style={{ marginTop: 2 }}>
                Los movimientos de saldo quedan auditados automaticamente.
              </DetailEmpty>
            </DetailSection>
          )}

          {tab === 'perfil' && (
            <DetailGrid>
              <DetailSection>
                <DetailSectionTitle>Sesiones recientes</DetailSectionTitle>
                {detailSessions.length > 0 ? (
                  <DetailList>
                    {detailSessions.slice(0, 4).map(item => (
                      <DetailRow key={item.id}>
                        <DetailRowLabel>{item.deviceType || 'Sesion'}</DetailRowLabel>
                        <DetailRowValue>
                          {[item.browser || '', item.country || item.city || ''].filter(Boolean).join(' · ') || 'Sin datos'}
                        </DetailRowValue>
                      </DetailRow>
                    ))}
                  </DetailList>
                ) : (
                  <DetailEmpty>Sin sesiones registradas.</DetailEmpty>
                )}
              </DetailSection>

              <DetailSection>
                <DetailSectionTitle>CBUs / CVUs</DetailSectionTitle>
                {detailCbus.length > 0 ? (
                  <DetailList>
                    {detailCbus.slice(0, 4).map(item => (
                      <DetailRow key={item.id}>
                        <DetailRowLabel>{item.label || 'CBU/CVU'}</DetailRowLabel>
                        <DetailRowValue>{item.cbu}</DetailRowValue>
                      </DetailRow>
                    ))}
                  </DetailList>
                ) : (
                  <DetailEmpty>Sin CBUs cargados.</DetailEmpty>
                )}
              </DetailSection>

              <DetailSection>
                <DetailSectionTitle>Datos tecnicos</DetailSectionTitle>
                <DetailList>
                  <DetailRow>
                    <DetailRowLabel>Username</DetailRowLabel>
                    <DetailRowValue>{detailClient?.username || 'Sin usuario'}</DetailRowValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailRowLabel>ID externo</DetailRowLabel>
                    <DetailRowValue>{detailClient?.externalId || 'Sin ID externo'}</DetailRowValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailRowLabel>Ultima actividad</DetailRowLabel>
                    <DetailRowValue>{formatDate(detailClient?.lastSeenAt, true)}</DetailRowValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailRowLabel>CUIT / CUIL</DetailRowLabel>
                    <DetailRowValue>{detailClient?.cuil || 'No especificado'}</DetailRowValue>
                  </DetailRow>
                </DetailList>
              </DetailSection>
            </DetailGrid>
          )}
        </ModalBody>

        <ModalFoot>
          <FootLeft>
            <ModalBtn $v="danger" onClick={() => onDelete(detailClient?.id || client.id)}>
              Eliminar
            </ModalBtn>
          </FootLeft>
          <FootRight>
            <ModalBtn onClick={onClose}>Cerrar</ModalBtn>
            <ModalBtn $v="primary" onClick={() => onEdit(detailClient)}>
              Editar
            </ModalBtn>
          </FootRight>
        </ModalFoot>
      </ModalCardWide>
    </Overlay>
  )
}

const ClientFormModalV2 = ({ mode, client, onClose, onSave, saving }) => {
  const isAddMode = mode === 'add'
  const { timezone } = useDateFormat()
  const [form, setForm] = useState(() => (
    !isAddMode && client
      ? {
          username: client.username || '',
          fullName: client.fullName || '',
          email: client.email || '',
          externalId: client.externalId || '',
          cuil: client.cuil || '',
          active: client.active ?? true,
          registeredAt: client.registeredAt || '',
          password: '',
          balance: '',
        }
      : { username: '', password: '', balance: '' }
  ))

  useEffect(() => {
    setForm(
      !isAddMode && client
        ? {
            username: client.username || '',
            fullName: client.fullName || '',
            email: client.email || '',
            externalId: client.externalId || '',
            cuil: client.cuil || '',
            active: client.active ?? true,
            registeredAt: client.registeredAt || '',
            password: '',
            balance: '',
          }
        : { username: '', password: '', balance: '' }
    )
  }, [client?.id, isAddMode])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const avatarChar = (form.username || client?.username || '?').trim()
    ? (form.username || client?.username || '?').trim()[0].toUpperCase()
    : '?'

  const handleSubmit = () => onSave(form)

  return (
    <Overlay onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>{isAddMode ? 'Nuevo cliente' : 'Editar cliente'}</ModalTitle>
            <ModalSub>
              {isAddMode ? 'Registrar nuevo cliente en el sistema' : `Editar datos de ${client?.username || 'cliente'}`}
            </ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>
          <AvatarRow>
            <AvatarBox>{avatarChar}</AvatarBox>
            <AvatarHint>{isAddMode ? 'Se asignara automaticamente' : 'Cambios administrativos'}</AvatarHint>
          </AvatarRow>

          {isAddMode ? (
            <div>
              <SecLabel>Datos del cliente</SecLabel>
              <FormGrid style={{ marginTop: 14 }}>
                <Field $full>
                  <FieldLabel>Nombre de usuario</FieldLabel>
                  <FieldInput
                    placeholder="usuario123"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    autoComplete="username"
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Contrasena</FieldLabel>
                  <FieldInput
                    type="text"
                    placeholder="contrasena123"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Saldo inicial (opcional)</FieldLabel>
                  <FieldInput
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.balance}
                    onChange={e => set('balance', e.target.value)}
                  />
                </Field>
              </FormGrid>
            </div>
          ) : (
            <div>
              <SecLabel>Datos editables</SecLabel>
              <FormGrid style={{ marginTop: 14 }}>
                <Field $full>
                  <FieldLabel>Nombre de usuario</FieldLabel>
                  <FieldInput value={form.username} readOnly />
                </Field>
                <Field>
                  <FieldLabel>Nombre completo</FieldLabel>
                  <FieldInput
                    placeholder="No especificado"
                    value={form.fullName}
                    onChange={e => set('fullName', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Correo electronico</FieldLabel>
                  <FieldInput
                    type="email"
                    placeholder="usuario@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>ID externo</FieldLabel>
                  <FieldInput value={form.externalId} readOnly />
                </Field>
                <Field>
                  <FieldLabel>CUIT / CUIL</FieldLabel>
                  <FieldInput
                    placeholder="XX-XXXXXXXX-X"
                    value={form.cuil}
                    onChange={e => set('cuil', e.target.value)}
                  />
                </Field>
                <Field $full>
                  <FieldLabel>Fecha de registro</FieldLabel>
                  <FieldInput
                    value={form.registeredAt ? new Date(form.registeredAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      ...(timezone && { timeZone: timezone }),
                    }) : ''}
                    readOnly
                  />
                </Field>
              </FormGrid>

              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>El cliente puede iniciar sesion en la plataforma</StatusRowSub>
                </StatusRowLabel>
                <Toggle $on={form.active} onClick={() => set('active', !form.active)}>
                  <ToggleThumb $on={form.active} />
                </Toggle>
              </StatusRow>
            </div>
          )}
        </ModalBody>

        <ModalFoot>
          <FootLeft />
          <FootRight>
            <ModalBtn onClick={onClose}>Cerrar</ModalBtn>
            <ModalBtn $v="primary" disabled={saving} onClick={handleSubmit}>
              {saving ? <><BtnSpinner />{isAddMode ? 'Creando...' : 'Guardando...'}</> : (isAddMode ? 'Crear cliente' : 'Guardar cambios')}
            </ModalBtn>
          </FootRight>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

const ClientModalV2 = (props) => {
  if (props.mode === 'view') {
    return <ClientDetailModalV2 {...props} />
  }
  return <ClientFormModalV2 {...props} />
}

const PwdModal = ({ client, onClose, onSave }) => {
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const mismatch = confirmPwd.length > 0 && newPwd !== confirmPwd
  const canSave  = newPwd.length >= 1 && !mismatch

  return (
    <Overlay onClick={onClose}>
      <PwdModalCard onClick={e => e.stopPropagation()}>

        <ModalHead>
          <div>
            <ModalTitle>Cambiar contraseña</ModalTitle>
            <ModalSub>{client.username}</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>
          <Field>
            <FieldLabel>Nueva contraseña</FieldLabel>
            <FieldInput
              type="password"
              placeholder="••••••••"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field>
            <FieldLabel>Confirmar contraseña</FieldLabel>
            {mismatch ? (
              <FieldInputError
                type="password"
                placeholder="••••••••"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
            ) : (
              <FieldInput
                type="password"
                placeholder="••••••••"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
            )}
            {mismatch && <ErrorMsg>Las contraseñas no coinciden</ErrorMsg>}
          </Field>
        </ModalBody>

        <ModalFoot>
          <FootLeft />
          <FootRight>
            <ModalBtn onClick={onClose}>Cancelar</ModalBtn>
            <ModalBtn $v="primary" disabled={!canSave} onClick={() => onSave(newPwd)}>
              Actualizar
            </ModalBtn>
          </FootRight>
        </ModalFoot>

      </PwdModalCard>
    </Overlay>
  )
}

/* ── balance modal ── */
const ReferralModal = ({ client, onClose }) => {
  const [referralData, setReferralData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client?.id) {
      setReferralData(null)
      return
    }

    let active = true
    setLoading(true)
    setReferralData(null)

    api.get(`/api/clients/${client.id}/referral`)
      .then(data => {
        if (active) setReferralData(data)
      })
      .catch(() => {
        if (active) setReferralData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [client?.id])

  return (
    <Overlay onClick={onClose}>
      <ModalCard
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 760, width: '100%' }}
      >
        <ModalHead>
          <div>
            <ModalTitle>Referidos</ModalTitle>
            <ModalSub>{client.username}</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody style={{ padding: 16 }}>
          <ReferralDetailsSection data={referralData} loading={loading} />
        </ModalBody>

        <ModalFoot>
          <FootLeft />
          <FootRight>
            <ModalBtn onClick={onClose}>Cerrar</ModalBtn>
          </FootRight>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

const QUICK_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000]

const BalanceControls = ({ client, notify, onDone }) => {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const avatarChar = (client.username || '?')[0].toUpperCase()
  const fmt = (n) => `$${new Intl.NumberFormat('es-AR').format(n)}`

  const handleQuick = (val) => setAmount(String(val))

  const handleAction = async (operation) => {
    const n = Number(amount)
    if (!n || n <= 0) {
      setStatus('Ingresá un monto válido.')
      return
    }

    setLoading(true)
    setStatus('')
    try {
      await api.post(`/api/clients/${client.id}/balance`, { amount: n, operation })
      const message = operation === 'in'
        ? `Saldo cargado: ${fmt(n)}`
        : `Retiro registrado: ${fmt(n)}`
      setStatus(message)
      notify?.(message, 'success')
      setAmount('')
      onDone?.()
    } catch (err) {
      const message = err?.payload?.error || err?.message || 'Error al modificar el saldo'
      setStatus(message)
      notify?.(message, 'danger')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <BalanceClientRow style={{ padding: 0 }}>
        <BalanceClientAvatar>{avatarChar}</BalanceClientAvatar>
        <BalanceClientMeta>
          <BalanceClientName>{client.username}</BalanceClientName>
          <BalanceClientSub>{client.externalId ? `ID externo: ${client.externalId}` : 'Sin ID externo'}</BalanceClientSub>
        </BalanceClientMeta>
      </BalanceClientRow>

      <BalanceBody style={{ padding: 0 }}>
        <div>
          <BalanceSectionLabel>Monto rápido</BalanceSectionLabel>
          <QuickGrid style={{ marginTop: 10 }}>
            {QUICK_AMOUNTS.map(v => (
              <QuickBtn
                key={v}
                type="button"
                $active={amount === String(v)}
                onClick={() => handleQuick(v)}
              >
                ${new Intl.NumberFormat('es-AR').format(v)}
              </QuickBtn>
            ))}
          </QuickGrid>
        </div>

        <div>
          <BalanceSectionLabel>Monto personalizado</BalanceSectionLabel>
          <BalanceInputWrap style={{ marginTop: 10 }}>
            <BalanceCurrencySign>$</BalanceCurrencySign>
            <BalanceInput
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </BalanceInputWrap>
        </div>

        {status && <DetailEmpty style={{ marginTop: -4, padding: 12 }}>{status}</DetailEmpty>}
      </BalanceBody>

      <BalanceBtnRow style={{ padding: 0, marginTop: 2 }}>
        <BalanceCreditBtn disabled={loading} onClick={() => handleAction('in')}>
          {loading ? <BtnSpinner /> : <AddCardIcon />}
          Cargar saldo
        </BalanceCreditBtn>
        <BalanceDebitBtn disabled={loading} onClick={() => handleAction('out')}>
          {loading ? <BtnSpinner /> : <RemoveIcon />}
          Retirar saldo
        </BalanceDebitBtn>
      </BalanceBtnRow>
    </>
  )
}

const BalanceModal = ({ client, onClose, notify }) => {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const avatarChar = (client.username || '?')[0].toUpperCase()
  const fmt = (n) => `$${new Intl.NumberFormat('es-AR').format(n)}`

  const handleQuick = (val) => setAmount(String(val))

  const handleAction = async (operation) => {
    const n = Number(amount)
    if (!n || n <= 0) return notify('Ingresá un monto válido', 'danger')
    setLoading(true)
    try {
      await api.post(`/api/clients/${client.id}/balance`, { amount: n, operation })
      notify(operation === 'in' ? `Saldo cargado: ${fmt(n)}` : `Retiro registrado: ${fmt(n)}`, 'success')
      onClose()
    } catch (err) {
      notify(err?.payload?.error || err?.message || 'Error al modificar el saldo', 'danger')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <BalanceModalCard onClick={e => e.stopPropagation()}>

        <ModalHead>
          <div>
            <ModalTitle>Gestión de saldo</ModalTitle>
            <ModalSub>Cargar o retirar saldo del cliente</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <BalanceClientRow>
          <BalanceClientAvatar>{avatarChar}</BalanceClientAvatar>
          <BalanceClientMeta>
            <BalanceClientName>{client.username}</BalanceClientName>
            <BalanceClientSub>{client.externalId ? `ID externo: ${client.externalId}` : 'Sin ID externo'}</BalanceClientSub>
          </BalanceClientMeta>
        </BalanceClientRow>

        <BalanceBody>
          <div>
            <BalanceSectionLabel>Monto rápido</BalanceSectionLabel>
            <QuickGrid style={{ marginTop: 10 }}>
              {QUICK_AMOUNTS.map(v => (
                <QuickBtn
                  key={v}
                  type="button"
                  $active={amount === String(v)}
                  onClick={() => handleQuick(v)}
                >
                  ${new Intl.NumberFormat('es-AR').format(v)}
                </QuickBtn>
              ))}
            </QuickGrid>
          </div>

          <div>
            <BalanceSectionLabel>Monto personalizado</BalanceSectionLabel>
            <BalanceInputWrap style={{ marginTop: 10 }}>
              <BalanceCurrencySign>$</BalanceCurrencySign>
              <BalanceInput
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </BalanceInputWrap>
          </div>
        </BalanceBody>

        <BalanceBtnRow>
          <BalanceCreditBtn disabled={loading} onClick={() => handleAction('in')}>
            {loading ? <BtnSpinner /> : <AddCardIcon />}
            Cargar saldo
          </BalanceCreditBtn>
          <BalanceDebitBtn disabled={loading} onClick={() => handleAction('out')}>
            {loading ? <BtnSpinner /> : <RemoveIcon />}
            Retirar saldo
          </BalanceDebitBtn>
        </BalanceBtnRow>

      </BalanceModalCard>
    </Overlay>
  )
}

/* ── main page ── */
const ClientsPage = ({ onMenuOpen }) => {
  const { timezone } = useDateFormat()
  const confirm = useConfirm()
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [statFilter, setStatFilter] = useState('all')
  const [page, setPage]             = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  const [stats, setStats]           = useState({ total: 0, active: 0, inactive: 0 })
  const [modal, setModal]           = useState(null)
  const [referralModal, setReferralModal] = useState(null)
  const [pwdModal, setPwdModal]     = useState(null)
  const [balanceModal, setBalanceModal] = useState(null)
  const [alert, setAlert]           = useState(null)
  const importRef                   = useRef(null)

  /* auto-dismiss toast */
  useEffect(() => {
    if (!alert) return
    const t = setTimeout(() => setAlert(null), 4500)
    return () => clearTimeout(t)
  }, [alert])

  const notify = (message, type = 'success') => {
    setAlert({ message, type })
  }

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/api/clients/stats')
      setStats({ total: data.total || 0, active: data.active || 0, inactive: data.inactive || 0 })
    } catch {}
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  // Cargar clientes desde API
  const loadClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PER_PAGE.toString(),
        search: search.trim(),
        status: statFilter,
      })

      const data = await api.get(`/api/clients?${params}`)
      setClients(data.clients || [])
      setTotalClients(Number(data.pagination?.total || 0))
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      notify(error.payload?.error || error.message || 'Error al cargar clientes', 'danger')
    } finally {
      setLoading(false)
    }
  }, [page, search, statFilter])

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadClients()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadClients])

  const reset = (fn) => {
    setPage(1)
    fn()
  }

  /* ── csv export ── */
  const exportCSV = async () => {
    try {
      // Obtener todos los clientes sin paginación para exportar
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Límite alto para obtener todos
        search: '',
        status: 'all',
      })

      const data = await api.get(`/api/clients?${params}`)

      const header = 'Usuario,Nombre completo,Email,CUIT/CUIL,ID Externo,Estado,Fecha registro'
      const rows = data.clients.map(c =>
        [
          c.username,
          c.fullName || '',
          c.email || '',
          c.cuil || '',
          c.externalId || '',
          c.active ? 'Activo' : 'Inactivo',
          c.registeredAt ? new Date(c.registeredAt).toLocaleDateString('es-AR', { ...(timezone && { timeZone: timezone }) }) : ''
        ].join(',')
      )
      const content = '﻿' + [header, ...rows].join('\n')
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify('CSV exportado correctamente', 'success')
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      notify(error.payload?.error || error.message || 'Error al exportar CSV', 'danger')
    }
  }

  /* ── csv import ── */
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split('\n').slice(1)
      const imported = lines
        .map((line, i) => {
          const [username, regDate, externalId, cuitCuil, status] = line
            .split(',')
            .map(s => s.trim().replace(/^"|"$/g, ''))
          return {
            id: Date.now() + i,
            username:   username   || '',
            regDate:    regDate    || todayStr(),
            externalId: externalId || '',
            cuitCuil:   cuitCuil   || '',
            active:     status !== 'Inactivo',
            online:     false,
          }
        })
        .filter(c => c.username)
      setClients(prev => [...prev, ...imported])
      notify('CSV importado correctamente', 'success')
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  /* ── crud ── */
  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        const validationError = validateClientCredentials({
          username: form.username,
          password: form.password,
        })
        if (validationError) {
          notify(validationError, 'danger')
          return
        }
        await api.post('/api/clients', {
          username: form.username.trim(),
          password: form.password,
          balance: Number(form.balance) || 0,
        })
        notify('Cliente creado exitosamente.', 'success')
      } else if (modal.mode === 'edit') {
        await api.put(`/api/clients/${modal.client.id}`, {
          fullName: form.fullName || '',
          email: form.email || '',
          cuil: form.cuil || '',
          isActive: form.active,
        })
        notify('Cliente actualizado exitosamente.', 'success')
      }
      setModal(null)
      loadClients()
      loadStats()
    } catch (error) {
      notify(error.payload?.error || error.message || 'Error al guardar cliente', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Confirmar', body: '¿Estás seguro de que quieres eliminar este cliente?', confirmLabel: 'Confirmar', danger: true })
    if (!ok) return

    try {
      await api.delete(`/api/clients/${id}`)
      notify('Cliente eliminado exitosamente.', 'success')
      loadClients()
      loadStats()
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
      notify(error.payload?.error || error.message || 'Error al eliminar cliente', 'danger')
    }
  }

  const handleForceLogout = async (client) => {
    const ok = await confirm({
      title: 'Cerrar sesión del cliente',
      body: `Esto cerrará la sesión activa de ${client.username} en su navegador/chat y lo obligará a volver a iniciar sesión.`,
      confirmLabel: 'Cerrar sesión',
      danger: true,
    })
    if (!ok) return

    try {
      await api.post(`/api/clients/${client.id}/logout`)
      notify(`Sesión cerrada para ${client.username}.`, 'success')
      loadClients()
      loadStats()
    } catch (error) {
      console.error('Error al cerrar sesión del cliente:', error)
      notify(error.payload?.error || error.message || 'Error al cerrar la sesión del cliente', 'danger')
    }
  }

  const handlePwdSave = async (newPwd) => {
    try {
      const validationError = validateClientCredentials({
        password: newPwd,
        includeUsername: false,
      })
      if (validationError) {
        notify(validationError, 'danger')
        return
      }

      await api.put(`/api/clients/${pwdModal.client.id}/password`, { password: newPwd })
      notify('Contraseña actualizada exitosamente.', 'success')
      setPwdModal(null)
    } catch (error) {
      console.error('Error al actualizar contraseña:', error)
      notify(error.payload?.error || error.message || 'Error al actualizar contraseña', 'danger')
    }
  }

  const totalPages = Math.ceil(totalClients / PER_PAGE)
  const safePage   = Math.min(page, totalPages || 1)
  const from = totalClients > 0 ? (safePage - 1) * PER_PAGE + 1 : 0
  const to   = Math.min(safePage * PER_PAGE, totalClients)
  const pageNums = getPaginationItems({ currentPage: safePage, totalPages })

  return (
    <PageWrap data-tour="clients-page">
      <PageScroll>

        {/* ── header ── */}
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn onClick={onMenuOpen} aria-label="Menú"><MenuIcon /></MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Clientes</PageTitle>
              <PageSub>{totalClients} cliente{totalClients !== 1 && 's'} registrado{totalClients !== 1 && 's'}</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <HeaderActions data-tour="clients-header-actions">
            <OutlineBtn onClick={exportCSV}>
              <FileDownloadIcon />
              Exportar CSV
            </OutlineBtn>
            <OutlineBtn onClick={() => importRef.current?.click()}>
              <FileUploadIcon />
              Importar CSV
            </OutlineBtn>
            <AddBtn data-tour="clients-add-btn" onClick={() => setModal({ mode: 'add', client: null })}>
              <AddIcon />
              Nuevo cliente
            </AddBtn>
          </HeaderActions>
        </PageHeader>

        {/* ── stats cards ── */}
        <StatsGrid data-tour="clients-stats">
          <StatCard $color="#3b82f6">
            <StatIconWrap $color="#3b82f6"><GroupOutlinedIcon /></StatIconWrap>
            <StatInfo>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Total clientes</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard $color="#22c55e">
            <StatIconWrap $color="#22c55e"><CheckCircleIcon /></StatIconWrap>
            <StatInfo>
              <StatValue>{stats.active}</StatValue>
              <StatLabel>Activos</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard $color="#f87171">
            <StatIconWrap $color="#f87171"><CancelIcon /></StatIconWrap>
            <StatInfo>
              <StatValue>{stats.inactive}</StatValue>
              <StatLabel>Inactivos</StatLabel>
            </StatInfo>
          </StatCard>
        </StatsGrid>

        {/* ── filters ── */}
        <FiltersBar data-tour="clients-filters">
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              placeholder="Buscar por usuario, ID externo o CUIT/CUIL..."
              value={search}
              onChange={e => reset(() => setSearch(e.target.value))}
            />
          </SearchBox>
          <FilterSelect value={statFilter} onChange={e => reset(() => setStatFilter(e.target.value))}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </FilterSelect>
          <ResultCount>{totalClients} resultado{totalClients !== 1 && 's'}</ResultCount>
        </FiltersBar>

        {/* ── table ── */}
        <TableCard data-tour="clients-table">
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Registro</Th>
                  <Th>ID Externo</Th>
                  <Th>CUIT / CUIL</Th>
                  <Th>Estado</Th>
                  <Th $center>Online</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>
                      <BtnSpinner style={{ width: 18, height: 18, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                      Cargando clientes...
                    </EmptyCell>
                  </EmptyRow>
                ) : clients.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>No se encontraron clientes</EmptyCell>
                  </EmptyRow>
                ) : clients.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <ClientCell>
                        <ClientAvatar>{(c.username || '?')[0].toUpperCase()}</ClientAvatar>
                        <ClientMeta>
                          <ClientName>{c.username}</ClientName>
                          <ClientId>{c.externalId}</ClientId>
                        </ClientMeta>
                      </ClientCell>
                    </Td>
                    <Td><MonoText>{c.registeredAt ? new Date(c.registeredAt).toLocaleDateString('es-AR', { ...(timezone && { timeZone: timezone }) }) : ''}</MonoText></Td>
                    <Td><MonoText>{c.externalId}</MonoText></Td>
                    <Td><MonoText>{c.cuil}</MonoText></Td>
                    <Td>
                      <StatusBadge $on={c.active}>{c.active ? 'Activo' : 'Inactivo'}</StatusBadge>
                    </Td>
                    <Td $center><OnlineDot $on={c.online} /></Td>
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn
                          title="Ver detalles"
                          onClick={() => setModal({ mode: 'view', client: c })}
                        >
                          <VisibilityOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          title="Ver referidos"
                          onClick={() => setReferralModal({ client: c })}
                        >
                          <GroupAddOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          title="Cambiar contraseña"
                          onClick={() => setPwdModal({ client: c })}
                        >
                          <LockOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          $v="warn"
                          title="Cerrar sesión"
                          onClick={() => handleForceLogout(c)}
                        >
                          <LogoutIcon />
                        </ActionBtn>
                        <ActionBtn
                          $v="success"
                          title="Gestionar saldo"
                          onClick={() => setBalanceModal({ client: c })}
                        >
                          <AccountBalanceWalletOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          $v="danger"
                          title="Eliminar cliente"
                          onClick={() => handleDelete(c.id)}
                        >
                          <DeleteOutlinedIcon />
                        </ActionBtn>
                      </ActionBtns>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>

          <Pagination>
            <PaginInfo>
              {totalClients > 0 ? `${from}-${to} de ${totalClients}` : '0 resultados'}
            </PaginInfo>
            <PaginBtns>
              <PaginBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeftIcon />
              </PaginBtn>
              {pageNums.map(item => item.type === 'ellipsis' ? (
                <PaginBtn key={item.key} type="button" disabled>
                  ...
                </PaginBtn>
              ) : (
                <PaginBtn key={item.key} type="button" $active={item.page === safePage} onClick={() => setPage(item.page)}>
                  {item.page}
                </PaginBtn>
              ))}
              <PaginBtn
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>

      </PageScroll>

      {/* hidden CSV import input */}
      <input
        ref={importRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      {modal && (
        <ClientModalV2
          mode={modal.mode}
          client={modal.client}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onEdit={(editedClient) => setModal({ mode: 'edit', client: editedClient || modal.client })}
          notify={notify}
          saving={saving}
        />
      )}

      {referralModal && (
        <ReferralModal
          client={referralModal.client}
          onClose={() => setReferralModal(null)}
        />
      )}

      {balanceModal && (
        <BalanceModal
          client={balanceModal.client}
          onClose={() => setBalanceModal(null)}
          notify={notify}
        />
      )}

      {pwdModal && (
        <PwdModal
          client={pwdModal.client}
          onClose={() => setPwdModal(null)}
          onSave={handlePwdSave}
        />
      )}

      {alert && (
        <Toast $type={alert.type}>
          <ToastIconBox $type={alert.type}>
            {alert.type === 'success'
              ? <CheckCircleOutlinedIcon />
              : <ErrorOutlinedIcon />
            }
          </ToastIconBox>
          <ToastBody>
            <ToastTitle>{alert.type === 'success' ? 'Éxito' : 'Error'}</ToastTitle>
            <ToastMsg>{alert.message}</ToastMsg>
          </ToastBody>
          <ToastClose type="button" onClick={() => setAlert(null)}>
            <CloseIcon />
          </ToastClose>
        </Toast>
      )}
    </PageWrap>
  )
}

export default ClientsPage

