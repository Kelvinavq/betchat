import { useCallback, useEffect, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import { api } from '../../../utils/api'
import useAuth from '../../../hooks/useAuth'
import { getPaginationItems } from '../../../utils/pagination'
import {
  PageWrap, PageScroll,
  PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  UserCell, UserAvatar, UserMeta, UserName, UserEmail,
  RoleBadge, StatusBadge, OnlineDot,
  PermChips, PermChip,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  EmptyRow, EmptyCell, LoadingRow, LoadingCell,
  Overlay, ModalCard, ModalHead, ModalTitle, ModalSub, ModalClose, ModalBody,
  AvatarRow, AvatarBox, AvatarHint,
  SecLabel,
  FormGrid, Field, FieldLabel, FieldInput, FieldSelect,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  PermGrid, PermRow, PermName, PermDot, PermSub, PermActions, PermAction, PermActionLabel,
  RestrList, RestrItem, RestrCheck, RestrLabel, RestrNote,
  TimeGrid, TimeInput, TimeBadge,
  ModalFoot, FootLeft, FootRight, ModalBtn,
  SessionList, SessionCard, SessionMain, SessionTitle, SessionMeta, SessionPill, SessionStatus,
  Toast, ToastIconBox, ToastBody, ToastTitle, ToastMsg, ToastClose,
} from './UsersPage.styles'

/* ── constants ── */
const MODULE_CONFIG = [
  {
    id: 'chats', label: 'Chat', note: '/admin/chat', isPage: true,
    dot: '#60a5fa', bg: 'rgba(59,130,246,0.12)', cl: '#93c5fd', br: 'rgba(59,130,246,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Mensajes' },
      { id: 'can_edit', label: 'Gestionar' },
      { id: 'can_delete', label: 'Archivar' },
    ],
  },
  {
    id: 'chats_balance', label: 'Balance', note: 'Saldo del cliente', isPage: false,
    dot: '#34d399', bg: 'rgba(52,211,153,0.10)', cl: '#6ee7b7', br: 'rgba(52,211,153,0.22)',
    actions: [
      { id: 'can_view', label: 'Consultar' },
      { id: 'can_create', label: 'Acreditar' },
      { id: 'can_edit', label: 'Debitar' },
      null,
    ],
  },
  {
    id: 'chats_movements', label: 'Movimientos', note: 'Depósitos en chat', isPage: false,
    dot: '#a78bfa', bg: 'rgba(139,92,246,0.10)', cl: '#c4b5fd', br: 'rgba(139,92,246,0.22)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      null,
      { id: 'can_edit', label: 'Aprobar' },
      { id: 'can_delete', label: 'Rechazar' },
    ],
  },
  {
    id: 'chats_withdrawals', label: 'Retiros', note: 'Solicitudes de retiro', isPage: false,
    dot: '#f472b6', bg: 'rgba(244,114,182,0.10)', cl: '#f9a8d4', br: 'rgba(244,114,182,0.22)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      null,
      { id: 'can_edit', label: 'Aprobar' },
      { id: 'can_delete', label: 'Rechazar' },
    ],
  },
  {
    id: 'clients', label: 'Clientes', note: '/admin/clientes', isPage: true,
    dot: '#22c55e', bg: 'rgba(34,197,94,0.12)', cl: '#4ade80', br: 'rgba(34,197,94,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Crear' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'reports', label: 'Reportes', note: '/admin/reportes', isPage: true,
    dot: '#fb923c', bg: 'rgba(251,146,60,0.10)', cl: '#fdba74', br: 'rgba(251,146,60,0.22)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      null, null, null,
    ],
  },
  {
    id: 'commands', label: 'Comandos', note: '/admin/comandos', isPage: true,
    dot: '#a78bfa', bg: 'rgba(139,92,246,0.12)', cl: '#c4b5fd', br: 'rgba(139,92,246,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Crear' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'push_notifications', label: 'Notificaciones', note: '/admin/notificaciones', isPage: true,
    dot: '#f472b6', bg: 'rgba(244,114,182,0.12)', cl: '#f9a8d4', br: 'rgba(244,114,182,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Enviar' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'modals', label: 'Modales', note: '/admin/modales', isPage: true,
    dot: '#38bdf8', bg: 'rgba(56,189,248,0.12)', cl: '#7dd3fc', br: 'rgba(56,189,248,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Crear' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'bot_builder', label: 'Bot Builder', note: '/admin/bot', isPage: true,
    dot: '#34d399', bg: 'rgba(52,211,153,0.12)', cl: '#6ee7b7', br: 'rgba(52,211,153,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Crear' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'settings', label: 'Ajustes', note: '/admin/ajustes', isPage: true,
    dot: '#94a3b8', bg: 'rgba(148,163,184,0.12)', cl: '#cbd5e1', br: 'rgba(148,163,184,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      null,
      { id: 'can_edit', label: 'Modificar' },
      null,
    ],
  },
  {
    id: 'users', label: 'Usuarios', note: '/admin/usuarios', isPage: true,
    dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', cl: '#fbbf24', br: 'rgba(245,158,11,0.24)',
    actions: [
      { id: 'can_view', label: 'Ver' },
      { id: 'can_create', label: 'Crear' },
      { id: 'can_edit', label: 'Editar' },
      { id: 'can_delete', label: 'Eliminar' },
    ],
  },
]

const PAGE_MODULES = MODULE_CONFIG.filter(m => m.isPage)

const ROWS_PER_PAGE = 8

const defaultPermissions = (role = 'cashier') => {
  const enabled = role === 'admin'
  return MODULE_CONFIG.reduce((acc, module) => {
    const enabledIds = new Set(module.actions.filter(Boolean).map(a => a.id))
    acc[module.id] = {
      can_view:   enabledIds.has('can_view')   ? enabled : false,
      can_create: enabledIds.has('can_create') ? enabled : false,
      can_edit:   enabledIds.has('can_edit')   ? enabled : false,
      can_delete: enabledIds.has('can_delete') ? enabled : false,
    }
    return acc
  }, {})
}

const normalizePermissions = (permissions, role = 'cashier') => {
  const fallback = defaultPermissions(role)
  return MODULE_CONFIG.reduce((acc, module) => {
    const source = permissions?.[module.id] || fallback[module.id]
    const enabledIds = new Set(module.actions.filter(Boolean).map(a => a.id))
    acc[module.id] = {
      can_view:   enabledIds.has('can_view')   ? Boolean(source?.can_view)   : false,
      can_create: enabledIds.has('can_create') ? Boolean(source?.can_create) : false,
      can_edit:   enabledIds.has('can_edit')   ? Boolean(source?.can_edit)   : false,
      can_delete: enabledIds.has('can_delete') ? Boolean(source?.can_delete) : false,
    }
    return acc
  }, {})
}

const formatTimeStr = (t) => {
  if (!t) return ''
  const parts = String(t).split(':')
  return `${(parts[0] || '00').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`
}

/* maps an API user to the component's shape */
const mapApiUser = (u) => ({
  id:            u.id,
  username:      u.username,
  full_name:     u.full_name || u.username,
  email:         u.email,
  role:          u.role,
  status:        Boolean(u.is_active),
  online:        Boolean(u.online),
  last_login_at: u.last_login_at,
  permissions:   normalizePermissions(u.permissions, u.role),
  access_start:  u.access_start ?? null,
  access_end:    u.access_end ?? null,
})

const initForm = (user = null) => ({
  full_name:      user?.full_name  ?? '',
  username:       user?.username   ?? '',
  email:          user?.email      ?? '',
  password:       '',
  role:           user?.role       ?? 'cashier',
  status:         user?.status     ?? true,
  permissions:    user ? normalizePermissions(user.permissions, user.role) : defaultPermissions('cashier'),
  timeRestricted: !!(user?.access_start && user?.access_end),
  access_start:   formatTimeStr(user?.access_start),
  access_end:     formatTimeStr(user?.access_end),
})

/* ── component ── */
const UsersPage = ({ onMenuOpen }) => {
  const { timezone }                   = useDateFormat()
  const { user: currentUser, setUser } = useAuth()
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [roleFilter, setRole]     = useState('all')
  const [page, setPage]           = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [form, setForm]           = useState(initForm())
  const [sessionsUser, setSessionsUser] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [alert, setAlert]         = useState(null)
  const [saving, setSaving]       = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ROWS_PER_PAGE,
    total: 0,
    totalPages: 1,
  })

  /* auto-dismiss toast */
  useEffect(() => {
    if (!alert) return
    const t = setTimeout(() => setAlert(null), 4500)
    return () => clearTimeout(t)
  }, [alert])

  const notify = (message, type = 'success') => setAlert({ message, type })

  /* ── load users from API ── */
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROWS_PER_PAGE),
        search: search.trim(),
        status: statusFilter,
        role: roleFilter,
      })
      const data = await api.get('/api/users?' + params.toString())
      setUsers((data.users || []).map(mapApiUser))
      setPagination(data.pagination || {
        page,
        limit: ROWS_PER_PAGE,
        total: data.users?.length || 0,
        totalPages: 1,
      })
    } catch (err) {
      notify(err.payload?.error || 'No se pudo cargar los usuarios', 'danger')
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, search, statusFilter])

  useEffect(() => {
    queueMicrotask(() => { loadUsers() })
  }, [loadUsers])

  /* ── filter & paginate ── */
  const totalPages = pagination.totalPages
  const safePage   = pagination.page
  const rows       = users

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  /* ── modal helpers ── */
  const openAdd  = ()     => { setEditUser(null); setForm(initForm());     setModalOpen(true) }
  const openEdit = (user) => { setEditUser(user); setForm(initForm(user)); setModalOpen(true) }
  const close    = ()     => { setModalOpen(false); setEditUser(null) }
  const closeSessions = () => { setSessionsUser(null); setSessions([]) }

  const setField    = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setRoleField = (role) => setForm(f => ({ ...f, role, permissions: defaultPermissions(role) }))
  const togglePerm  = (moduleId, actionId)  => setForm(f => ({
    ...f,
    permissions: {
      ...f.permissions,
      [moduleId]: {
        ...f.permissions[moduleId],
        [actionId]: !f.permissions[moduleId]?.[actionId],
      },
    },
  }))
  const toggleRestr = (id) => setForm(f => ({
    ...f,
    permissions: {
      ...f.permissions,
      [id]: {
        ...f.permissions[id],
        can_view: !f.permissions[id]?.can_view,
      },
    },
  }))

  const toggleTimeRestriction = () => setForm(f => {
    if (f.timeRestricted) {
      return { ...f, timeRestricted: false, access_start: '', access_end: '' }
    }
    return {
      ...f,
      timeRestricted: true,
      access_start: f.access_start || '09:00',
      access_end:   f.access_end   || '18:00',
    }
  })

  /* ── save (create or edit) ── */
  const handleSave = async () => {
    if (!form.full_name.trim() || !form.username.trim() || !form.email.trim()) {
      notify('Completa nombre completo, usuario y correo antes de continuar', 'danger')
      return
    }
    if (!editUser && (!form.password || form.password.length < 8)) {
      notify('La contraseña debe tener al menos 8 caracteres', 'danger')
      return
    }
    if (editUser && form.password && form.password.length < 8) {
      notify('La nueva contraseña debe tener al menos 8 caracteres', 'danger')
      return
    }
    if (form.timeRestricted && (!form.access_start || !form.access_end)) {
      notify('Configura la hora de inicio y de fin para la restricción horaria', 'danger')
      return
    }

    setSaving(true)
    try {
      const payload = {
        username:     form.username.trim(),
        full_name:    form.full_name.trim(),
        email:        form.email.trim(),
        role:         form.role,
        is_active:    form.status,
        permissions:  normalizePermissions(form.permissions, form.role),
        access_start: form.timeRestricted ? form.access_start : null,
        access_end:   form.timeRestricted ? form.access_end   : null,
      }
      if (!editUser) payload.password = form.password
      else if (form.password) payload.password = form.password

      if (editUser) {
        const response = await api.put('/api/users/' + editUser.id, payload)
        const updated = mapApiUser(response.user)
        setUsers(prev => prev.map(u => u.id === editUser.id ? updated : u))
        if (currentUser?.id === editUser.id) {
          setUser(response.user)
        }
        notify('Usuario actualizado correctamente', 'success')
      } else {
        const response = await api.post('/api/users', payload)
        const created = mapApiUser(response.user)
        setUsers(prev => [created, ...prev])
        setPage(1)
        notify('Usuario creado correctamente', 'success')
      }
      close()
    } catch (err) {
      notify(err.payload?.error || err.message || 'No se pudo guardar el usuario', 'danger')
    } finally {
      setSaving(false)
    }
  }

  /* ── delete ── */
  const handleDelete = async (id) => {
    try {
      await api.delete('/api/users/' + id)
      await loadUsers()
      notify('Usuario eliminado correctamente', 'success')
      close()
    } catch (err) {
      notify(err.payload?.error || 'No se pudo eliminar el usuario', 'danger')
    }
  }

  /* ── toggle active status (optimistic) ── */
  const toggleStatus = async (id) => {
    const target = users.find(u => u.id === id)
    if (!target) return
    const newStatus = !target.status
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u))
    try {
      await api.put('/api/users/' + id, { is_active: newStatus })
    } catch (err) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: !newStatus } : u))
      notify(err.payload?.error || 'No se pudo cambiar el estado', 'danger')
    }
  }

  const logoutUser = async (id) => {
    try {
      await api.post('/api/users/' + id + '/logout', {})
      setUsers(prev => prev.map(u => u.id === id ? { ...u, online: false } : u))
      notify('Sesiones cerradas correctamente', 'success')
    } catch (err) {
      notify(err.payload?.error || 'No se pudo cerrar la sesión', 'danger')
    }
  }

  const openSessions = async (user, options = {}) => {
    const nextUser = { ...user, online: options.online ?? user.online }
    setSessionsUser(nextUser)
    setSessions([])
    setSessionsLoading(true)
    try {
      const data = await api.get('/api/users/' + user.id + '/sessions')
      setSessions(data.sessions || [])
    } catch (err) {
      notify(err.payload?.error || 'No se pudieron cargar las sesiones', 'danger')
      closeSessions()
    } finally {
      setSessionsLoading(false)
    }
  }

  const formatDate = (value) => {
    if (!value) return 'Sin registro'
    return new Intl.DateTimeFormat('es', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      ...(timezone && { timeZone: timezone }),
    }).format(new Date(value))
  }

  const sessionDevice = (session) => {
    const type = session.device_type || 'unknown'
    if (type === 'desktop') return 'Escritorio'
    if (type === 'mobile') return 'Móvil'
    if (type === 'tablet') return 'Tablet'
    return 'Dispositivo'
  }

  const closeActiveSessionsFromModal = async () => {
    if (!sessionsUser) return
    await logoutUser(sessionsUser.id)
    await openSessions(sessionsUser, { online: false })
  }

  const pages = getPaginationItems({ currentPage: safePage, totalPages })
  const displayInitial = (u) => (u.full_name || u.username || '?')[0].toUpperCase()

  return (
    <PageWrap data-tour="users-page">
      <PageScroll>

        {/* ── header ── */}
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Usuarios</PageTitle>
              <PageSub>{pagination.total} usuario{pagination.total !== 1 ? 's' : ''} en el sistema</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" data-tour="users-add-btn" onClick={openAdd}>
            <AddIcon />
            Nuevo usuario
          </AddBtn>
        </PageHeader>

        {/* ── filters ── */}
        <FiltersBar data-tour="users-filters">
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={changeFilter(setSearch)}
            />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={changeFilter(setStatus)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </FilterSelect>
          <FilterSelect value={roleFilter} onChange={changeFilter(setRole)}>
            <option value="all">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cajero</option>
          </FilterSelect>
          <ResultCount>{pagination.total} resultado{pagination.total !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {/* ── table ── */}
        <TableCard data-tour="users-table">
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th $center>Online</Th>
                  <Th>Permisos</Th>
                  <Th>Restricciones</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <LoadingRow>
                    <LoadingCell colSpan={7}>Cargando usuarios...</LoadingCell>
                  </LoadingRow>
                ) : rows.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>No se encontraron usuarios</EmptyCell>
                  </EmptyRow>
                ) : rows.map(user => (
                  <Tr key={user.id}>

                    <Td>
                      <UserCell>
                        <UserAvatar>{displayInitial(user)}</UserAvatar>
                        <UserMeta>
                          <UserName>{user.full_name}</UserName>
                          <UserEmail>{user.email}</UserEmail>
                        </UserMeta>
                      </UserCell>
                    </Td>

                    <Td>
                      <RoleBadge $role={user.role}>
                        {user.role === 'admin' ? 'Admin' : 'Cajero'}
                      </RoleBadge>
                    </Td>

                    <Td>
                      <StatusBadge $on={user.status}>
                        {user.status ? 'Activo' : 'Inactivo'}
                      </StatusBadge>
                    </Td>

                    <Td $center>
                      <OnlineDot $on={user.online} />
                    </Td>

                    <Td>
                      <PermChips>
                        {PAGE_MODULES.filter(p => user.permissions[p.id]?.can_view).map(p => (
                          <PermChip key={p.id} $bg={p.bg} $cl={p.cl} $br={p.br}>{p.label}</PermChip>
                        ))}
                        {!PAGE_MODULES.some(p => user.permissions[p.id]?.can_view) && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>—</span>
                        )}
                      </PermChips>
                    </Td>

                    <Td>
                      <PermChips>
                        {user.access_start && user.access_end && (
                          <TimeBadge>{formatTimeStr(user.access_start)}–{formatTimeStr(user.access_end)}</TimeBadge>
                        )}
                        {PAGE_MODULES.filter(p => !user.permissions[p.id]?.can_view).map(cfg => (
                          <PermChip key={cfg.id} $bg="rgba(239,68,68,0.10)" $cl="#f87171" $br="rgba(239,68,68,0.22)">
                            {cfg.label}
                          </PermChip>
                        ))}
                        {!user.access_start && PAGE_MODULES.every(p => user.permissions[p.id]?.can_view) && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>Ninguna</span>
                        )}
                      </PermChips>
                    </Td>

                    <Td $center>
                      <ActionBtns>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(user)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn type="button" title="Ver sesiones" onClick={() => openSessions(user)}>
                          <DevicesOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn type="button" $v="warn" title="Cerrar sesión" disabled={!user.online} onClick={() => logoutUser(user.id)}>
                          <LogoutIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button"
                          $v="danger"
                          title={user.status ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleStatus(user.id)}
                        >
                          <BlockOutlinedIcon />
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
              {pagination.total === 0
                ? '0 usuarios'
                : `${(safePage - 1) * ROWS_PER_PAGE + 1}–${Math.min(safePage * ROWS_PER_PAGE, pagination.total)} de ${pagination.total}`
              }
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {pages.map(item => item.type === 'ellipsis' ? (
                <PaginBtn key={item.key} type="button" disabled>
                  ...
                </PaginBtn>
              ) : (
                <PaginBtn key={item.key} type="button" $active={item.page === safePage} onClick={() => setPage(item.page)}>
                  {item.page}
                </PaginBtn>
              ))}
              <PaginBtn type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>

      </PageScroll>

      {/* ═══════════════════ MODAL ═══════════════════ */}
      {modalOpen && (
        <Overlay onClick={close}>
          <ModalCard onClick={e => e.stopPropagation()}>

            <ModalHead>
              <div>
                <ModalTitle>{editUser ? 'Editar usuario' : 'Nuevo usuario'}</ModalTitle>
                <ModalSub>
                  {editUser
                    ? `Modificando datos de ${editUser.full_name}`
                    : 'Completa los datos del nuevo usuario'}
                </ModalSub>
              </div>
              <ModalClose type="button" onClick={close}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>

              {/* avatar preview */}
              <AvatarRow>
                <AvatarBox>
                  {(form.full_name || form.username || '?')[0].toUpperCase()}
                </AvatarBox>
                <AvatarHint>El avatar se genera automáticamente</AvatarHint>
              </AvatarRow>

              {/* info */}
              <div>
                <SecLabel>Información</SecLabel>
                <FormGrid style={{ marginTop: 14 }}>
                  <Field $full>
                    <FieldLabel>Nombre completo</FieldLabel>
                    <FieldInput
                      type="text" placeholder="Juan García"
                      value={form.full_name}
                      onChange={e => setField('full_name', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Usuario de acceso</FieldLabel>
                    <FieldInput
                      type="text" placeholder="juangarcia"
                      value={form.username}
                      onChange={e => setField('username', e.target.value)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Correo electrónico</FieldLabel>
                    <FieldInput
                      type="email" placeholder="juan@betchat.com"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      Contraseña&nbsp;
                      {editUser && (
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
                          dejar vacío para no cambiar
                        </span>
                      )}
                    </FieldLabel>
                    <FieldInput
                      type="password" placeholder="••••••••"
                      value={form.password}
                      onChange={e => setField('password', e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Rol</FieldLabel>
                    <FieldSelect value={form.role} onChange={e => setRoleField(e.target.value)}>
                      <option value="admin">Administrador</option>
                      <option value="cashier">Cajero</option>
                    </FieldSelect>
                  </Field>
                </FormGrid>
              </div>

              {/* status */}
              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>El usuario puede iniciar sesión</StatusRowSub>
                </StatusRowLabel>
                <Toggle $on={form.status} onClick={() => setField('status', !form.status)}>
                  <ToggleThumb $on={form.status} />
                </Toggle>
              </StatusRow>

              {/* time restriction */}
              <div>
                <SecLabel>Restricción horaria</SecLabel>
                <StatusRow style={{ marginTop: 14 }}>
                  <StatusRowLabel>
                    <StatusRowTitle>Restricción horaria</StatusRowTitle>
                    <StatusRowSub>
                      {form.timeRestricted
                        ? 'El acceso está limitado al horario configurado'
                        : 'Sin restricción, puede acceder en cualquier momento'}
                    </StatusRowSub>
                  </StatusRowLabel>
                  <Toggle $on={form.timeRestricted} onClick={toggleTimeRestriction}>
                    <ToggleThumb $on={form.timeRestricted} />
                  </Toggle>
                </StatusRow>
                {form.timeRestricted && (
                  <TimeGrid>
                    <Field>
                      <FieldLabel>Hora de inicio</FieldLabel>
                      <TimeInput
                        type="time"
                        value={form.access_start}
                        onChange={e => setField('access_start', e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Hora de fin</FieldLabel>
                      <TimeInput
                        type="time"
                        value={form.access_end}
                        onChange={e => setField('access_end', e.target.value)}
                      />
                    </Field>
                  </TimeGrid>
                )}
              </div>

              {/* permissions */}
              <div>
                <SecLabel>Permisos de módulos</SecLabel>
                <PermGrid style={{ marginTop: 14 }}>
                  {MODULE_CONFIG.map(p => (
                    <PermRow key={p.id} $sub={!p.isPage}>
                      <PermName>
                        <PermDot $cl={p.dot} />
                        <div>
                          <span>{p.label}</span>
                          {!p.isPage && <PermSub>{p.note}</PermSub>}
                        </div>
                      </PermName>
                      <PermActions>
                        {p.actions.map((action, idx) => action ? (
                          <PermAction key={action.id}>
                            <PermActionLabel>{action.label}</PermActionLabel>
                            <Toggle
                              $on={form.permissions[p.id]?.[action.id]}
                              onClick={() => togglePerm(p.id, action.id)}
                            >
                              <ToggleThumb $on={form.permissions[p.id]?.[action.id]} />
                            </Toggle>
                          </PermAction>
                        ) : (
                          <PermAction key={`null-${idx}`} $dim>
                            <PermActionLabel>—</PermActionLabel>
                            <Toggle $on={false}>
                              <ToggleThumb $on={false} />
                            </Toggle>
                          </PermAction>
                        ))}
                      </PermActions>
                    </PermRow>
                  ))}
                </PermGrid>
              </div>

              {/* page restrictions */}
              <div>
                <SecLabel>Acceso a páginas</SecLabel>
                <RestrList style={{ marginTop: 14 }}>
                  {PAGE_MODULES.map(pg => {
                    const blocked = !form.permissions[pg.id]?.can_view
                    return (
                      <RestrItem key={pg.id} type="button" $on={blocked} onClick={() => toggleRestr(pg.id)}>
                        <RestrCheck $on={blocked}>
                          {blocked && <CloseIcon />}
                        </RestrCheck>
                        <RestrLabel $on={blocked}>{pg.label}</RestrLabel>
                        <RestrNote>{pg.note}</RestrNote>
                      </RestrItem>
                    )
                  })}
                </RestrList>
              </div>

            </ModalBody>

            <ModalFoot>
              <FootLeft>
                {editUser && (
                  <ModalBtn type="button" $v="danger" onClick={() => handleDelete(editUser.id)}>
                    Eliminar
                  </ModalBtn>
                )}
              </FootLeft>
              <FootRight>
                <ModalBtn type="button" onClick={close} disabled={saving}>Cancelar</ModalBtn>
                <ModalBtn type="button" $v="primary" onClick={handleSave} disabled={saving}>
                  {saving ? (editUser ? 'Guardando...' : 'Creando...') : (editUser ? 'Guardar cambios' : 'Crear usuario')}
                </ModalBtn>
              </FootRight>
            </ModalFoot>

          </ModalCard>
        </Overlay>
      )}

      {/* ── toast notification ── */}
      {sessionsUser && (
        <Overlay onClick={closeSessions}>
          <ModalCard $wide onClick={e => e.stopPropagation()}>
            <ModalHead>
              <div>
                <ModalTitle>Sesiones de {sessionsUser.full_name}</ModalTitle>
                <ModalSub>{sessionsUser.email}</ModalSub>
              </div>
              <ModalClose type="button" onClick={closeSessions}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              {sessionsLoading ? (
                <EmptyCell as="div">Cargando sesiones...</EmptyCell>
              ) : sessions.length === 0 ? (
                <EmptyCell as="div">No hay sesiones registradas</EmptyCell>
              ) : (
                <SessionList>
                  {sessions.map(session => (
                    <SessionCard key={session.id}>
                      <SessionMain>
                        <SessionTitle>
                          <DevicesOutlinedIcon style={{ fontSize: 17 }} />
                          {sessionDevice(session)}
                        </SessionTitle>
                        <SessionMeta>
                          <SessionPill>IP: {session.ip_address || 'No disponible'}</SessionPill>
                          <SessionPill>Navegador: {session.browser || 'No disponible'}</SessionPill>
                          <SessionPill>SO: {session.os || 'No disponible'}</SessionPill>
                          <SessionPill>Inicio: {formatDate(session.created_at)}</SessionPill>
                          <SessionPill>Última actividad: {formatDate(session.last_activity_at)}</SessionPill>
                          <SessionPill>Expira: {formatDate(session.expires_at)}</SessionPill>
                        </SessionMeta>
                      </SessionMain>
                      <SessionStatus $active={session.is_active}>
                        {session.is_active ? 'Activa' : 'Cerrada'}
                      </SessionStatus>
                    </SessionCard>
                  ))}
                </SessionList>
              )}
            </ModalBody>

            <ModalFoot>
              <FootLeft />
              <FootRight>
                <ModalBtn type="button" onClick={closeSessions}>Cerrar</ModalBtn>
                <ModalBtn
                  type="button"
                  $v="danger"
                  disabled={!sessionsUser.online}
                  onClick={closeActiveSessionsFromModal}
                >
                  Cerrar sesiones activas
                </ModalBtn>
              </FootRight>
            </ModalFoot>
          </ModalCard>
        </Overlay>
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

export default UsersPage
