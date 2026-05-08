import { useCallback, useEffect, useState } from 'react'
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
import { api } from '../../../utils/api'
import { getPaginationItems } from '../../../utils/pagination'
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
  SecLabel, FormGrid, Field, FieldLabel, FieldInput, InputWrap, InputSuffix,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
} from './BanksPage.styles'

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

const ROWS = 8
const EMPTY_COUNTS = { hgcash: 0, mercadopago: 0, telepagos: 0, manual: 0 }

const maskCBU   = (v) => v ? `${v.slice(0, 8)}...${v.slice(-4)}` : '-'
const maskToken = (v) => v ? `${v.slice(0, 10)}...${v.slice(-4)}` : '-'
const isExpired = (d) => d && new Date(d) < new Date()
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : null

const initForm = (bank, account = null) => {
  if (bank === 'hgcash') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      email: account?.email ?? '',
      password: '',
      cuit: account?.cuit ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      webhook_enabled: Boolean(account?.webhook_enabled || account?.webhook_secret),
      webhook_secret: account?.webhook_secret ?? '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  if (bank === 'mercadopago') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      token: account?.token ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  if (bank === 'telepagos') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      email: account?.email ?? '',
      password: '',
      cuit: account?.cuit ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      token: account?.token ?? '',
      expires_at: account?.expires_at ?? '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  return {
    nombre_titular: account?.nombre_titular ?? '',
    email: account?.email ?? '',
    cuit: account?.cuit ?? '',
    alias: account?.alias ?? '',
    cbu: account?.cbu ?? '',
    estatus: account?.estatus ?? 'activa',
  }
}

const validateForm = (bank, form, editing) => {
  const required = {
    mercadopago: ['nombre_titular', 'alias', 'cbu', 'token'],
    manual: ['nombre_titular', 'alias', 'cbu'],
    hgcash: ['nombre_titular', 'email', 'cuit', 'alias', 'cbu'],
    telepagos: ['nombre_titular', 'email', 'cuit', 'alias', 'cbu', 'token', 'expires_at'],
  }[bank]

  const missing = required.filter(key => !String(form[key] ?? '').trim())
  if (missing.length) return 'Completa todos los campos obligatorios antes de guardar.'
  if ((bank === 'hgcash' || bank === 'telepagos') && !editing && !String(form.password ?? '').trim()) {
    return 'La contrasena es obligatoria para crear esta cuenta.'
  }
  if (bank === 'hgcash' && form.webhook_enabled && !String(form.webhook_secret ?? '').trim()) {
    return 'Agrega el webhook secret o desactiva el uso de webhook.'
  }
  return null
}

const BanksPage = ({ onMenuOpen }) => {
  const [activeBank, setActiveBank] = useState('hgcash')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [accounts, setAccounts] = useState([])
  const [counts, setCounts] = useState(EMPTY_COUNTS)
  const [pagination, setPagination] = useState({ page: 1, limit: ROWS, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModal] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [form, setForm] = useState({})
  const [showPw, setShowPw] = useState({})

  const bankCfg = BANKS.find(b => b.id === activeBank)
  const totalCount = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        provider: activeBank,
        page: String(page),
        limit: String(ROWS),
        status: statusFilter,
      })
      if (search.trim()) params.set('search', search.trim())

      const data = await api.get(`/api/bank-accounts?${params.toString()}`)
      setAccounts(data.accounts || [])
      setCounts({ ...EMPTY_COUNTS, ...(data.counts || {}) })
      setPagination(data.pagination || { page: 1, limit: ROWS, total: 0, totalPages: 1 })
    } catch (err) {
      window.alert(err.message || 'No se pudieron cargar las cuentas bancarias.')
    } finally {
      setLoading(false)
    }
  }, [activeBank, page, search, statusFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAccounts()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAccounts])

  const changeFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const openAdd = () => {
    setEditAcc(null)
    setForm(initForm(activeBank))
    setShowPw({})
    setModal(true)
  }

  const openEdit = (acc) => {
    setEditAcc(acc)
    setForm(initForm(activeBank, acc))
    setShowPw({})
    setModal(true)
  }

  const close = () => {
    if (!saving) setModal(false)
  }

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const togglePw = (key) => setShowPw(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    const error = validateForm(activeBank, form, Boolean(editAcc))
    if (error) {
      window.alert(error)
      return
    }

    setSaving(true)
    try {
      const payload = { provider: activeBank, ...form }
      if (editAcc) {
        await api.put(`/api/bank-accounts/${editAcc.id}`, payload)
      } else {
        await api.post('/api/bank-accounts', payload)
      }
      setModal(false)
      await loadAccounts()
    } catch (err) {
      window.alert(err.payload?.details?.[0] || err.message || 'No se pudo guardar la cuenta.')
    } finally {
      setSaving(false)
    }
  }

  const deleteAcc = async (id) => {
    if (!window.confirm('Eliminar esta cuenta bancaria?')) return
    try {
      await api.delete(`/api/bank-accounts/${id}`)
      setModal(false)
      await loadAccounts()
    } catch (err) {
      window.alert(err.message || 'No se pudo eliminar la cuenta.')
    }
  }

  const toggleStatus = async (acc) => {
    try {
      await api.put(`/api/bank-accounts/${acc.id}`, {
        ...acc,
        password: '',
        estatus: acc.estatus === 'activa' ? 'inactiva' : 'activa',
      })
      await loadAccounts()
    } catch (err) {
      window.alert(err.message || 'No se pudo cambiar el estado.')
    }
  }

  const switchBank = (id) => {
    setActiveBank(id)
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  const addLabel = {
    hgcash: 'Nueva HGCash',
    mercadopago: 'Nueva MP',
    telepagos: 'Nueva Telepagos',
    manual: 'Cuenta manual',
  }

  const totalPages = Math.max(1, pagination.totalPages || 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = getPaginationItems({ currentPage: safePage, totalPages })

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && <MenuBtn type="button" onClick={onMenuOpen}><MenuIcon /></MenuBtn>}
            <TitleBlock>
              <PageTitle>Cuentas bancarias</PageTitle>
              <PageSub>{totalCount} cuentas en el sistema</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openAdd}>
            <AddIcon />{addLabel[activeBank]}
          </AddBtn>
        </PageHeader>

        <BankTabsBar>
          {BANKS.map(b => {
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
                  {counts[b.id] || 0}
                </BankTabCount>
              </BankTab>
            )
          })}
        </BankTabsBar>

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
          <ResultCount>{pagination.total || 0} resultado{pagination.total !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        <TableCard key={activeBank}>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Titular</Th>
                  {activeBank !== 'mercadopago' && <Th>CUIT</Th>}
                  <Th>Alias / CBU</Th>
                  {activeBank === 'mercadopago' && <Th>Token</Th>}
                  {activeBank === 'hgcash' && <Th>Cookie / Webhook</Th>}
                  {activeBank === 'telepagos' && <Th>Token / Vence</Th>}
                  <Th $center>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {accounts.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>{loading ? 'Cargando cuentas...' : 'No se encontraron cuentas'}</EmptyCell>
                  </EmptyRow>
                ) : accounts.map(acc => (
                  <Tr key={acc.id}>
                    <Td>
                      <AccountCell>
                        <AccountAvatar $bg={bankCfg.avatarBg} $br={bankCfg.avatarBr}>
                          {(acc.nombre_titular || '?')[0].toUpperCase()}
                        </AccountAvatar>
                        <AccountMeta>
                          <AccountName>{acc.nombre_titular}</AccountName>
                          {acc.email && <AccountEmail>{acc.email}</AccountEmail>}
                        </AccountMeta>
                      </AccountCell>
                    </Td>

                    {activeBank !== 'mercadopago' && (
                      <Td><MonoText>{acc.cuit || '-'}</MonoText></Td>
                    )}

                    <Td>
                      <AccountName style={{ fontSize: 12.5 }}>{acc.alias}</AccountName>
                      <MonoLabel>{maskCBU(acc.cbu)}</MonoLabel>
                    </Td>

                    {activeBank === 'mercadopago' && (
                      <Td>
                        <MonoText>{maskToken(acc.token)}</MonoText>
                        <div style={{ marginTop: 4 }}>
                          {acc.token ? <TokenBadge $ok>Activo</TokenBadge> : <TokenBadge>Sin token</TokenBadge>}
                        </div>
                      </Td>
                    )}

                    {activeBank === 'hgcash' && (
                      <Td>
                        {acc.cookie_expires_at ? (
                          isExpired(acc.cookie_expires_at)
                            ? <ExpiredBadge>Cookie expirada</ExpiredBadge>
                            : <TokenBadge $ok>Cookie activa</TokenBadge>
                        ) : <TokenBadge>Sin cookie</TokenBadge>}
                        {acc.webhook_enabled && (
                          <div style={{ marginTop: 4 }}>
                            <TokenBadge $ok>Webhook activo</TokenBadge>
                          </div>
                        )}
                      </Td>
                    )}

                    {activeBank === 'telepagos' && (
                      <Td>
                        {acc.token
                          ? <MonoText style={{ fontSize: 11 }}>{maskToken(acc.token)}</MonoText>
                          : <MonoText>-</MonoText>}
                        {acc.expires_at && (
                          <div style={{ marginTop: 4 }}>
                            {isExpired(acc.expires_at)
                              ? <ExpiredBadge>Vencido {fmtDate(acc.expires_at)}</ExpiredBadge>
                              : <TokenBadge $ok>Vence {fmtDate(acc.expires_at)}</TokenBadge>}
                          </div>
                        )}
                      </Td>
                    )}

                    <Td $center>
                      <StatusBadge $on={acc.estatus === 'activa'}>
                        {acc.estatus === 'activa' ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </Td>

                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(acc)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button"
                          $v={acc.estatus === 'activa' ? 'danger' : 'success'}
                          title={acc.estatus === 'activa' ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleStatus(acc)}
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
              {pagination.total === 0 ? '0 cuentas'
                : `${(safePage - 1) * ROWS + 1}-${Math.min(safePage * ROWS, pagination.total)} de ${pagination.total}`}
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {pageItems.map(item => item.type === 'ellipsis' ? (
                <PaginBtn key={item.key} type="button" disabled>...</PaginBtn>
              ) : (
                <PaginBtn key={item.key} type="button" $active={item.page === safePage} onClick={() => setPage(item.page)}>{item.page}</PaginBtn>
              ))}
              <PaginBtn type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>
      </PageScroll>

      {modalOpen && (
        <Overlay onClick={close}>
          <ModalCard onClick={e => e.stopPropagation()}>
            <ModalHead>
              <ModalBankBadge $bg={bankCfg.bg} $br={bankCfg.br} $cl={bankCfg.color}>
                <AccountBalanceOutlinedIcon />
              </ModalBankBadge>
              <ModalHeadText>
                <ModalTitle>{editAcc ? `Editar cuenta ${bankCfg.label}` : `Nueva cuenta ${bankCfg.label}`}</ModalTitle>
                <ModalSub>{editAcc ? `Modificando datos de ${editAcc.nombre_titular}` : 'Completa los datos de la nueva cuenta'}</ModalSub>
              </ModalHeadText>
              <ModalClose type="button" onClick={close}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              <div>
                <SecLabel>Titular</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  <Field $full>
                    <FieldLabel>Nombre completo del titular</FieldLabel>
                    <FieldInput
                      type="text" placeholder="Juan Garcia"
                      value={form.nombre_titular ?? ''}
                      onChange={e => setField('nombre_titular', e.target.value)}
                    />
                  </Field>
                  {form.email !== undefined && (
                    <Field $full>
                      <FieldLabel>Correo electronico {activeBank === 'manual' && '(opcional)'}</FieldLabel>
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
                        Contrasena&nbsp;
                        {editAcc && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>dejar vacio para no cambiar</span>}
                      </FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.pw ? 'text' : 'password'}
                          placeholder="********"
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

              <div>
                <SecLabel>Datos bancarios</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  {form.cuit !== undefined && (
                    <Field>
                      <FieldLabel>CUIT {activeBank === 'manual' && '(opcional)'}</FieldLabel>
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

              {form.token !== undefined && (
                <div>
                  <SecLabel>Credenciales API</SecLabel>
                  <FormGrid style={{ marginTop: 12 }}>
                    <Field $full>
                      <FieldLabel>{activeBank === 'mercadopago' ? 'Token de acceso (APP_USR-...)' : 'Token de autenticacion'}</FieldLabel>
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
                    {activeBank === 'telepagos' && (
                      <Field $full>
                        <FieldLabel>Fecha de vencimiento</FieldLabel>
                        <FieldInput
                          type="date"
                          value={form.expires_at ?? ''}
                          onChange={e => setField('expires_at', e.target.value)}
                        />
                      </Field>
                    )}
                  </FormGrid>
                </div>
              )}

              {form.webhook_enabled !== undefined && (
                <div>
                  <SecLabel>Webhook</SecLabel>
                  <StatusRow style={{ marginTop: 12 }}>
                    <StatusRowLabel>
                      <StatusRowTitle>Usar webhook</StatusRowTitle>
                      <StatusRowSub>Activalo solo para cuentas que recibiran notificaciones automaticas</StatusRowSub>
                    </StatusRowLabel>
                    <Toggle
                      type="button"
                      $on={form.webhook_enabled}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        webhook_enabled: !prev.webhook_enabled,
                        webhook_secret: prev.webhook_enabled ? '' : prev.webhook_secret,
                      }))}
                    >
                      <ToggleThumb $on={form.webhook_enabled} />
                    </Toggle>
                  </StatusRow>

                  {form.webhook_enabled && (
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
                  )}
                </div>
              )}

              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>La cuenta puede operar y recibir transacciones</StatusRowSub>
                </StatusRowLabel>
                <Toggle type="button" $on={form.estatus === 'activa'} onClick={() => setField('estatus', form.estatus === 'activa' ? 'inactiva' : 'activa')}>
                  <ToggleThumb $on={form.estatus === 'activa'} />
                </Toggle>
              </StatusRow>
            </ModalBody>

            <ModalFoot>
              <FootLeft>
                {editAcc && (
                  <ModalBtn type="button" $v="danger" onClick={() => deleteAcc(editAcc.id)} disabled={saving}>
                    Eliminar
                  </ModalBtn>
                )}
              </FootLeft>
              <FootRight>
                <ModalBtn type="button" onClick={close} disabled={saving}>Cancelar</ModalBtn>
                <ModalBtn type="button" $v="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : editAcc ? 'Guardar cambios' : 'Crear cuenta'}
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
