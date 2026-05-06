// ModalsPage.jsx
import { useState, useMemo } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, AddBtn, TitleBlock, PageTitle, PageSub,
  StatsStrip, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  NotifCell, NotifIconBadge, NotifMeta, NotifTitle, NotifBodyPreview,
  AudienceBadge, StatusBadge, DateText, DateSub, ActionBtns, ActionBtn,
  Overlay, ModalCard, ModalHead, ModalIconBadge, ModalHeadText, ModalTitle, ModalSub,
  ModalClose, ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  Field, FieldLabel, FieldInput, FieldTextarea, FieldSelect, CharCount,
  ScheduleToggleRow, ScheduleRowLabel, ScheduleRowTitle, ScheduleRowSub,
  Toggle, ToggleThumb, ScheduleFields, ConfirmBanner, ConfirmTitle,
  ConfirmSub, ConfirmBtns, ConfirmBtn
} from './ModalsPage.styles'

const PAGE_SIZE = 8
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos' , icon: '🌐' },
  { value: 'active', label: 'Activos' , icon: '✅' },
  { value: 'vip', label: 'VIP' , icon: '⭐' },
]

const audienceLabel = v => AUDIENCE_OPTIONS.find(o => o.value === v)?.label ?? v

let nextId = 100
const MOCK_MODALS = [
  { id: 1, title: '¡Gran Sorteo!', body: 'Participa en nuestro gran sorteo semanal', img: '', audience: 'all', status: 'enviada', sentAt: '2026-04-30T12:00:00Z', scheduledFor: null, dismissible: true, ctaLabel: 'Ver más', ctaUrl: '/sorteo' },
  { id: 2, title: 'Mantenimiento', body: 'Hoy 02:00 - 04:00', img: '', audience: 'all', status: 'programada', sentAt: null, scheduledFor: '2026-05-07T02:00:00Z', dismissible: false, ctaLabel: '', ctaUrl: '' },
]

const BLANK_FORM = {
  title: '', body: '', img: '', audience: 'all',
  scheduled: false, schedDate: '', schedTime: '',
  dismissible: true, ctaLabel: '', ctaUrl: ''
}

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : null
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
const statusLabel = s => s === 'enviada' ? 'Mostrado' : s === 'programada' ? 'Programado' : 'Borrador'

const ModalsPage = ({ onMenuOpen }) => {
  const [modals, setModals] = useState(MOCK_MODALS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [confirmStep, setConfirmStep] = useState(false)

  const filtered = useMemo(() => modals.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
    const matchStatus = !statusFilter || m.status === statusFilter
    return matchSearch && matchStatus
  }), [modals, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    enviadas: modals.filter(m => m.status === 'enviada').length,
    programadas: modals.filter(m => m.status === 'programada').length,
    borradores: modals.filter(m => m.status === 'borrador').length,
  }), [modals])

  const openNew = () => {
    setEditModal(null)
    setForm(BLANK_FORM)
    setConfirmStep(false)
    setModalOpen(true)
  }
  const openEdit = m => {
    setEditModal(m)
    setForm({
      title: m.title, body: m.body, img: m.img, audience: m.audience,
      scheduled: !!m.scheduledFor, schedDate: m.scheduledFor ? m.scheduledFor.slice(0,10) : '',
      schedTime: m.scheduledFor ? m.scheduledFor.slice(11,16) : '',
      dismissible: m.dismissible ?? true, ctaLabel: m.ctaLabel ?? '', ctaUrl: m.ctaUrl ?? ''
    })
    setConfirmStep(false)
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setConfirmStep(false) }
  const setField = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const buildEntry = (status) => {
    const scheduledFor = form.scheduled && form.schedDate ? `${form.schedDate}T${form.schedTime || '00:00'}:00Z` : null
    const resolvedStatus = scheduledFor ? 'programada' : status
    return {
      title: form.title, body: form.body, img: form.img, audience: form.audience,
      status: resolvedStatus, sentAt: resolvedStatus === 'enviada' ? new Date().toISOString() : null,
      scheduledFor, dismissible: !!form.dismissible, ctaLabel: form.ctaLabel, ctaUrl: form.ctaUrl
    }
  }

  const saveDraft = () => {
    const patch = { ...buildEntry('borrador'), status: 'borrador', sentAt: null, scheduledFor: null }
    if (editModal) setModals(ms => ms.map(x => x.id === editModal.id ? { ...x, ...patch } : x))
    else setModals(ms => [{ id: nextId++, ...patch }, ...ms])
    closeModal()
  }

  const doSend = (save = false) => {
    const entry = buildEntry('enviada')
    if (editModal) {
      setModals(ms => ms.map(x => x.id === editModal.id ? { ...x, ...entry } : x))
    } else if (save) {
      setModals(ms => [{ id: nextId++, ...entry }, ...ms])
    }
    closeModal()
  }

  const handleSend = () => {
    if (editModal) doSend(true)
    else setConfirmStep(true)
  }

  const deleteModal = id => setModals(ms => ms.filter(m => m.id !== id))

  const isValid = form.title.trim() && form.body.trim()
  const sendLabel = form.scheduled ? 'Programar' : 'Mostrar ahora'

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Ventanas Promocionales</PageTitle>
              <PageSub>Crea ventanas emergentes que se muestran en tu sitio web</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn onClick={openNew}><AddIcon /> Nueva ventana</AddBtn>
        </PageHeader>

        <StatsStrip>
          <StatCard>
            <StatIconWrap $bg="rgba(34,197,94,0.10)" $br="rgba(34,197,94,0.20)" $cl="#4ade80">🎯</StatIconWrap>
            <StatInfo><StatValue>{stats.enviadas}</StatValue><StatLabel>Mostradas</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(14,165,233,0.10)" $br="rgba(14,165,233,0.20)" $cl="#38bdf8">📅</StatIconWrap>
            <StatInfo><StatValue>{stats.programadas}</StatValue><StatLabel>Programadas</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(255,255,255,0.03)" $br="rgba(255,255,255,0.06)" $cl="rgba(255,255,255,0.35)">📝</StatIconWrap>
            <StatInfo><StatValue>{stats.borradores}</StatValue><StatLabel>Borradores</StatLabel></StatInfo>
          </StatCard>
        </StatsStrip>

        <FiltersBar>
          <SearchBox>
            <SrchIcon />
            <SearchInput placeholder="Buscar ventanas..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            <option value="enviada">Mostradas</option>
            <option value="programada">Programadas</option>
            <option value="borrador">Borradores</option>
          </FilterSelect>
          <ResultCount>{filtered.length} ventana{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        <TableCard>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Ventana</Th>
                  <Th>Audiencia</Th>
                  <Th>Programada</Th>
                  <Th>Mostrada</Th>
                  <Th>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{padding: 40, textAlign:'center', color:'rgba(255,255,255,0.2)'}}>No hay ventanas</td></tr>
                ) : paginated.map(m => (
                  <Tr key={m.id}>
                    <Td>
                      <NotifCell>
                        <NotifIconBadge $s={m.status}>🎯</NotifIconBadge>
                        <NotifMeta>
                          <NotifTitle>{m.title}</NotifTitle>
                          <NotifBodyPreview>{m.body}</NotifBodyPreview>
                        </NotifMeta>
                      </NotifCell>
                    </Td>
                    <Td><AudienceBadge><PeopleOutlinedIcon style={{fontSize:13}}/>{audienceLabel(m.audience)}</AudienceBadge></Td>
                    <Td>{m.scheduledFor ? (<><DateText>{fmtDate(m.scheduledFor)}</DateText><DateSub>{fmtTime(m.scheduledFor)}</DateSub></>) : (<DateText style={{color:'rgba(255,255,255,0.14)'}}>—</DateText>)}</Td>
                    <Td>{m.sentAt ? (<><DateText>{fmtDate(m.sentAt)}</DateText><DateSub>{fmtTime(m.sentAt)}</DateSub></>) : (<DateText style={{color:'rgba(255,255,255,0.14)'}}>—</DateText>)}</Td>
                    <Td><StatusBadge $s={m.status}>{statusLabel(m.status)}</StatusBadge></Td>
                    <Td $center>
                      <ActionBtns style={{justifyContent:'center'}}>
                        <ActionBtn title="Editar" onClick={() => openEdit(m)}><EditOutlinedIcon /></ActionBtn>
                        <ActionBtn title="Eliminar" $v="danger" onClick={() => deleteModal(m.id)}><DeleteOutlinedIcon /></ActionBtn>
                      </ActionBtns>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        </TableCard>

      </PageScroll>

      {/* MODAL DE EDICIÓN */}
      {modalOpen && (
        <Overlay onClick={e => e.target === e.currentTarget && closeModal()}>
          <ModalCard style={{maxWidth: 580}}>
            <ModalHead>
              <ModalIconBadge>🎯</ModalIconBadge>
              <ModalHeadText>
                <ModalTitle>{editModal ? 'Editar ventana' : 'Nueva ventana'}</ModalTitle>
                <ModalSub>{editModal ? `Estado: ${statusLabel(editModal.status)}` : 'Configura cómo se mostrará en la web'}</ModalSub>
              </ModalHeadText>
              <ModalClose onClick={closeModal}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              <div style={{textAlign:'center', marginBottom:20}}>
                <div style={{
                  display:'inline-block', width:300, minHeight:240, background:'#111', color:'#fff',
                  borderRadius:12, border:'1px solid rgba(255,255,255,0.08)',
                  boxShadow:'0 12px 30px rgba(0,0,0,0.5)', padding:20, textAlign:'left',
                  position:'relative'
                }}>
                  {form.img && <img src={form.img} alt="" style={{width:'100%', height:100, objectFit:'cover', borderRadius:8, marginBottom:12}} />}
                  <div style={{fontWeight:600, marginBottom:6}}>{form.title || 'Título'}</div>
                  <div style={{fontSize:13, color:'#aaa', lineHeight:1.4, marginBottom:12}}>{form.body || 'Contenido del mensaje...'}</div>
                  {(form.ctaLabel || form.ctaUrl) && (
                    <button style={{
                      background:'#1e86ff', color:'#fff', padding:'6px 10px', borderRadius:8,
                      border:'none', fontSize:12, cursor:'pointer', width:'100%'
                    }}>{form.ctaLabel || 'Ir'}</button>
                  )}
                  {form.dismissible !== false && (
                    <button style={{
                      position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.5)',
                      color:'#fff', border:'none', borderRadius:100, width:24, height:24,
                      cursor:'pointer', fontSize:16
                    }}>✕</button>
                  )}
                </div>
              </div>

              <Field $full>
                <FieldLabel>Título</FieldLabel>
                <FieldInput placeholder="Ej: ¡Nueva promoción!" maxLength={80} value={form.title} onChange={e => setField('title', e.target.value)} />
                <CharCount $warn={form.title.length > 60}>{form.title.length}/80</CharCount>
              </Field>

              <Field $full>
                <FieldLabel>Mensaje</FieldLabel>
                <FieldTextarea placeholder="Texto principal..." maxLength={300} value={form.body} onChange={e => setField('body', e.target.value)} />
                <CharCount $warn={form.body.length > 240}>{form.body.length}/300</CharCount>
              </Field>

              <Field>
                <FieldLabel>Imagen (URL)</FieldLabel>
                <FieldInput placeholder="https://ejemplo.com/imagen.jpg" value={form.img} onChange={e => setField('img', e.target.value)} />
              </Field>

              <Field>
                <FieldLabel>Botón CTA</FieldLabel>
                <FieldInput placeholder="Texto del botón" value={form.ctaLabel} onChange={e => setField('ctaLabel', e.target.value)} style={{marginBottom:8}} />
                <FieldInput placeholder="https://destino.com" value={form.ctaUrl} onChange={e => setField('ctaUrl', e.target.value)} />
              </Field>

              <Field $full>
                <FieldLabel>Audiencia</FieldLabel>
                <FieldSelect value={form.audience} onChange={e => setField('audience', e.target.value)}>
                  {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                </FieldSelect>
              </Field>

              <ScheduleToggleRow>
                <ScheduleRowLabel>
                  <ScheduleRowTitle>Programar visualización</ScheduleRowTitle>
                  <ScheduleRowSub>Define fecha y hora para que se muestre automáticamente</ScheduleRowSub>
                </ScheduleRowLabel>
                <Toggle $on={form.scheduled} onClick={() => setField('scheduled', !form.scheduled)}><ToggleThumb $on={form.scheduled} /></Toggle>
              </ScheduleToggleRow>

              {form.scheduled && (
                <ScheduleFields>
                  <Field>
                    <FieldLabel>Fecha</FieldLabel>
                    <FieldInput type="date" value={form.schedDate} onChange={e => setField('schedDate', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Hora</FieldLabel>
                    <FieldInput type="time" value={form.schedTime} onChange={e => setField('schedTime', e.target.value)} />
                  </Field>
                </ScheduleFields>
              )}

              <Field>
                <FieldLabel>¿Se puede cerrar?</FieldLabel>
                <Toggle $on={form.dismissible} onClick={() => setField('dismissible', !form.dismissible)} style={{width:60}}><ToggleThumb $on={form.dismissible} /></Toggle>
              </Field>

              {confirmStep && (
                <ConfirmBanner>
                  <ConfirmTitle>¿Guardar en librería?</ConfirmTitle>
                  <ConfirmSub>Puedes guardar esta ventana para usarla después.</ConfirmSub>
                  <ConfirmBtns>
                    <ConfirmBtn onClick={() => doSend(false)}>Solo mostrar</ConfirmBtn>
                    <ConfirmBtn $primary onClick={() => doSend(true)}>Guardar y mostrar</ConfirmBtn>
                  </ConfirmBtns>
                </ConfirmBanner>
              )}
            </ModalBody>

            {!confirmStep && (
              <ModalFoot>
                <FootLeft><ModalBtn $v="ghost" onClick={closeModal}>Cancelar</ModalBtn></FootLeft>
                <FootRight>
                  <ModalBtn onClick={saveDraft} disabled={!isValid} style={{opacity: isValid ? 1 : 0.42}}><SaveOutlinedIcon style={{fontSize:16}}/> Guardar borrador</ModalBtn>
                  <ModalBtn $v="primary" onClick={handleSend} disabled={!isValid} style={{opacity: isValid ? 1 : 0.42}}><SendIcon style={{fontSize:16}}/> {sendLabel}</ModalBtn>
                </FootRight>
              </ModalFoot>
            )}

          </ModalCard>
        </Overlay>
      )}
    </PageWrap>
  )
}

export default ModalsPage