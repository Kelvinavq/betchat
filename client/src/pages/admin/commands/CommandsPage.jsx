import { useCallback, useEffect, useRef, useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon from '@mui/icons-material/Close'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { api } from '../../../utils/api'
import {
  PageWrap, PageScroll,
  PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  CommandsGrid,
  CommandCard, CardAccent, CardBody, CardTop, CardName, CardStatusDot,
  CommandPill, CardPreview, CardFooter, CardEditBtn, CardStatusBtn,
  AddCard, AddCardIconWrap, AddCardLabel,
  EmptyWrap, EmptyGlyph, EmptyTitle, EmptySub,
  Overlay, ModalCard, ModalHead, ModalTitle, ModalSub, ModalClose,
  ModalBody, SecLabel, FormGrid, Field, FieldLabel, FieldInput,
  CommandInputWrap, CommandPrefix, CommandInput,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  ModalFoot, FootLeft, FootRight, ModalBtn,
  EditorWrap, EditorToolbar, ToolBtn, ToolSep, EditorContent,
  EmojiPopover, EmojiCategoryBar, EmojiCategoryBtn, EmojiGrid, EmojiBtn,
} from './CommandsPage.styles'

const ACCENTS = ['#1e85ff', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899']
const ROWS_PER_PAGE = 12
const EMPTY_FORM = { name: '', command: '', message: '', active: true, matchType: 'contains' }

const EMOJIS = ['😀', '😂', '😊', '😍', '😎', '🙏', '👍', '🔥', '✨', '🎉', '🚀', '✅', '⚠️', '💡', '💰', '📎']
const accentOf = (id) => ACCENTS[(id - 1) % ACCENTS.length]

const titleFromTrigger = (trigger) => {
  return String(trigger || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

const mapApiCommand = (command) => ({
  id: command.id,
  name: titleFromTrigger(command.trigger),
  command: command.trigger,
  message: command.response,
  matchType: command.match_type,
  active: Boolean(command.is_active),
})

const RichEditor = ({ value, onChange }) => {
  const ref = useRef(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [boldActive, setBoldActive] = useState(false)
  const [strikeActive, setStrikeActive] = useState(false)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || ''
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateFormatState = () => {
    setBoldActive(document.queryCommandState('bold'))
    setStrikeActive(document.queryCommandState('strikeThrough'))
  }

  const exec = (cmd, val) => {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    updateFormatState()
    onChange?.(ref.current?.innerHTML || '')
  }

  const handleInput = () => {
    updateFormatState()
    onChange?.(ref.current?.innerHTML || '')
  }

  const insertEmoji = (emoji) => {
    ref.current?.focus()
    document.execCommand('insertText', false, emoji)
    onChange?.(ref.current?.innerHTML || '')
  }

  return (
    <EditorWrap>
      <EditorToolbar>
        <ToolBtn type="button" $active={boldActive} onMouseDown={e => { e.preventDefault(); exec('bold') }} title="Negrita">
          <FormatBoldIcon style={{ fontSize: 16 }} />
        </ToolBtn>
        <ToolBtn type="button" $active={strikeActive} onMouseDown={e => { e.preventDefault(); exec('strikeThrough') }} title="Tachado">
          <StrikethroughSIcon style={{ fontSize: 16 }} />
        </ToolBtn>
        <ToolSep />
        <ToolBtn type="button" $active={showEmoji} onClick={() => setShowEmoji(p => !p)} title="Emojis">
          <EmojiEmotionsOutlinedIcon style={{ fontSize: 16 }} />
        </ToolBtn>
      </EditorToolbar>

      <EditorContent
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Escribe el mensaje del comando..."
        onInput={handleInput}
        onKeyUp={updateFormatState}
        onMouseUp={updateFormatState}
      />

      {showEmoji && (
        <EmojiPopover>
          <EmojiCategoryBar>
            <EmojiCategoryBtn type="button" $active>Recientes</EmojiCategoryBtn>
          </EmojiCategoryBar>
          <EmojiGrid>
            {EMOJIS.map(emoji => (
              <EmojiBtn key={emoji} type="button" onClick={() => insertEmoji(emoji)}>
                {emoji}
              </EmojiBtn>
            ))}
          </EmojiGrid>
        </EmojiPopover>
      )}
    </EditorWrap>
  )
}

const CommandModal = ({ cmd, onClose, onSave, onDelete, saving }) => {
  const isEdit = Boolean(cmd)
  const [form, setForm] = useState(
    isEdit
      ? { name: cmd.name, command: cmd.command, message: cmd.message, active: cmd.active, matchType: cmd.matchType || 'contains' }
      : { ...EMPTY_FORM }
  )
  const [cmdError, setCmdError] = useState('')

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const validateCommand = (value) => {
    if (!value.trim()) return 'El comando no puede estar vacío'
    if (!/^[a-z0-9_-]+$/i.test(value.trim())) return 'Solo letras, números, _ y -'
    return ''
  }

  const handleCommandChange = (value) => {
    const clean = value.replace(/^\/+/, '')
    setForm(prev => ({
      ...prev,
      command: clean,
      name: prev.name.trim() ? prev.name : titleFromTrigger(clean),
    }))
    setCmdError(validateCommand(clean))
  }

  const handleSave = () => {
    const error = validateCommand(form.command)
    if (error) { setCmdError(error); return }
    if (!form.message.trim()) return
    onSave({ ...form, command: form.command.trim().toLowerCase() })
  }

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>{isEdit ? 'Editar comando' : 'Nuevo comando'}</ModalTitle>
            <ModalSub>{isEdit ? `Modificando /${cmd.command}` : 'Completa los datos del nuevo comando'}</ModalSub>
          </div>
          <ModalClose type="button" onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>
          <div>
            <SecLabel>Información básica</SecLabel>
            <FormGrid style={{ marginTop: 12 }}>
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <FieldInput placeholder="Ej: Bienvenida" value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Comando</FieldLabel>
                <CommandInputWrap style={cmdError ? { borderColor: 'rgba(239,68,68,0.50)' } : {}}>
                  <CommandPrefix>/</CommandPrefix>
                  <CommandInput placeholder="bienvenida" value={form.command} onChange={e => handleCommandChange(e.target.value)} />
                </CommandInputWrap>
                {cmdError && <span style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{cmdError}</span>}
              </Field>
            </FormGrid>
          </div>

          <Field>
            <SecLabel style={{ marginBottom: 4 }}>Mensaje de respuesta</SecLabel>
            <RichEditor key={`editor-${cmd?.id ?? 'new'}`} value={form.message} onChange={value => set('message', value)} />
          </Field>

          <div>
            <SecLabel style={{ marginBottom: 8 }}>Estado</SecLabel>
            <StatusRow>
              <StatusRowLabel>
                <StatusRowTitle>Comando activo</StatusRowTitle>
                <StatusRowSub>{form.active ? 'El comando está disponible para usar' : 'El comando está deshabilitado'}</StatusRowSub>
              </StatusRowLabel>
              <Toggle type="button" $on={form.active} onClick={() => set('active', !form.active)}>
                <ToggleThumb $on={form.active} />
              </Toggle>
            </StatusRow>
          </div>
        </ModalBody>

        <ModalFoot>
          <FootLeft>
            {isEdit && (
              <ModalBtn type="button" $v="danger" onClick={onDelete} disabled={saving}>
                <DeleteOutlinedIcon style={{ fontSize: 15 }} /> Eliminar
              </ModalBtn>
            )}
          </FootLeft>
          <FootRight>
            <ModalBtn type="button" $v="ghost" onClick={onClose} disabled={saving}>Cancelar</ModalBtn>
            <ModalBtn type="button" $v="primary" onClick={handleSave} disabled={saving || !form.command.trim() || !form.message.trim()}>
              {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear comando')}
            </ModalBtn>
          </FootRight>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

const CommandsPage = ({ onMenuOpen }) => {
  const [commands, setCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: ROWS_PER_PAGE, total: 0, totalPages: 1 })

  const loadCommands = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROWS_PER_PAGE),
        search: search.trim(),
        status: filter,
      })
      const data = await api.get('/api/commands?' + params.toString())
      setCommands((data.commands || []).map(mapApiCommand))
      setPagination(data.pagination || { page, limit: ROWS_PER_PAGE, total: data.commands?.length || 0, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }, [filter, page, search])

  useEffect(() => {
    queueMicrotask(() => { loadCommands() })
  }, [loadCommands])

  const totalPages = pagination.totalPages
  const safePage = pagination.page
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  const openEdit = useCallback((event, command) => {
    event.stopPropagation()
    setModal(command)
  }, [])

  const toggleStatus = useCallback(async (event, id) => {
    event.stopPropagation()
    const target = commands.find(command => command.id === id)
    if (!target) return
    const nextActive = !target.active
    setCommands(prev => prev.map(command => command.id === id ? { ...command, active: nextActive } : command))
    try {
      await api.put('/api/commands/' + id, { is_active: nextActive })
    } catch {
      setCommands(prev => prev.map(command => command.id === id ? { ...command, active: !nextActive } : command))
    }
  }, [commands])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      const payload = {
        trigger: form.command,
        response: form.message,
        match_type: form.matchType || 'contains',
        is_active: form.active,
      }

      if (modal === 'new') {
        await api.post('/api/commands', payload)
        setPage(1)
      } else {
        await api.put('/api/commands/' + modal.id, payload)
      }

      setModal(null)
      await loadCommands()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete('/api/commands/' + modal.id)
      setModal(null)
      await loadCommands()
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn type="button" onClick={onMenuOpen} aria-label="Abrir menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Comandos</PageTitle>
              <PageSub>{pagination.total} comandos en total</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={() => setModal('new')}>
            <AddIcon /> Nuevo comando
          </AddBtn>
        </PageHeader>

        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              placeholder="Buscar por comando o respuesta..."
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(1) }}
            />
          </SearchBox>
          <FilterSelect value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}>
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </FilterSelect>
          <ResultCount>{pagination.total} resultado{pagination.total !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {loading ? (
          <EmptyWrap><EmptyTitle>Cargando comandos...</EmptyTitle></EmptyWrap>
        ) : commands.length === 0 && (pagination.total > 0 || search || filter !== 'all') ? (
          <EmptyWrap>
            <EmptyGlyph>🔍</EmptyGlyph>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptySub>No hay comandos que coincidan con los filtros aplicados.</EmptySub>
          </EmptyWrap>
        ) : pagination.total === 0 ? (
          <EmptyWrap>
            <EmptyGlyph>⚡</EmptyGlyph>
            <EmptyTitle>Sin comandos</EmptyTitle>
            <EmptySub>Crea tu primer comando para agilizar las respuestas del equipo.</EmptySub>
          </EmptyWrap>
        ) : (
          <>
            <CommandsGrid>
              {commands.map(command => {
                const accent = accentOf(command.id)
                return (
                  <CommandCard key={command.id} $active={command.active} onClick={event => openEdit(event, command)}>
                    <CardAccent style={{ background: `linear-gradient(90deg, ${accent}cc, ${accent}44)` }} />
                    <CardBody>
                      <CardTop>
                        <CardName>{command.name}</CardName>
                        <CardStatusDot $active={command.active} />
                      </CardTop>
                      <CommandPill style={{ background: `${accent}18`, border: `1px solid ${accent}44`, color: accent }}>
                        /{command.command}
                      </CommandPill>
                      <CardPreview dangerouslySetInnerHTML={{ __html: command.message }} />
                      <CardFooter>
                        <CardEditBtn type="button" onClick={event => openEdit(event, command)}>
                          <EditOutlinedIcon /> Editar
                        </CardEditBtn>
                        <CardStatusBtn type="button" $active={command.active} onClick={event => toggleStatus(event, command.id)}>
                          {command.active ? 'Activo' : 'Inactivo'}
                        </CardStatusBtn>
                      </CardFooter>
                    </CardBody>
                  </CommandCard>
                )
              })}
              <AddCard type="button" onClick={() => setModal('new')}>
                <AddCardIconWrap><AddIcon /></AddCardIconWrap>
                <AddCardLabel>Nuevo comando</AddCardLabel>
              </AddCard>
            </CommandsGrid>

            <Pagination>
              <PaginInfo>
                {pagination.total === 0
                  ? '0 comandos'
                  : `${(safePage - 1) * ROWS_PER_PAGE + 1}-${Math.min(safePage * ROWS_PER_PAGE, pagination.total)} de ${pagination.total}`
                }
              </PaginInfo>
              <PaginBtns>
                <PaginBtn type="button" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={safePage === 1}>
                  <ChevronLeftIcon />
                </PaginBtn>
                {pages.map(item => (
                  <PaginBtn key={item} type="button" $active={item === safePage} onClick={() => setPage(item)}>
                    {item}
                  </PaginBtn>
                ))}
                <PaginBtn type="button" onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages}>
                  <ChevronRightIcon />
                </PaginBtn>
              </PaginBtns>
            </Pagination>
          </>
        )}
      </PageScroll>

      {modal !== null && (
        <CommandModal
          cmd={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
        />
      )}
    </PageWrap>
  )
}

export default CommandsPage
