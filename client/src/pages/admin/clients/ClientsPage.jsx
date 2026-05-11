import { useState, useRef, useEffect, useCallback } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
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
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import AddCardIcon from '@mui/icons-material/AddCard'
import RemoveIcon from '@mui/icons-material/Remove'
import { api } from '../../../utils/api'
import { useConfirm } from '../../../context/ToastContext'
import { getPaginationItems } from '../../../utils/pagination'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub,
  HeaderActions, AddBtn, OutlineBtn,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  ClientCell, ClientAvatar, ClientMeta, ClientName, ClientId,
  MonoText, StatusBadge, OnlineDot,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn, EmptyRow, EmptyCell,
  Overlay, ModalCard, PwdModalCard,
  ModalHead, ModalTitle, ModalSub, ModalClose, ModalBody,
  AvatarRow, AvatarBox, AvatarHint,
  SecLabel, FormGrid, Field, FieldLabel, FieldInput, FieldInputError, ErrorMsg,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  ModalFoot, FootLeft, FootRight, ModalBtn,
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
  const [form, setForm] = useState(() =>
    mode === 'view' && client
      ? {
          username: client.username,
          fullName: client.fullName || '',
          email: client.email || '',
          externalId: client.externalId || '',
          cuil: client.cuil || '',
          active: client.active,
          registeredAt: client.registeredAt ? new Date(client.registeredAt).toLocaleDateString('es-AR') : '',
        }
      : { username: '', password: '', balance: '' }
  )
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const avatarChar = form.username.trim() ? form.username.trim()[0].toUpperCase() : '?'

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

  const isViewMode = mode === 'view'
  const isAddMode = mode === 'add'

  return (
    <Overlay onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>

        <ModalHead>
          <div>
            <ModalTitle>
              {isAddMode ? 'Nuevo cliente' : isViewMode ? 'Ver cliente' : 'Editar cliente'}
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
                    value={form.registeredAt}
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

      </ModalCard>
    </Overlay>
  )
}

/* ── change password modal ── */
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
const QUICK_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000]

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
          c.registeredAt ? new Date(c.registeredAt).toLocaleDateString('es-AR') : ''
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
      } else if (modal.mode === 'view') {
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
    <PageWrap>
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
          <HeaderActions>
            <OutlineBtn onClick={exportCSV}>
              <FileDownloadIcon />
              Exportar CSV
            </OutlineBtn>
            <OutlineBtn onClick={() => importRef.current?.click()}>
              <FileUploadIcon />
              Importar CSV
            </OutlineBtn>
            <AddBtn onClick={() => setModal({ mode: 'add', client: null })}>
              <AddIcon />
              Nuevo cliente
            </AddBtn>
          </HeaderActions>
        </PageHeader>

        {/* ── stats cards ── */}
        <StatsGrid>
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
        <FiltersBar>
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
        <TableCard>
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
                    <Td><MonoText>{c.registeredAt ? new Date(c.registeredAt).toLocaleDateString('es-AR') : ''}</MonoText></Td>
                    <Td><MonoText>{c.externalId}</MonoText></Td>
                    <Td><MonoText>{c.cuil}</MonoText></Td>
                    <Td>
                      <StatusBadge $on={c.active}>{c.active ? 'Activo' : 'Inactivo'}</StatusBadge>
                    </Td>
                    <Td $center><OnlineDot $on={c.online} /></Td>
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn
                          title="Ver cliente"
                          onClick={() => setModal({ mode: 'view', client: c })}
                        >
                          <VisibilityOutlinedIcon />
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
                          disabled={!c.online}
                          onClick={() => {}}
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
        <ClientModal
          mode={modal.mode}
          client={modal.client}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          notify={notify}
          saving={saving}
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
