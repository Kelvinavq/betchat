import { useState, useMemo } from 'react'
import SearchIcon        from '@mui/icons-material/Search'
import AddIcon           from '@mui/icons-material/Add'
import EditOutlinedIcon  from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon         from '@mui/icons-material/Close'
import MenuIcon          from '@mui/icons-material/Menu'
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon  from '@mui/icons-material/ChevronRight'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PowerSettingsNewIcon       from '@mui/icons-material/PowerSettingsNew'
import VisibilityOutlinedIcon     from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon  from '@mui/icons-material/VisibilityOffOutlined'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  BankTabsBar, BankTab, BankTabDot, BankTabCount,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  AccountCell, AccountAvatar, AccountMeta, AccountName, AccountEmail,
  MonoText, MonoLabel,
  StatusBadge, TokenBadge, ExpiredBadge,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  EmptyRow, EmptyCell,
  Overlay, ModalCard, ModalHead, ModalBankBadge, ModalHeadText, ModalTitle, ModalSub, ModalClose,
  ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  SecLabel, FormGrid, Field, FieldLabel, FieldInput, FieldSelect, InputWrap, InputSuffix,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
} from './BanksPage.styles'

/* ── bank type config ── */
const BANKS = [
  {
    id: 'hgcash',
    label: 'HGCash',
    color: '#818cf8', bg: 'rgba(99,102,241,0.12)', br: 'rgba(99,102,241,0.28)',
    avatarBg: 'linear-gradient(135deg,#4f46e5,#6366f1)',
    avatarBr: 'rgba(99,102,241,0.35)',
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    color: '#38bdf8', bg: 'rgba(14,165,233,0.12)', br: 'rgba(14,165,233,0.28)',
    avatarBg: 'linear-gradient(135deg,#0284c7,#38bdf8)',
    avatarBr: 'rgba(14,165,233,0.35)',
  },
  {
    id: 'telepagos',
    label: 'Telepagos',
    color: '#fb923c', bg: 'rgba(249,115,22,0.12)', br: 'rgba(249,115,22,0.28)',
    avatarBg: 'linear-gradient(135deg,#ea580c,#f97316)',
    avatarBr: 'rgba(249,115,22,0.35)',
  },
  {
    id: 'manual',
    label: 'Cuentas Manuales',
    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', br: 'rgba(148,163,184,0.22)',
    avatarBg: 'linear-gradient(135deg,#475569,#64748b)',
    avatarBr: 'rgba(148,163,184,0.28)',
  },
]

/* ── mock data ── */
const INIT_HGCASH = [
  { id: 1, nombre_titular: 'Juan García',   email: 'juan@gmail.com',   cuit: '20-12345678-9', alias: 'juangarcia.hg',  cbu: '0070999120000012345678', estatus: 'activa',   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', cookie: 'session=abc', cookie_expires_at: '2026-08-01', webhook_secret: 'whsec_abc123' },
  { id: 2, nombre_titular: 'María López',   email: 'maria@gmail.com',  cuit: '27-98765432-1', alias: 'marialopez.hg',  cbu: '0070999120000098765432', estatus: 'inactiva', token: null,  cookie: null, cookie_expires_at: null, webhook_secret: null },
  { id: 3, nombre_titular: 'Pedro Torres',  email: 'pedro@gmail.com',  cuit: '20-11223344-5', alias: 'pedrotorres.hg', cbu: '0070999120000011223344', estatus: 'activa',   token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9', cookie: 'sess=xyz', cookie_expires_at: '2026-05-01', webhook_secret: 'whsec_xyz789' },
]
const INIT_MP = [
  { id: 1, nombre_titular: 'Carlos Ruiz',   alias: 'carlosruiz.mp',  cbu: 'CBU0001234567890123456', estatus: 'activa',   token: 'APP_USR-1234567890abcdef-123456-abcdef1234567890' },
  { id: 2, nombre_titular: 'Sofía Martínez',alias: 'sofiamtz.mp',   cbu: 'CBU0009876543210987654', estatus: 'inactiva', token: 'APP_USR-9876543210abcdef-654321-fedcba9876543210' },
]
const INIT_TELEPAGOS = [
  { id: 1, nombre_titular: 'Diego Herrera', email: 'diego@gmail.com', cuit: '20-55443322-1', alias: 'diegoherrera.tp', cbu: '0070999120000055443322', estatus: 'activa',   token: 'tp_live_abc123xyz789', expires_at: '2026-07-15' },
  { id: 2, nombre_titular: 'Valentina Cruz',email: 'vale@gmail.com',  cuit: '27-99887766-5', alias: 'valecruz.tp',     cbu: '0070999120000099887766', estatus: 'inactiva', token: null, expires_at: null },
]
const INIT_MANUAL = [
  { id: 1, nombre_titular: 'Luis Méndez',   email: 'luis@gmail.com',  cuit: '20-33445566-7', alias: 'luismendez',    cbu: '0070999120000033445566', estatus: 'activa' },
  { id: 2, nombre_titular: 'Ana Ramos',     email: 'ana@gmail.com',   cuit: '27-66554433-2', alias: 'anaramos',      cbu: '0070999120000066554433', estatus: 'activa' },
  { id: 3, nombre_titular: 'Marcos Vera',   email: 'marcos@gmail.com',cuit: '20-77889900-4', alias: 'marcosvera',    cbu: '0070999120000077889900', estatus: 'inactiva' },
]

/* ── helpers ── */
const ROWS = 8
const maskCBU   = (v) => v ? `${v.slice(0,8)}···${v.slice(-4)}` : '—'
const maskToken = (v) => v ? `${v.slice(0,10)}···${v.slice(-4)}` : '—'
const isExpired = (d) => d && new Date(d) < new Date()
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : null

const initForm = (bank, account = null) => {
  if (bank === 'hgcash')     return { nombre_titular: account?.nombre_titular ?? '', email: account?.email ?? '', password: '', cuit: account?.cuit ?? '', alias: account?.alias ?? '', cbu: account?.cbu ?? '', webhook_secret: account?.webhook_secret ?? '', estatus: account?.estatus ?? 'activa' }
  if (bank === 'mercadopago') return { nombre_titular: account?.nombre_titular ?? '', token: account?.token ?? '', alias: account?.alias ?? '', cbu: account?.cbu ?? '', estatus: account?.estatus ?? 'activa' }
  if (bank === 'telepagos')   return { nombre_titular: account?.nombre_titular ?? '', email: account?.email ?? '', password: '', cuit: account?.cuit ?? '', alias: account?.alias ?? '', cbu: account?.cbu ?? '', estatus: account?.estatus ?? 'activa' }
  /* manual */                return { nombre_titular: account?.nombre_titular ?? '', email: account?.email ?? '', cuit: account?.cuit ?? '', alias: account?.alias ?? '', cbu: account?.cbu ?? '', estatus: account?.estatus ?? 'activa' }
}

/* ── component ── */
const BanksPage = ({ onMenuOpen }) => {
  const [activeBank, setActiveBank] = useState('hgcash')
  const [search,      setSearch]    = useState('')
  const [statusFilter,setStatus]    = useState('all')
  const [page,        setPage]      = useState(1)
  const [modalOpen,   setModal]     = useState(false)
  const [editAcc,     setEditAcc]   = useState(null)
  const [form,        setForm]      = useState({})
  const [showPw,      setShowPw]    = useState({})

  const [hgcash,     setHgcash]     = useState(INIT_HGCASH)
  const [mp,         setMp]         = useState(INIT_MP)
  const [telepagos,  setTelepagos]  = useState(INIT_TELEPAGOS)
  const [manual,     setManual]     = useState(INIT_MANUAL)

  /* data selectors */
  const dataMap = { hgcash, mercadopago: mp, telepagos, manual }
  const setMap  = { hgcash: setHgcash, mercadopago: setMp, telepagos: setTelepagos, manual: setManual }
  const rows    = dataMap[activeBank]
  const setRows = setMap[activeBank]
  const bankCfg = BANKS.find(b => b.id === activeBank)

  /* filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(a => {
      const matchQ = !q
        || a.nombre_titular?.toLowerCase().includes(q)
        || a.email?.toLowerCase().includes(q)
        || a.alias?.toLowerCase().includes(q)
        || a.cbu?.toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || a.estatus === statusFilter
      return matchQ && matchS
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * ROWS, safePage * ROWS)

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  /* modal */
  const openAdd  = ()    => { setEditAcc(null); setForm(initForm(activeBank)); setShowPw({}); setModal(true) }
  const openEdit = (acc) => { setEditAcc(acc);  setForm(initForm(activeBank, acc)); setShowPw({}); setModal(true) }
  const close    = ()    => setModal(false)

  const setField  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const togglePw  = (k)    => setShowPw(p => ({ ...p, [k]: !p[k] }))

  const handleSave = () => {
    if (!form.nombre_titular?.trim()) return
    if (editAcc) {
      setRows(prev => prev.map(a => a.id === editAcc.id ? { ...a, ...form } : a))
    } else {
      setRows(prev => [{ id: Date.now(), ...form }, ...prev])
    }
    close()
  }

  const deleteAcc  = (id) => setRows(prev => prev.filter(a => a.id !== id))
  const toggleStatus = (id) => setRows(prev => prev.map(a =>
    a.id === id ? { ...a, estatus: a.estatus === 'activa' ? 'inactiva' : 'activa' } : a
  ))

  /* switch bank tab */
  const switchBank = (id) => {
    setActiveBank(id)
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  const addLabel = {
    hgcash: 'Nueva HGCash', mercadopago: 'Nueva MP',
    telepagos: 'Nueva Telepagos', manual: 'Cuenta manual',
  }

  return (
    <PageWrap>
      <PageScroll>

        {/* ── header ── */}
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && <MenuBtn type="button" onClick={onMenuOpen}><MenuIcon /></MenuBtn>}
            <TitleBlock>
              <PageTitle>Cuentas bancarias</PageTitle>
              <PageSub>{hgcash.length + mp.length + telepagos.length + manual.length} cuentas en el sistema</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openAdd}>
            <AddIcon />{addLabel[activeBank]}
          </AddBtn>
        </PageHeader>

        {/* ── bank type tabs ── */}
        <BankTabsBar>
          {BANKS.map(b => {
            const count = dataMap[b.id].length
            const isActive = activeBank === b.id
            return (
              <BankTab
                key={b.id} type="button"
                $active={isActive} $color={b.color} $bg={b.bg} $br={b.br}
                onClick={() => switchBank(b.id)}
              >
                <BankTabDot $color={b.color} $active={isActive} />
                {b.label}
                <BankTabCount $active={isActive} $color={b.color} $bg={b.bg} $br={b.br}>
                  {count}
                </BankTabCount>
              </BankTab>
            )
          })}
        </BankTabsBar>

        {/* ── filters ── */}
        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              type="text" placeholder="Buscar cuenta..."
              value={search} onChange={changeFilter(setSearch)}
            />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={changeFilter(setStatus)}>
            <option value="all">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </FilterSelect>
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {/* ── table ── */}
        <TableCard key={activeBank}>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Titular</Th>
                  {activeBank !== 'mercadopago' && <Th>CUIT</Th>}
                  <Th>Alias / CBU</Th>
                  {activeBank === 'mercadopago' && <Th>Token</Th>}
                  {activeBank === 'hgcash'      && <Th>Cookie / Webhook</Th>}
                  {activeBank === 'telepagos'   && <Th>Token / Vence</Th>}
                  <Th $center>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {pageRows.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>No se encontraron cuentas</EmptyCell>
                  </EmptyRow>
                ) : pageRows.map(acc => (
                  <Tr key={acc.id}>

                    {/* titular */}
                    <Td>
                      <AccountCell>
                        <AccountAvatar $bg={bankCfg.avatarBg} $br={bankCfg.avatarBr}>
                          {acc.nombre_titular[0].toUpperCase()}
                        </AccountAvatar>
                        <AccountMeta>
                          <AccountName>{acc.nombre_titular}</AccountName>
                          {acc.email && <AccountEmail>{acc.email}</AccountEmail>}
                        </AccountMeta>
                      </AccountCell>
                    </Td>

                    {/* cuit */}
                    {activeBank !== 'mercadopago' && (
                      <Td><MonoText>{acc.cuit ?? '—'}</MonoText></Td>
                    )}

                    {/* alias / cbu */}
                    <Td>
                      <AccountName style={{ fontSize: 12.5 }}>{acc.alias}</AccountName>
                      <MonoLabel>{maskCBU(acc.cbu)}</MonoLabel>
                    </Td>

                    {/* mp token */}
                    {activeBank === 'mercadopago' && (
                      <Td>
                        <MonoText>{maskToken(acc.token)}</MonoText>
                        <div style={{ marginTop: 4 }}>
                          {acc.token ? <TokenBadge $ok>Activo</TokenBadge> : <TokenBadge>Sin token</TokenBadge>}
                        </div>
                      </Td>
                    )}

                    {/* hgcash cookie/webhook */}
                    {activeBank === 'hgcash' && (
                      <Td>
                        {acc.cookie_expires_at ? (
                          isExpired(acc.cookie_expires_at)
                            ? <ExpiredBadge>Cookie expirada</ExpiredBadge>
                            : <TokenBadge $ok>Cookie activa</TokenBadge>
                        ) : <TokenBadge>Sin cookie</TokenBadge>}
                        {acc.webhook_secret && (
                          <div style={{ marginTop: 4 }}>
                            <TokenBadge $ok>Webhook ✓</TokenBadge>
                          </div>
                        )}
                      </Td>
                    )}

                    {/* telepagos token/expiry */}
                    {activeBank === 'telepagos' && (
                      <Td>
                        {acc.token
                          ? <MonoText style={{ fontSize: 11 }}>{maskToken(acc.token)}</MonoText>
                          : <MonoText>—</MonoText>}
                        {acc.expires_at && (
                          <div style={{ marginTop: 4 }}>
                            {isExpired(acc.expires_at)
                              ? <ExpiredBadge>Vencido {fmtDate(acc.expires_at)}</ExpiredBadge>
                              : <TokenBadge $ok>Vence {fmtDate(acc.expires_at)}</TokenBadge>}
                          </div>
                        )}
                      </Td>
                    )}

                    {/* estado */}
                    <Td $center>
                      <StatusBadge $on={acc.estatus === 'activa'}>
                        {acc.estatus === 'activa' ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </Td>

                    {/* acciones */}
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(acc)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button"
                          $v={acc.estatus === 'activa' ? 'danger' : 'success'}
                          title={acc.estatus === 'activa' ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleStatus(acc.id)}
                        >
                          <PowerSettingsNewIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button" $v="danger" title="Eliminar"
                          onClick={() => deleteAcc(acc.id)}
                        >
                          <DeleteOutlineIcon />
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
              {filtered.length === 0 ? '0 cuentas'
                : `${(safePage-1)*ROWS+1}–${Math.min(safePage*ROWS,filtered.length)} de ${filtered.length}`}
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {Array.from({ length: totalPages }, (_,i) => i+1).map(p => (
                <PaginBtn key={p} type="button" $active={p===safePage} onClick={() => setPage(p)}>{p}</PaginBtn>
              ))}
              <PaginBtn type="button" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>

      </PageScroll>

      {/* ════════════════ MODAL ════════════════ */}
      {modalOpen && (
        <Overlay onClick={close}>
          <ModalCard onClick={e => e.stopPropagation()}>

            <ModalHead>
              <ModalBankBadge $bg={bankCfg.bg} $br={bankCfg.br} $cl={bankCfg.color}>
                <AccountBalanceOutlinedIcon />
              </ModalBankBadge>
              <ModalHeadText>
                <ModalTitle>{editAcc ? `Editar cuenta ${bankCfg.label}` : `Nueva cuenta ${bankCfg.label}`}</ModalTitle>
                <ModalSub>{editAcc ? `Modificando datos de ${editAcc.nombre_titular}` : `Completa los datos de la nueva cuenta`}</ModalSub>
              </ModalHeadText>
              <ModalClose type="button" onClick={close}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>

              {/* ── campos comunes: titular ── */}
              <div>
                <SecLabel>Titular</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  <Field $full>
                    <FieldLabel>Nombre completo del titular</FieldLabel>
                    <FieldInput
                      type="text" placeholder="Juan García"
                      value={form.nombre_titular ?? ''}
                      onChange={e => setField('nombre_titular', e.target.value)}
                    />
                  </Field>
                  {form.email !== undefined && (
                    <Field $full>
                      <FieldLabel>Correo electrónico</FieldLabel>
                      <FieldInput
                        type="email" placeholder="cuenta@gmail.com"
                        value={form.email ?? ''}
                        onChange={e => setField('email', e.target.value)}
                      />
                    </Field>
                  )}
                  {form.password !== undefined && (
                    <Field $full>
                      <FieldLabel>
                        Contraseña&nbsp;
                        {editAcc && <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, fontSize:10, color:'rgba(255,255,255,0.22)' }}>dejar vacío para no cambiar</span>}
                      </FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.pw ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={form.password ?? ''}
                          onChange={e => setField('password', e.target.value)}
                          autoComplete="new-password"
                          style={{ paddingRight: 40 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('pw')} tabIndex={-1}>
                          {showPw.pw ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  )}
                </FormGrid>
              </div>

              {/* ── datos bancarios ── */}
              <div>
                <SecLabel>Datos bancarios</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  {form.cuit !== undefined && (
                    <Field>
                      <FieldLabel>CUIT</FieldLabel>
                      <FieldInput
                        type="text" placeholder="20-12345678-9"
                        value={form.cuit ?? ''}
                        onChange={e => setField('cuit', e.target.value)}
                        $mono
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Alias</FieldLabel>
                    <FieldInput
                      type="text" placeholder="alias.banco"
                      value={form.alias ?? ''}
                      onChange={e => setField('alias', e.target.value)}
                      $mono
                    />
                  </Field>
                  <Field $full={form.cuit === undefined}>
                    <FieldLabel>CBU</FieldLabel>
                    <FieldInput
                      type="text" placeholder="0070999120000012345678"
                      value={form.cbu ?? ''}
                      onChange={e => setField('cbu', e.target.value)}
                      $mono
                    />
                  </Field>
                </FormGrid>
              </div>

              {/* ── token (MP y Telepagos) ── */}
              {form.token !== undefined && (
                <div>
                  <SecLabel>Credenciales API</SecLabel>
                  <FormGrid style={{ marginTop: 12 }}>
                    <Field $full>
                      <FieldLabel>
                        {activeBank === 'mercadopago' ? 'Token de acceso (APP_USR-...)' : 'Token de autenticación'}
                      </FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.token ? 'text' : 'password'}
                          placeholder={activeBank === 'mercadopago' ? 'APP_USR-...' : 'tp_live_...'}
                          value={form.token ?? ''}
                          onChange={e => setField('token', e.target.value)}
                          autoComplete="off"
                          style={{ paddingRight: 40, fontFamily: "'Courier New', monospace", fontSize: 12 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('token')} tabIndex={-1}>
                          {showPw.token ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  </FormGrid>
                </div>
              )}

              {/* ── webhook secret (HGCash) ── */}
              {form.webhook_secret !== undefined && (
                <div>
                  <SecLabel>Webhook</SecLabel>
                  <FormGrid style={{ marginTop: 12 }}>
                    <Field $full>
                      <FieldLabel>Webhook Secret</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.wh ? 'text' : 'password'}
                          placeholder="whsec_..."
                          value={form.webhook_secret ?? ''}
                          onChange={e => setField('webhook_secret', e.target.value)}
                          autoComplete="off"
                          style={{ paddingRight: 40, fontFamily: "'Courier New', monospace", fontSize: 12 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('wh')} tabIndex={-1}>
                          {showPw.wh ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  </FormGrid>
                </div>
              )}

              {/* ── estado ── */}
              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>La cuenta puede operar y recibir transacciones</StatusRowSub>
                </StatusRowLabel>
                <Toggle $on={form.estatus === 'activa'} onClick={() => setField('estatus', form.estatus === 'activa' ? 'inactiva' : 'activa')}>
                  <ToggleThumb $on={form.estatus === 'activa'} />
                </Toggle>
              </StatusRow>

            </ModalBody>

            <ModalFoot>
              <FootLeft>
                {editAcc && (
                  <ModalBtn type="button" $v="danger" onClick={() => { deleteAcc(editAcc.id); close() }}>
                    Eliminar
                  </ModalBtn>
                )}
              </FootLeft>
              <FootRight>
                <ModalBtn type="button" onClick={close}>Cancelar</ModalBtn>
                <ModalBtn type="button" $v="primary" onClick={handleSave}>
                  {editAcc ? 'Guardar cambios' : 'Crear cuenta'}
                </ModalBtn>
              </FootRight>
            </ModalFoot>

          </ModalCard>
        </Overlay>
      )}
    </PageWrap>
  )
}

export default BanksPage
