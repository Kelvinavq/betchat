import { useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
  EmptyRow, EmptyCell,
  Overlay, ModalCard, ModalHead, ModalTitle, ModalSub, ModalClose, ModalBody,
  AvatarRow, AvatarBox, AvatarHint,
  SecLabel,
  FormGrid, Field, FieldLabel, FieldInput, FieldSelect,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  PermGrid, PermRow, PermName, PermDot,
  RestrList, RestrItem, RestrCheck, RestrLabel, RestrNote,
  ModalFoot, FootLeft, FootRight, ModalBtn,
} from './UsersPage.styles'

/* ── config ── */
const PERM_CONFIG = [
  { id: 'retiros',  label: 'Retiros',  dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', cl: '#fbbf24', br: 'rgba(245,158,11,0.24)' },
  { id: 'cargas',   label: 'Cargas',   dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  cl: '#4ade80', br: 'rgba(34,197,94,0.24)'  },
  { id: 'cuponera', label: 'Cuponera', dot: '#a78bfa', bg: 'rgba(139,92,246,0.12)', cl: '#a78bfa', br: 'rgba(139,92,246,0.24)' },
  { id: 'soporte',  label: 'Soporte',  dot: '#60a5fa', bg: 'rgba(59,130,246,0.12)', cl: '#93c5fd', br: 'rgba(59,130,246,0.24)' },
]

const PAGE_CONFIG = [
  { id: 'chat',     label: 'Chat',     note: '/admin/chat' },
  { id: 'clientes', label: 'Clientes', note: '/admin/clientes' },
  { id: 'usuarios', label: 'Usuarios', note: '/admin/usuarios' },
]

const ROWS_PER_PAGE = 8

/* ── mock data ── */
const MOCK_USERS = [
  { id: 1,  username: 'Ana García',       email: 'ana@betchat.com',        role: 'admin',  status: true,  online: true,  perms: { retiros: true,  cargas: true,  cuponera: true,  soporte: true  }, restricted: [] },
  { id: 2,  username: 'Luis Mendoza',     email: 'luis@betchat.com',       role: 'cajero', status: true,  online: true,  perms: { retiros: true,  cargas: true,  cuponera: false, soporte: false }, restricted: ['usuarios'] },
  { id: 3,  username: 'Carla Ruiz',       email: 'carla@betchat.com',      role: 'cajero', status: true,  online: false, perms: { retiros: false, cargas: true,  cuponera: true,  soporte: true  }, restricted: [] },
  { id: 4,  username: 'Pedro Torres',     email: 'pedro@betchat.com',      role: 'admin',  status: true,  online: false, perms: { retiros: true,  cargas: true,  cuponera: true,  soporte: true  }, restricted: [] },
  { id: 5,  username: 'María López',      email: 'maria@betchat.com',      role: 'cajero', status: false, online: false, perms: { retiros: false, cargas: false, cuponera: false, soporte: true  }, restricted: ['clientes', 'usuarios'] },
  { id: 6,  username: 'Jorge Díaz',       email: 'jorge@betchat.com',      role: 'cajero', status: true,  online: true,  perms: { retiros: true,  cargas: false, cuponera: false, soporte: true  }, restricted: [] },
  { id: 7,  username: 'Sofía Martínez',   email: 'sofia@betchat.com',      role: 'admin',  status: true,  online: true,  perms: { retiros: true,  cargas: true,  cuponera: true,  soporte: true  }, restricted: [] },
  { id: 8,  username: 'Diego Herrera',    email: 'diego@betchat.com',      role: 'cajero', status: true,  online: false, perms: { retiros: false, cargas: true,  cuponera: true,  soporte: false }, restricted: ['usuarios'] },
  { id: 9,  username: 'Valentina Cruz',   email: 'valentina@betchat.com',  role: 'cajero', status: false, online: false, perms: { retiros: false, cargas: false, cuponera: false, soporte: false }, restricted: ['chat', 'clientes', 'usuarios'] },
  { id: 10, username: 'Mateo Flores',     email: 'mateo@betchat.com',      role: 'admin',  status: true,  online: true,  perms: { retiros: true,  cargas: true,  cuponera: false, soporte: true  }, restricted: [] },
  { id: 11, username: 'Isabella Vega',    email: 'isabella@betchat.com',   role: 'cajero', status: true,  online: true,  perms: { retiros: false, cargas: true,  cuponera: true,  soporte: true  }, restricted: [] },
  { id: 12, username: 'Sebastián Ríos',  email: 'sebastian@betchat.com',  role: 'cajero', status: false, online: false, perms: { retiros: false, cargas: false, cuponera: false, soporte: false }, restricted: ['clientes'] },
]

const initForm = (user = null) => ({
  username:   user?.username   ?? '',
  email:      user?.email      ?? '',
  password:   '',
  role:       user?.role       ?? 'cajero',
  status:     user?.status     ?? true,
  perms:      user ? { ...user.perms }      : { retiros: false, cargas: false, cuponera: false, soporte: false },
  restricted: user ? [...user.restricted]   : [],
})

/* ── component ── */
const UsersPage = ({ onMenuOpen }) => {
  const [users, setUsers]         = useState(MOCK_USERS)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [roleFilter, setRole]     = useState('all')
  const [page, setPage]           = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [form, setForm]           = useState(initForm())

  /* ── filter & paginate ── */
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.status : !u.status)
    const matchRole   = roleFilter   === 'all' || u.role === roleFilter
    return matchSearch && matchStatus && matchRole
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const rows       = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE)

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  /* ── modal helpers ── */
  const openAdd  = ()     => { setEditUser(null);  setForm(initForm());       setModalOpen(true) }
  const openEdit = (user) => { setEditUser(user);  setForm(initForm(user));   setModalOpen(true) }
  const close    = ()     => setModalOpen(false)

  const setField     = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const togglePerm   = (id)  => setForm(f => ({ ...f, perms: { ...f.perms, [id]: !f.perms[id] } }))
  const toggleRestr  = (id)  => setForm(f => ({
    ...f,
    restricted: f.restricted.includes(id)
      ? f.restricted.filter(r => r !== id)
      : [...f.restricted, id],
  }))

  const handleSave = () => {
    if (!form.username.trim() || !form.email.trim()) return
    if (editUser) {
      setUsers(prev => prev.map(u =>
        u.id === editUser.id
          ? { ...u, username: form.username, email: form.email, role: form.role, status: form.status, perms: form.perms, restricted: form.restricted }
          : u
      ))
    } else {
      setUsers(prev => [{
        id: Date.now(), username: form.username, email: form.email,
        role: form.role, status: form.status, online: false,
        perms: form.perms, restricted: form.restricted,
      }, ...prev])
    }
    close()
  }

  const deleteUser       = (id) => setUsers(prev => prev.filter(u => u.id !== id))
  const toggleStatus     = (id) => setUsers(prev => prev.map(u => u.id === id ? { ...u, status: !u.status } : u))

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <PageWrap>
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
              <PageSub>{users.length} usuarios en el sistema</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openAdd}>
            <AddIcon />
            Nuevo usuario
          </AddBtn>
        </PageHeader>

        {/* ── filters ── */}
        <FiltersBar>
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
            <option value="cajero">Cajero</option>
          </FilterSelect>
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {/* ── table ── */}
        <TableCard>
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
                {rows.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>No se encontraron usuarios</EmptyCell>
                  </EmptyRow>
                ) : rows.map(user => (
                  <Tr key={user.id}>

                    <Td>
                      <UserCell>
                        <UserAvatar>{user.username[0].toUpperCase()}</UserAvatar>
                        <UserMeta>
                          <UserName>{user.username}</UserName>
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
                        {PERM_CONFIG.filter(p => user.perms[p.id]).map(p => (
                          <PermChip key={p.id} $bg={p.bg} $cl={p.cl} $br={p.br}>{p.label}</PermChip>
                        ))}
                        {!PERM_CONFIG.some(p => user.perms[p.id]) && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>—</span>
                        )}
                      </PermChips>
                    </Td>

                    <Td>
                      {user.restricted.length === 0 ? (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>Ninguna</span>
                      ) : (
                        <PermChips>
                          {user.restricted.map(r => {
                            const cfg = PAGE_CONFIG.find(p => p.id === r)
                            return (
                              <PermChip key={r} $bg="rgba(239,68,68,0.10)" $cl="#f87171" $br="rgba(239,68,68,0.22)">
                                {cfg?.label ?? r}
                              </PermChip>
                            )
                          })}
                        </PermChips>
                      )}
                    </Td>

                    <Td $center>
                      <ActionBtns>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(user)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn type="button" $v="warn" title="Cerrar sesión" disabled={!user.online}>
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
              {filtered.length === 0
                ? '0 usuarios'
                : `${(safePage - 1) * ROWS_PER_PAGE + 1}–${Math.min(safePage * ROWS_PER_PAGE, filtered.length)} de ${filtered.length}`
              }
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {pages.map(p => (
                <PaginBtn key={p} type="button" $active={p === safePage} onClick={() => setPage(p)}>
                  {p}
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
                    ? `Modificando datos de ${editUser.username}`
                    : 'Completa los datos del nuevo usuario'}
                </ModalSub>
              </div>
              <ModalClose type="button" onClick={close}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>

              {/* avatar */}
              <AvatarRow>
                <AvatarBox>{form.username ? form.username[0].toUpperCase() : '?'}</AvatarBox>
                <AvatarHint>El avatar se genera automáticamente</AvatarHint>
              </AvatarRow>

              {/* info */}
              <div>
                <SecLabel>Información</SecLabel>
                <FormGrid style={{ marginTop: 14 }}>
                  <Field>
                    <FieldLabel>Nombre de usuario</FieldLabel>
                    <FieldInput
                      type="text" placeholder="Juan García"
                      value={form.username}
                      onChange={e => setField('username', e.target.value)}
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
                      {editUser && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>dejar vacío para no cambiar</span>}
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
                    <FieldSelect value={form.role} onChange={e => setField('role', e.target.value)}>
                      <option value="admin">Administrador</option>
                      <option value="cajero">Cajero</option>
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

              {/* permissions */}
              <div>
                <SecLabel>Permisos de módulos</SecLabel>
                <PermGrid style={{ marginTop: 14 }}>
                  {PERM_CONFIG.map(p => (
                    <PermRow key={p.id} onClick={() => togglePerm(p.id)}>
                      <PermName>
                        <PermDot $cl={p.dot} />
                        {p.label}
                      </PermName>
                      <Toggle
                        $on={form.perms[p.id]}
                        onClick={e => { e.stopPropagation(); togglePerm(p.id) }}
                      >
                        <ToggleThumb $on={form.perms[p.id]} />
                      </Toggle>
                    </PermRow>
                  ))}
                </PermGrid>
              </div>

              {/* page restrictions */}
              <div>
                <SecLabel>Restricciones de páginas</SecLabel>
                <RestrList style={{ marginTop: 14 }}>
                  {PAGE_CONFIG.map(pg => {
                    const blocked = form.restricted.includes(pg.id)
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
                  <ModalBtn type="button" $v="danger" onClick={() => { deleteUser(editUser.id); close() }}>
                    Eliminar
                  </ModalBtn>
                )}
              </FootLeft>
              <FootRight>
                <ModalBtn type="button" onClick={close}>Cancelar</ModalBtn>
                <ModalBtn type="button" $v="primary" onClick={handleSave}>
                  {editUser ? 'Guardar cambios' : 'Crear usuario'}
                </ModalBtn>
              </FootRight>
            </ModalFoot>

          </ModalCard>
        </Overlay>
      )}
    </PageWrap>
  )
}

export default UsersPage
