// ModalsPage.jsx
import { useState, useMemo } from 'react'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, AddBtn, TitleBlock, PageTitle, PageSub,
  StatsStrip, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  NotifCell, NotifIconBadge, NotifMeta, NotifTitle, NotifBodyPreview,
  AudienceBadge, StatusBadge, DateText, DateSub, ActionBtns, ActionBtn,
  Overlay, ModalCard, ModalHead, ModalIconBadge, ModalHeadText, ModalTitle, ModalSub,
  ModalClose, ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  Field, FieldLabel, FieldInput, FieldTextarea, FieldSelect, CharCount,
  PreviewCard, PreviewAppIcon, PreviewContent, PreviewAppName, PreviewTime,
  PreviewTitle, PreviewBody, PreviewLabel, ScheduleToggleRow, ScheduleRowLabel,
  ScheduleRowTitle, ScheduleRowSub, Toggle, ToggleThumb, ScheduleFields,
  ConfirmBanner, ConfirmTitle, ConfirmSub, ConfirmBtns, ConfirmBtn
} from './ModalsPage.styles' // reutilizamos estilos

const PAGE_SIZE = 8
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos' , icon: '🌐' },
  { value: 'active', label: 'Activos' , icon: '✅' },
  { value: 'vip', label: 'VIP' , icon: '⭐' },
]

const audienceLabel = v => AUDIENCE_OPTIONS.find(o => o.value === v)?.label ?? v

let nextId = 100
const MOCK_MODALS = [
  { id: 1, title: 'Promo modal', body: 'Aprovechá la promo', audience: 'all', status: 'enviada', sentAt: '2026-04-30T12:00:00Z', scheduledFor: null, dismissible: true },
  { id: 2, title: 'Mantenimiento', body: 'Hoy 02:00 - 04:00', audience: 'all', status: 'programada', sentAt: null, scheduledFor: '2026-05-07T02:00:00Z', dismissible: false },
]

const BLANK_FORM = { title: '', body: '', audience: 'all', scheduled: false, schedDate: '', schedTime: '', dismissible: true, ctaLabel: '', ctaUrl: '' }

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : null
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
const statusLabel = s => s === 'enviada' ? 'Enviada' : s === 'programada' ? 'Programada' : 'Borrador'

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
      title: m.title, body: m.body, audience: m.audience,
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
      title: form.title, body: form.body, audience: form.audience,
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
  const sendLabel = form.scheduled ? 'Programar' : 'Enviar ahora'

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && <div style={{width:36,height:36}} />}
            <TitleBlock>
              <PageTitle>Modales</PageTitle>
              <PageSub>Gestiona y programa modales que verán tus clientes</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn onClick={openNew}><AddIcon /> Nuevo modal</AddBtn>
        </PageHeader>

        <StatsStrip>
          <StatCard>
            <StatIconWrap $bg="rgba(34,197,94,0.10)" $br="rgba(34,197,94,0.20)" $cl="#4ade80"><NotificationsOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.enviadas}</StatValue><StatLabel>Mostrados</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(14,165,233,0.10)" $br="rgba(14,165,233,0.20)" $cl="#38bdf8"><NotificationsOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.programadas}</StatValue><StatLabel>Programados</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(255,255,255,0.03)" $br="rgba(255,255,255,0.06)" $cl="rgba(255,255,255,0.35)"><NotificationsOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.borradores}</StatValue><StatLabel>Borradores</StatLabel></StatInfo>
          </StatCard>
        </StatsStrip>

        <FiltersBar>
          <SearchBox>
            <SrchIcon />
            <SearchInput placeholder="Buscar modales..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            <option value="enviada">Mostrados</option>
            <option value="programada">Programados</option>
            <option value="borrador">Borradores</option>
          </FilterSelect>
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        <TableCard>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Modal</Th>
                  <Th>Audiencia</Th>
                  <Th>Programado</Th>
                  <Th>Mostrado</Th>
                  <Th>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{padding: 40, textAlign:'center', color:'rgba(255,255,255,0.2)'}}>No hay modales</td></tr>
                ) : paginated.map(m => (
                  <Tr key={m.id}>
                    <Td>
                      <NotifCell>
                        <NotifIconBadge $s={m.status}><NotificationsOutlinedIcon /></NotifIconBadge>
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

      {modalOpen && (
        <Overlay onClick={e => e.target === e.currentTarget && closeModal()}>
          <ModalCard>
            <ModalHead>
              <ModalIconBadge><NotificationsOutlinedIcon /></ModalIconBadge>
              <ModalHeadText>
                <ModalTitle>{editModal ? 'Editar modal' : 'Nuevo modal'}</ModalTitle>
                <ModalSub>{editModal ? `Estado: ${statusLabel(editModal.status)}` : 'Crea un modal que se mostrará a los clientes'}</ModalSub>
              </ModalHeadText>
              <ModalClose onClick={closeModal}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              <div>
                <PreviewLabel>Vista previa</PreviewLabel>
                <PreviewCard>
                  <PreviewAppIcon><NotificationsOutlinedIcon /></PreviewAppIcon>
                  <PreviewContent>
                    <PreviewAppName>BetChat <PreviewTime>{form.scheduled ? (form.schedDate + ' ' + (form.schedTime||'00:00')) : 'ahora'}</PreviewTime></PreviewAppName>
                    <PreviewTitle>{form.title || 'Título del modal'}</PreviewTitle>
                    <PreviewBody>{form.body || 'El contenido del modal aparecerá aquí...'}</PreviewBody>
                  </PreviewContent>
                </PreviewCard>
              </div>

              <Field $full>
                <FieldLabel>Título</FieldLabel>
                <FieldInput placeholder="Ej: Atención" maxLength={80} value={form.title} onChange={e => setField('title', e.target.value)} />
                <CharCount $warn={form.title.length > 60}>{form.title.length}/80</CharCount>
              </Field>

              <Field $full>
                <FieldLabel>Contenido</FieldLabel>
                <FieldTextarea placeholder="Texto del modal..." maxLength={1000} value={form.body} onChange={e => setField('body', e.target.value)} />
                <CharCount $warn={form.body.length > 900}>{form.body.length}/1000</CharCount>
              </Field>

              <Field $full>
                <FieldLabel>Audiencia</FieldLabel>
                <FieldSelect value={form.audience} onChange={e => setField('audience', e.target.value)}>
                  {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                </FieldSelect>
              </Field>

              <Field>
                <FieldLabel>CTA (opcional)</FieldLabel>
                <FieldInput placeholder="Texto del botón (p.ej. Ver oferta)" value={form.ctaLabel} onChange={e => setField('ctaLabel', e.target.value)} />
                <FieldInput placeholder="URL (opcional)" value={form.ctaUrl} onChange={e => setField('ctaUrl', e.target.value)} style={{marginTop:8}} />
              </Field>

              <ScheduleToggleRow>
                <ScheduleRowLabel>
                  <ScheduleRowTitle>Programar visualización</ScheduleRowTitle>
                  <ScheduleRowSub>Define fecha y hora para que el modal se muestre automáticamente</ScheduleRowSub>
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
                  <ConfirmSub>Puedes guardar esta plantilla para usarla después.</ConfirmSub>
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