import { useState, useRef, useEffect, useCallback } from 'react'
import MenuIcon        from '@mui/icons-material/Menu'
import AddIcon         from '@mui/icons-material/Add'
import SearchIcon      from '@mui/icons-material/Search'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon       from '@mui/icons-material/Close'
import FormatBoldIcon  from '@mui/icons-material/FormatBold'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined'

import {
  PageWrap, PageScroll,
  PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
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

/* ── accent palette ── */
const ACCENTS = ['#1e85ff', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899']
const accentOf = (id) => ACCENTS[(id - 1) % ACCENTS.length]

/* ── emoji data ── */
const EMOJI_GROUPS = [
  {
    label: '😀',
    emojis: [
      '😀','😂','🤣','😊','😍','🥰','😎','🤩','😜','🤔',
      '😅','🙃','😇','🥳','😏','😒','😢','😭','😱','🤯',
      '🥺','😡','🤗','😴','🤭','🫡','🫢','🥹','😤','🙄',
    ],
  },
  {
    label: '👋',
    emojis: [
      '👋','🤝','👍','👎','👌','✌️','🤞','🤙','💪','🙏',
      '👏','🤜','🤛','✋','🖐️','☝️','👆','👇','👉','👈',
      '🫶','🫂','💁','🤦','🤷','🙋','🙅','🙆','🤷','💃',
    ],
  },
  {
    label: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
      '⭐','🔥','✨','🎉','🎊','🚀','💡','✅','⚠️','🔔',
    ],
  },
]

/* ── mock data ── */
let nextId = 7
const INITIAL_COMMANDS = [
  { id: 1, name: 'Bienvenida',  command: 'bienvenida', message: '<p>¡Hola! 👋 <strong>Bienvenido/a</strong> a BetChat. Estamos para ayudarte con cualquier consulta.</p>', active: true  },
  { id: 2, name: 'Retiro',      command: 'retiro',     message: '<p>Para procesar tu retiro necesitamos los siguientes datos:</p><p>• <strong>Monto</strong><br>• <strong>CBU / Alias</strong><br>• <strong>Titular de la cuenta</strong></p>', active: true  },
  { id: 3, name: 'Soporte',     command: 'soporte',    message: '<p>Nuestro equipo de soporte está disponible <strong>24/7</strong>. Un agente te atenderá en breve. 🙏</p>', active: true  },
  { id: 4, name: 'Promociones', command: 'promos',     message: '<p>¡Tenemos <strong>grandes promociones</strong> activas! 🎉 Ingresá a tu cuenta para ver los bonos disponibles.</p>', active: true  },
  { id: 5, name: 'Cerrar sesión', command: 'logout',   message: '<p>Tu sesión ha sido <del>cerrada</del> correctamente. ¡Hasta pronto! 👋</p>', active: false },
  { id: 6, name: 'Verificar',   command: 'verificar',  message: '<p>Para verificar tu identidad enviá una foto de tu <strong>DNI</strong> (frente y dorso) junto a un selfie. ✅</p>', active: true  },
]

/* ══════════════════════════════════════════
   Rich Text Editor
══════════════════════════════════════════ */
const RichEditor = ({ value, onChange }) => {
  const ref         = useRef(null)
  const [showEmoji, setShowEmoji]   = useState(false)
  const [emojiCat,  setEmojiCat]    = useState(0)
  const [boldActive, setBoldActive] = useState(false)
  const [strikeActive, setStrikeActive] = useState(false)

  /* set initial HTML once on mount */
  useEffect(() => {
    if (ref.current && value !== undefined) {
      ref.current.innerHTML = value || ''
    }
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
        <ToolBtn
          type="button"
          $active={boldActive}
          onMouseDown={e => { e.preventDefault(); exec('bold') }}
          title="Negrita"
        >
          <FormatBoldIcon style={{ fontSize: 16 }} />
        </ToolBtn>
        <ToolBtn
          type="button"
          $active={strikeActive}
          onMouseDown={e => { e.preventDefault(); exec('strikeThrough') }}
          title="Tachado"
        >
          <StrikethroughSIcon style={{ fontSize: 16 }} />
        </ToolBtn>
        <ToolSep />
        <ToolBtn
          type="button"
          $active={showEmoji}
          onClick={() => setShowEmoji(p => !p)}
          title="Emojis"
        >
          <EmojiEmotionsOutlinedIcon style={{ fontSize: 16 }} />
        </ToolBtn>
      </EditorToolbar>

      <EditorContent
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Escribe el mensaje del comando…"
        onInput={handleInput}
        onKeyUp={updateFormatState}
        onMouseUp={updateFormatState}
      />

      {showEmoji && (
        <EmojiPopover>
          <EmojiCategoryBar>
            {EMOJI_GROUPS.map((g, i) => (
              <EmojiCategoryBtn
                key={i}
                type="button"
                $active={emojiCat === i}
                onClick={() => setEmojiCat(i)}
              >
                {g.label}
              </EmojiCategoryBtn>
            ))}
          </EmojiCategoryBar>
          <EmojiGrid>
            {EMOJI_GROUPS[emojiCat].emojis.map(e => (
              <EmojiBtn
                key={e}
                type="button"
                onClick={() => insertEmoji(e)}
              >
                {e}
              </EmojiBtn>
            ))}
          </EmojiGrid>
        </EmojiPopover>
      )}
    </EditorWrap>
  )
}

/* ══════════════════════════════════════════
   Command Modal
══════════════════════════════════════════ */
const EMPTY_FORM = { name: '', command: '', message: '', active: true }

const CommandModal = ({ cmd, onClose, onSave, onDelete }) => {
  const isEdit = Boolean(cmd)
  const [form, setForm] = useState(
    isEdit
      ? { name: cmd.name, command: cmd.command, message: cmd.message, active: cmd.active }
      : { ...EMPTY_FORM }
  )
  const [cmdError, setCmdError] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validateCommand = (val) => {
    if (!val.trim()) return 'El comando no puede estar vacío'
    if (!/^[a-z0-9_-]+$/i.test(val.trim())) return 'Solo letras, números, _ y -'
    return ''
  }

  const handleCommandChange = (v) => {
    const clean = v.replace(/^\/+/, '')
    set('command', clean)
    setCmdError(validateCommand(clean))
  }

  const handleSave = () => {
    const err = validateCommand(form.command)
    if (err) { setCmdError(err); return }
    if (!form.name.trim()) return
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
          <ModalClose onClick={onClose}><CloseIcon /></ModalClose>
        </ModalHead>

        <ModalBody>
          <div>
            <SecLabel>Información básica</SecLabel>
            <FormGrid style={{ marginTop: 12 }}>
              <Field>
                <FieldLabel>Nombre del comando</FieldLabel>
                <FieldInput
                  placeholder="Ej: Bienvenida"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Comando</FieldLabel>
                <CommandInputWrap style={cmdError ? { borderColor: 'rgba(239,68,68,0.50)' } : {}}>
                  <CommandPrefix>/</CommandPrefix>
                  <CommandInput
                    placeholder="nombre_comando"
                    value={form.command}
                    onChange={e => handleCommandChange(e.target.value)}
                  />
                </CommandInputWrap>
                {cmdError && (
                  <span style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{cmdError}</span>
                )}
              </Field>
            </FormGrid>
          </div>

          <Field>
            <SecLabel style={{ marginBottom: 4 }}>Mensaje de respuesta</SecLabel>
            <RichEditor
              key={`editor-${cmd?.id ?? 'new'}`}
              value={form.message}
              onChange={v => set('message', v)}
            />
          </Field>

          <div>
            <SecLabel style={{ marginBottom: 8 }}>Estado</SecLabel>
            <StatusRow>
              <StatusRowLabel>
                <StatusRowTitle>Comando activo</StatusRowTitle>
                <StatusRowSub>{form.active ? 'El comando está disponible para usar' : 'El comando está deshabilitado'}</StatusRowSub>
              </StatusRowLabel>
              <Toggle $on={form.active} onClick={() => set('active', p => !p)}>
                <ToggleThumb $on={form.active} />
              </Toggle>
            </StatusRow>
          </div>
        </ModalBody>

        <ModalFoot>
          <FootLeft>
            {isEdit && (
              <ModalBtn $v="danger" onClick={onDelete}>
                <DeleteOutlinedIcon style={{ fontSize: 15 }} /> Eliminar
              </ModalBtn>
            )}
          </FootLeft>
          <FootRight>
            <ModalBtn $v="ghost" onClick={onClose}>Cancelar</ModalBtn>
            <ModalBtn
              $v="primary"
              onClick={handleSave}
              disabled={!form.name.trim() || !form.command.trim()}
            >
              {isEdit ? 'Guardar cambios' : 'Crear comando'}
            </ModalBtn>
          </FootRight>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

/* ══════════════════════════════════════════
   Commands Page
══════════════════════════════════════════ */
const CommandsPage = ({ onMenuOpen }) => {
  const [commands, setCommands]     = useState(INITIAL_COMMANDS)
  const [search,   setSearch]       = useState('')
  const [filter,   setFilter]       = useState('all')   // 'all' | 'active' | 'inactive'
  const [modal,    setModal]        = useState(null)    // null | 'new' | command object

  const filtered = commands.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.command.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'active' ? c.active : !c.active)
    return matchSearch && matchFilter
  })

  const toggleStatus = useCallback((e, id) => {
    e.stopPropagation()
    setCommands(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c))
  }, [])

  const openEdit = useCallback((e, cmd) => {
    e.stopPropagation()
    setModal(cmd)
  }, [])

  const handleSave = (form) => {
    if (modal === 'new') {
      setCommands(p => [...p, { id: nextId++, ...form }])
    } else {
      setCommands(p => p.map(c => c.id === modal.id ? { ...c, ...form } : c))
    }
    setModal(null)
  }

  const handleDelete = () => {
    setCommands(p => p.filter(c => c.id !== modal.id))
    setModal(null)
  }

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn onClick={onMenuOpen} aria-label="Abrir menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Comandos</PageTitle>
              <PageSub>{commands.length} comandos en total</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn onClick={() => setModal('new')}>
            <AddIcon /> Nuevo comando
          </AddBtn>
        </PageHeader>

        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              placeholder="Buscar por nombre o comando…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </SearchBox>
          <FilterSelect value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </FilterSelect>
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {filtered.length === 0 && (commands.length > 0 || search || filter !== 'all') ? (
          <EmptyWrap>
            <EmptyGlyph>🔍</EmptyGlyph>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptySub>No hay comandos que coincidan con los filtros aplicados.</EmptySub>
          </EmptyWrap>
        ) : commands.length === 0 ? (
          <EmptyWrap>
            <EmptyGlyph>⚡</EmptyGlyph>
            <EmptyTitle>Sin comandos</EmptyTitle>
            <EmptySub>Crea tu primer comando para agilizar las respuestas del equipo.</EmptySub>
          </EmptyWrap>
        ) : (
          <CommandsGrid>
            {filtered.map(cmd => {
              const accent = accentOf(cmd.id)
              return (
                <CommandCard key={cmd.id} $active={cmd.active} onClick={e => openEdit(e, cmd)}>
                  <CardAccent style={{ background: `linear-gradient(90deg, ${accent}cc, ${accent}44)` }} />
                  <CardBody>
                    <CardTop>
                      <CardName>{cmd.name}</CardName>
                      <CardStatusDot $active={cmd.active} />
                    </CardTop>

                    <CommandPill style={{
                      background: `${accent}18`,
                      border: `1px solid ${accent}44`,
                      color: accent,
                    }}>
                      /{cmd.command}
                    </CommandPill>

                    <CardPreview dangerouslySetInnerHTML={{ __html: cmd.message }} />

                    <CardFooter>
                      <CardEditBtn onClick={e => openEdit(e, cmd)}>
                        <EditOutlinedIcon /> Editar
                      </CardEditBtn>
                      <CardStatusBtn
                        $active={cmd.active}
                        onClick={e => toggleStatus(e, cmd.id)}
                      >
                        {cmd.active ? 'Activo' : 'Inactivo'}
                      </CardStatusBtn>
                    </CardFooter>
                  </CardBody>
                </CommandCard>
              )
            })}

            <AddCard onClick={() => setModal('new')}>
              <AddCardIconWrap><AddIcon /></AddCardIconWrap>
              <AddCardLabel>Nuevo comando</AddCardLabel>
            </AddCard>
          </CommandsGrid>
        )}
      </PageScroll>

      {modal !== null && (
        <CommandModal
          cmd={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </PageWrap>
  )
}

export default CommandsPage
