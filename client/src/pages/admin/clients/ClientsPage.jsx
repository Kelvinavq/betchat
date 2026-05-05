import { useState, useRef, useMemo } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
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
} from './ClientsPage.styles'

const PER_PAGE = 10

const INITIAL_CLIENTS = [
  { id: 1,  username: 'carlos_gamez',  regDate: '15/01/2024', externalId: 'GX-10041', cuitCuil: '20-35471823-4', active: true,  online: true  },
  { id: 2,  username: 'martina_j',     regDate: '22/01/2024', externalId: 'GX-10098', cuitCuil: '27-28739021-3', active: true,  online: false },
  { id: 3,  username: 'pablobet99',    regDate: '03/02/2024', externalId: 'GX-10157', cuitCuil: '20-42187364-9', active: true,  online: true  },
  { id: 4,  username: 'lucia_r',       regDate: '11/02/2024', externalId: 'GX-10203', cuitCuil: '27-31094827-6', active: false, online: false },
  { id: 5,  username: 'diego_slots',   regDate: '28/02/2024', externalId: 'GX-10284', cuitCuil: '20-38762190-1', active: true,  online: false },
  { id: 6,  username: 'valeria_bet',   regDate: '05/03/2024', externalId: 'GX-10312', cuitCuil: '27-40391872-5', active: true,  online: true  },
  { id: 7,  username: 'juancruz_m',    regDate: '19/03/2024', externalId: 'GX-10398', cuitCuil: '20-29374851-2', active: true,  online: false },
  { id: 8,  username: 'florencia_g',   regDate: '02/04/2024', externalId: 'GX-10441', cuitCuil: '27-36582041-8', active: false, online: false },
  { id: 9,  username: 'matias_poker',  regDate: '14/04/2024', externalId: 'GX-10509', cuitCuil: '20-44129873-7', active: true,  online: true  },
  { id: 10, username: 'camila_w',      regDate: '27/04/2024', externalId: 'GX-10567', cuitCuil: '27-32198476-4', active: true,  online: false },
  { id: 11, username: 'rodrigo_vip',   regDate: '08/05/2024', externalId: 'GX-10621', cuitCuil: '20-37841029-3', active: true,  online: false },
  { id: 12, username: 'sofia_plays',   regDate: '21/05/2024', externalId: 'GX-10688', cuitCuil: '27-43920157-6', active: false, online: false },
  { id: 13, username: 'nicolas_bet',   regDate: '04/06/2024', externalId: 'GX-10744', cuitCuil: '20-31728490-5', active: true,  online: true  },
  { id: 14, username: 'agustina_r',    regDate: '17/06/2024', externalId: 'GX-10812', cuitCuil: '27-39102874-1', active: true,  online: false },
  { id: 15, username: 'hernando_play', regDate: '30/06/2024', externalId: 'GX-10879', cuitCuil: '20-45678321-9', active: true,  online: false },
  { id: 16, username: 'rocio_gamer',   regDate: '12/07/2024', externalId: 'GX-10933', cuitCuil: '27-34819062-7', active: true,  online: true  },
  { id: 17, username: 'leandro_mx',    regDate: '25/07/2024', externalId: 'GX-10997', cuitCuil: '20-40237185-8', active: false, online: false },
  { id: 18, username: 'melisa_lucky',  regDate: '08/08/2024', externalId: 'GX-11054', cuitCuil: '27-28901364-2', active: true,  online: false },
  { id: 19, username: 'tomas_ace',     regDate: '21/08/2024', externalId: 'GX-11118', cuitCuil: '20-46103827-5', active: true,  online: false },
  { id: 20, username: 'ana_diamante',  regDate: '03/09/2024', externalId: 'GX-11172', cuitCuil: '27-37290148-3', active: true,  online: true  },
]

const todayStr = () =>
  new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/* ── edit / add modal ── */
const ClientModal = ({ mode, client, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(() =>
    mode === 'edit' && client
      ? { username: client.username, externalId: client.externalId, cuitCuil: client.cuitCuil, regDate: client.regDate, active: client.active, password: '' }
      : { username: '', externalId: '', cuitCuil: '', regDate: todayStr(), active: true, password: '' }
  )
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const avatarChar = form.username.trim() ? form.username.trim()[0].toUpperCase() : '?'

  return (
    <Overlay onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>

        <ModalHead>
          <div>
            <ModalTitle>{mode === 'add' ? 'Nuevo cliente' : 'Editar cliente'}</ModalTitle>
            <ModalSub>
              {mode === 'add' ? 'Registrar nuevo cliente en el sistema' : `Modificando a ${client.username}`}
            </ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>

          <AvatarRow>
            <AvatarBox>{avatarChar}</AvatarBox>
            <AvatarHint>Avatar generado automáticamente</AvatarHint>
          </AvatarRow>

          <div>
            <SecLabel>Datos del cliente</SecLabel>
            <FormGrid style={{ marginTop: 14 }}>
              <Field $full>
                <FieldLabel>Nombre de usuario</FieldLabel>
                <FieldInput
                  placeholder="usuario123"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>ID Externo (plataforma)</FieldLabel>
                <FieldInput
                  placeholder="GX-00000"
                  value={form.externalId}
                  onChange={e => set('externalId', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>CUIT / CUIL</FieldLabel>
                <FieldInput
                  placeholder="XX-XXXXXXXX-X"
                  value={form.cuitCuil}
                  onChange={e => set('cuitCuil', e.target.value)}
                />
              </Field>
              <Field $full>
                <FieldLabel>Fecha de registro</FieldLabel>
                <FieldInput
                  placeholder="DD/MM/YYYY"
                  value={form.regDate}
                  onChange={e => set('regDate', e.target.value)}
                  disabled={mode === 'edit'}
                />
              </Field>
              {mode === 'add' && (
                <Field $full>
                  <FieldLabel>Contraseña</FieldLabel>
                  <FieldInput
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              )}
            </FormGrid>
          </div>

          <StatusRow>
            <StatusRowLabel>
              <StatusRowTitle>Cuenta activa</StatusRowTitle>
              <StatusRowSub>El cliente puede iniciar sesión en la plataforma</StatusRowSub>
            </StatusRowLabel>
            <Toggle $on={form.active} onClick={() => set('active', !form.active)}>
              <ToggleThumb $on={form.active} />
            </Toggle>
          </StatusRow>

        </ModalBody>

        <ModalFoot>
          <FootLeft>
            {mode === 'edit' && (
              <ModalBtn $v="danger" onClick={() => onDelete(client.id)}>Eliminar</ModalBtn>
            )}
          </FootLeft>
          <FootRight>
            <ModalBtn onClick={onClose}>Cancelar</ModalBtn>
            <ModalBtn $v="primary" onClick={() => onSave(form)}>
              {mode === 'add' ? 'Crear cliente' : 'Guardar cambios'}
            </ModalBtn>
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

/* ── main page ── */
const ClientsPage = ({ onMenuOpen }) => {
  const [clients, setClients]       = useState(INITIAL_CLIENTS)
  const [search, setSearch]         = useState('')
  const [statFilter, setStatFilter] = useState('all')
  const [page, setPage]             = useState(1)
  const [modal, setModal]           = useState(null)    // null | { mode, client }
  const [pwdModal, setPwdModal]     = useState(null)    // null | { client }
  const importRef                   = useRef(null)

  const filtered = useMemo(() => {
    let list = clients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.username.toLowerCase().includes(q) ||
        c.externalId.toLowerCase().includes(q) ||
        c.cuitCuil.replace(/-/g, '').includes(q.replace(/-/g, ''))
      )
    }
    if (statFilter === 'active')   list = list.filter(c => c.active)
    if (statFilter === 'inactive') list = list.filter(c => !c.active)
    return list
  }, [clients, search, statFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const sliced     = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const reset      = (fn) => { fn(); setPage(1) }

  /* ── csv export ── */
  const exportCSV = () => {
    const header = 'Usuario,Fecha de registro,ID Externo,CUIT/CUIL,Estado'
    const rows = filtered.map(c =>
      [c.username, c.regDate, c.externalId, c.cuitCuil, c.active ? 'Activo' : 'Inactivo'].join(',')
    )
    const content = '﻿' + [header, ...rows].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  /* ── crud ── */
  const handleSave = (form) => {
    if (modal.mode === 'add') {
      setClients(prev => [...prev, { ...form, id: Date.now(), online: false }])
    } else {
      setClients(prev => prev.map(c => c.id === modal.client.id ? { ...c, ...form } : c))
    }
    setModal(null)
  }

  const handleDelete = (id) => {
    setClients(prev => prev.filter(c => c.id !== id))
    setModal(null)
  }

  const handlePwdSave = (_newPwd) => {
    /* TODO: wire to API */
    setPwdModal(null)
  }

  const toggleStatus = (id) =>
    setClients(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c))

  const from = filtered.length > 0 ? (safePage - 1) * PER_PAGE + 1 : 0
  const to   = Math.min(safePage * PER_PAGE, filtered.length)
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)

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
              <PageSub>{clients.length} cliente{clients.length !== 1 && 's'} registrado{clients.length !== 1 && 's'}</PageSub>
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
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 && 's'}</ResultCount>
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
                {sliced.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>No se encontraron clientes</EmptyCell>
                  </EmptyRow>
                ) : sliced.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <ClientCell>
                        <ClientAvatar>{c.username[0].toUpperCase()}</ClientAvatar>
                        <ClientMeta>
                          <ClientName>{c.username}</ClientName>
                          <ClientId>{c.externalId}</ClientId>
                        </ClientMeta>
                      </ClientCell>
                    </Td>
                    <Td><MonoText>{c.regDate}</MonoText></Td>
                    <Td><MonoText>{c.externalId}</MonoText></Td>
                    <Td><MonoText>{c.cuitCuil}</MonoText></Td>
                    <Td>
                      <StatusBadge $on={c.active}>{c.active ? 'Activo' : 'Inactivo'}</StatusBadge>
                    </Td>
                    <Td $center><OnlineDot $on={c.online} /></Td>
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn
                          title="Editar cliente"
                          onClick={() => setModal({ mode: 'edit', client: c })}
                        >
                          <EditOutlinedIcon />
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
              {filtered.length > 0 ? `${from}–${to} de ${filtered.length}` : '0 resultados'}
            </PaginInfo>
            <PaginBtns>
              <PaginBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeftIcon />
              </PaginBtn>
              {pageNums.map(n => (
                <PaginBtn key={n} $active={n === safePage} onClick={() => setPage(n)}>
                  {n}
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
        />
      )}

      {pwdModal && (
        <PwdModal
          client={pwdModal.client}
          onClose={() => setPwdModal(null)}
          onSave={handlePwdSave}
        />
      )}
    </PageWrap>
  )
}

export default ClientsPage
