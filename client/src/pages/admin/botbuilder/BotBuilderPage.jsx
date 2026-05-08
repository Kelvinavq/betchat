import { useState, useRef, useEffect, useCallback } from 'react'
import MenuIcon               from '@mui/icons-material/Menu'
import AddIcon                from '@mui/icons-material/Add'
import DragIndicatorIcon      from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon       from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon     from '@mui/icons-material/DeleteOutlined'
import CloseIcon              from '@mui/icons-material/Close'
import ChatBubbleOutlineIcon  from '@mui/icons-material/ChatBubbleOutlined'
import TouchAppOutlinedIcon   from '@mui/icons-material/TouchAppOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import SaveOutlinedIcon       from '@mui/icons-material/SaveOutlined'
import HomeOutlinedIcon       from '@mui/icons-material/HomeOutlined'
import ArrowBackIcon          from '@mui/icons-material/ArrowBack'
import RefreshIcon            from '@mui/icons-material/Refresh'
import CheckIcon              from '@mui/icons-material/Check'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import ReplyIcon              from '@mui/icons-material/Reply'
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined'
import { api } from '../../../utils/api'
import { useSystemConfig } from '../../../context/SystemConfigContext'

import {
  PageWrap, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, HeaderRight, HeaderBtn,
  BuilderLayout,
  FlowPanel, FlowPanelHead, FlowPanelTitle, ScreenList, ScreenCard, ScreenCardDot,
  MobileBackBtn,
  ScreenCardInfo, ScreenCardName, RootBadge, ScreenCardMeta, AddScreenBtn,
  EditorPanel, EditorPanelHead, ScreenNameInput, EditorActionBtn, EditorScroll,
  SectionLabel, ItemsList, ItemCard, DragHandle, ItemTypeIcon, ItemContent,
  ItemTypeLabel, ItemText, ItemSubText, ItemActions, ItemActionBtn, AddItemsBar, AddItemBtn,
  EmptyEditor, EmptyEditorIcon, EmptyEditorTitle, EmptyEditorSub, EmptyItemsHint,
  Overlay, ModalCard, ModalHead, ModalTitle, ModalSub, ModalClose, ModalBody,
  FieldGroup, FieldLabel, FieldHint, FieldInput, FieldTextarea, FieldSelect,
  FieldCheckRow, FieldCheckbox, FieldCheckInfo, FieldCheckTitle, FieldCheckSub,
  ModalFoot, ModalBtn,
  ActionTypeGrid, ActionTypeCard, ActionTypeCardIcon, ActionTypeCardTitle, ActionTypeCardSub,
  MsgListWrap, MsgListItem, MsgListRemoveBtn, MsgListAddBtn,
  PreviewOverlay, PreviewContainer, PreviewTopBar, PreviewLabel, PreviewControls, PreviewCtrlBtn,
  PhoneFrame, PhoneChatHeader, PhoneChatAvatar, PhoneChatInfo, PhoneChatName, PhoneChatOnline,
  PhoneChatBody, BotBubble, BotTyping, TypingDot, ButtonsRow, PreviewButton,
  ScreenBreadcrumb,
  SaveToast,
  BankPickerWrap, BankPickerBtn, BankPickerDrop, BankPickerHead, BankPickerItem,
  BankPickerItemLabel, BankPickerItemKey,
} from './BotBuilderPage.styles'

/* ─────────────────────────────
   Data helpers
───────────────────────────── */
const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

function renderBotText(text) {
  if (!text || !text.includes('{{bank.')) return text
  const parts = text.split(/({{bank\.\w+}})/g)
  return parts.map((part, i) =>
    /^{{bank\.\w+}}$/.test(part)
      ? <span key={i} style={{ background: 'rgba(30,133,255,0.2)', color: '#60a5fa', borderRadius: 3, padding: '0 3px', fontSize: '0.92em', fontFamily: 'monospace' }}>{part}</span>
      : part
  )
}

const BANK_FIELDS = [
  { key: 'nombre_titular', label: 'Nombre del titular' },
  { key: 'alias',          label: 'Alias' },
  { key: 'cbu',            label: 'CBU / CVU' },
  { key: 'email',          label: 'Email de la cuenta' },
  { key: 'cuit',           label: 'CUIL / CUIT' },
  { key: 'currency',       label: 'Moneda' },
]

const BankFieldPicker = ({ inputRef, onInsert }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (key) => {
    setOpen(false)
    const placeholder = `{{bank.${key}}}`
    const el = inputRef?.current
    if (!el) {
      onInsert(placeholder)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + placeholder + el.value.slice(end)
    onInsert(next, start + placeholder.length)
  }

  return (
    <BankPickerWrap ref={wrapRef}>
      <BankPickerBtn type="button" onClick={() => setOpen(o => !o)}>
        🏦 Insertar dato
      </BankPickerBtn>
      {open && (
        <BankPickerDrop>
          <BankPickerHead>Cuenta bancaria activa</BankPickerHead>
          {BANK_FIELDS.map(f => (
            <BankPickerItem key={f.key} type="button" onClick={() => handleSelect(f.key)}>
              <BankPickerItemLabel>{f.label}</BankPickerItemLabel>
              <BankPickerItemKey>{`{{bank.${f.key}}}`}</BankPickerItemKey>
            </BankPickerItem>
          ))}
        </BankPickerDrop>
      )}
    </BankPickerWrap>
  )
}

const INITIAL_FLOW = {
  screens: [
    {
      id: 'root',
      name: 'Bienvenida',
      isRoot: true,
      items: [
        { id: 'i1', type: 'message', text: '¡Hola! 👋 Bienvenido/a a BetChat. ¿En qué podemos ayudarte hoy?', order: 0 },
        { id: 'i2', type: 'button', label: '💰 Cargar', actionScreenId: 'screen-cargar', order: 1 },
        { id: 'i3', type: 'button', label: '💸 Retirar', actionScreenId: 'screen-retirar', order: 2 },
        { id: 'i4', type: 'button', label: '🎧 Soporte', actionScreenId: 'screen-soporte', order: 3 },
        { id: 'i5', type: 'button', label: '🎟️ Cuponera', actionScreenId: 'screen-cuponera', order: 4 },
      ],
    },
    {
      id: 'screen-cargar',
      name: 'Cargar Saldo',
      items: [
        { id: 'i6', type: 'message', text: 'Para cargar saldo, realizá una transferencia y envianos el comprobante. 📎', order: 0 },
        { id: 'i7', type: 'button', label: '⬅️ Volver al inicio', actionScreenId: 'root', isBack: true, order: 1 },
      ],
    },
    {
      id: 'screen-retirar',
      name: 'Retirar',
      items: [
        { id: 'i8', type: 'message', text: 'Para procesar tu retiro necesitamos:\n• Monto\n• CBU / Alias\n• Titular de la cuenta', order: 0 },
        { id: 'i9', type: 'button', label: '⬅️ Volver al inicio', actionScreenId: 'root', isBack: true, order: 1 },
      ],
    },
    {
      id: 'screen-soporte',
      name: 'Soporte',
      items: [
        { id: 'i10', type: 'message', text: 'Nuestro equipo de soporte está disponible 24/7. Un agente te atenderá en breve. 🙏', order: 0 },
        { id: 'i11', type: 'button', label: '⬅️ Volver al inicio', actionScreenId: 'root', isBack: true, order: 1 },
      ],
    },
    {
      id: 'screen-cuponera',
      name: 'Cuponera',
      items: [
        { id: 'i12', type: 'message', text: '¡Tenemos grandes promociones activas! 🎉 Ingresá a tu cuenta para ver los bonos disponibles.', order: 0 },
        { id: 'i13', type: 'button', label: '⬅️ Volver al inicio', actionScreenId: 'root', isBack: true, order: 1 },
      ],
    },
  ],
}

/* ═══════════════════════════════════
   Edit Message Modal
═══════════════════════════════════ */
const EditMessageModal = ({ item, onClose, onSave }) => {
  const [text, setText] = useState(item?.text ?? '')
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  const handleInsert = (fullValue, cursorPos) => {
    setText(fullValue)
    if (cursorPos != null) {
      setTimeout(() => {
        ref.current?.focus()
        ref.current?.setSelectionRange(cursorPos, cursorPos)
      }, 0)
    }
  }

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>{item ? 'Editar mensaje' : 'Nuevo mensaje'}</ModalTitle>
            <ModalSub>
              {item ? 'Modificá el texto que verá el cliente' : 'Escribe el mensaje que se enviará al cliente'}
            </ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon style={{ fontSize: 16 }} /></ModalClose>
        </ModalHead>

        <ModalBody>
          <FieldGroup>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <FieldLabel style={{ marginBottom: 0 }}>Texto del mensaje</FieldLabel>
              <BankFieldPicker inputRef={ref} onInsert={handleInsert} />
            </div>
            <FieldTextarea
              ref={ref}
              placeholder="Ej: ¡Hola! 👋 Bienvenido/a. ¿En qué podemos ayudarte?"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <FieldHint>Podés usar emojis, saltos de línea y listas con •</FieldHint>
          </FieldGroup>
        </ModalBody>

        <ModalFoot>
          <ModalBtn $v="ghost" onClick={onClose}>Cancelar</ModalBtn>
          <ModalBtn
            $v="primary"
            onClick={() => text.trim() && onSave(text.trim())}
            disabled={!text.trim()}
          >
            <CheckIcon style={{ fontSize: 14 }} />
            {item ? 'Guardar cambios' : 'Agregar mensaje'}
          </ModalBtn>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

const ResponseMsgRow = ({ value, index, onChange, onRemove }) => {
  const inputRef = useRef(null)
  const handleInsert = (fullValue, cursorPos) => {
    onChange(index, fullValue)
    if (cursorPos != null) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(cursorPos, cursorPos)
      }, 0)
    }
  }
  return (
    <MsgListItem>
      <FieldInput
        ref={inputRef}
        value={value}
        onChange={e => onChange(index, e.target.value)}
        placeholder={`Mensaje ${index + 1}...`}
        style={{ flex: 1 }}
      />
      <BankFieldPicker inputRef={inputRef} onInsert={handleInsert} />
      <MsgListRemoveBtn type="button" onClick={() => onRemove(index)} title="Eliminar mensaje">
        <CloseIcon style={{ fontSize: 13 }} />
      </MsgListRemoveBtn>
    </MsgListItem>
  )
}

/* ═══════════════════════════════════
   Edit Button Modal
═══════════════════════════════════ */
const EditButtonModal = ({ item, screens, currentScreenId, onClose, onSave }) => {
  const isLegacyReceipt = item?.buttonType === 'receipt_request'
  const [label, setLabel]               = useState(item?.label ?? '')
  const [buttonType, setButtonType]     = useState(isLegacyReceipt ? 'messages_only' : (item?.buttonType ?? 'navigate'))
  const [showReceiptAfter, setShowReceiptAfter] = useState(Boolean(item?.showReceiptAfter) || isLegacyReceipt)
  const [receiptProcessing, setReceiptProcessing] = useState(item?.receiptProcessing ?? 'manual')
  const [receiptPrompt, setReceiptPrompt] = useState(item?.receiptPrompt ?? 'Subi una imagen o PDF del comprobante para que podamos validarlo.')
  const [responseMessages, setResponseMessages] = useState(item?.responseMessages || [])
  const [actionScreenId, setAction]     = useState(item?.actionScreenId ?? (screens.find(s => s.id !== currentScreenId)?.id ?? screens[0]?.id ?? ''))
  const [isBack, setIsBack]             = useState(item?.isBack ?? false)
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  const otherScreens = screens.filter(s => s.id !== currentScreenId)
  const cleanedMessages = responseMessages.filter(m => m.trim())

  const handleSave = () => {
    if (!label.trim()) return
    if (buttonType === 'navigate') {
      if (!actionScreenId) return
      if (showReceiptAfter && !receiptPrompt.trim()) return
      onSave({ label: label.trim(), buttonType: 'navigate', receiptProcessing, receiptPrompt: showReceiptAfter ? receiptPrompt.trim() : '', showReceiptAfter, responseMessages: cleanedMessages, actionScreenId, isBack })
      return
    }
    if (showReceiptAfter && !receiptPrompt.trim()) return
    onSave({ label: label.trim(), buttonType: 'messages_only', receiptProcessing, receiptPrompt: showReceiptAfter ? receiptPrompt.trim() : '', showReceiptAfter, responseMessages: cleanedMessages, actionScreenId: '', isBack: false })
  }

  const updateMessage = (index, value) => {
    const next = [...responseMessages]
    next[index] = value
    setResponseMessages(next)
  }

  const removeMessage = (index) => setResponseMessages(responseMessages.filter((_, i) => i !== index))

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>{item ? 'Editar botón' : 'Nuevo botón'}</ModalTitle>
            <ModalSub>Define el texto visible y la acción que realizará</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon style={{ fontSize: 16 }} /></ModalClose>
        </ModalHead>

        <ModalBody>
          <FieldGroup>
            <FieldLabel>Texto del botón</FieldLabel>
            <FieldInput
              ref={ref}
              placeholder="Ej: 💰 Cargar saldo"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <FieldHint>Podés incluir un emoji al inicio para que sea más visual</FieldHint>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Acción del botón</FieldLabel>
            <ActionTypeGrid>
              <ActionTypeCard
                type="button"
                $active={buttonType === 'navigate'}
                onClick={() => setButtonType('navigate')}
              >
                <ActionTypeCardIcon $active={buttonType === 'navigate'}>
                  <KeyboardArrowRightIcon style={{ fontSize: 18 }} />
                </ActionTypeCardIcon>
                <ActionTypeCardTitle $active={buttonType === 'navigate'}>Navegar</ActionTypeCardTitle>
                <ActionTypeCardSub>Lleva al usuario a otra pantalla del flujo</ActionTypeCardSub>
              </ActionTypeCard>
              <ActionTypeCard
                type="button"
                $active={buttonType === 'messages_only'}
                onClick={() => setButtonType('messages_only')}
              >
                <ActionTypeCardIcon $active={buttonType === 'messages_only'}>
                  <span style={{ fontSize: 15 }}>💬</span>
                </ActionTypeCardIcon>
                <ActionTypeCardTitle $active={buttonType === 'messages_only'}>Solo mensajes</ActionTypeCardTitle>
                <ActionTypeCardSub>Envía mensajes sin navegar a otra pantalla</ActionTypeCardSub>
              </ActionTypeCard>
            </ActionTypeGrid>
          </FieldGroup>

          {buttonType === 'navigate' && (
            <FieldGroup>
              <FieldLabel>Navegar a pantalla</FieldLabel>
              <FieldSelect value={actionScreenId} onChange={e => setAction(e.target.value)}>
                {screens.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.isRoot ? '🏠 ' : ''}{s.name}{s.id === currentScreenId ? ' (pantalla actual)' : ''}
                  </option>
                ))}
              </FieldSelect>
              {otherScreens.length === 0 && (
                <FieldHint style={{ color: 'rgba(245,158,11,0.7)' }}>
                  Solo hay una pantalla. Creá más pantallas en el panel izquierdo.
                </FieldHint>
              )}
            </FieldGroup>
          )}

          <FieldGroup>
            <FieldLabel>Mensajes al presionar</FieldLabel>
            <MsgListWrap>
              {responseMessages.map((msg, index) => (
                <ResponseMsgRow
                  key={index}
                  value={msg}
                  index={index}
                  onChange={updateMessage}
                  onRemove={removeMessage}
                />
              ))}
              <MsgListAddBtn
                type="button"
                onClick={() => setResponseMessages([...responseMessages, ''])}
              >
                <AddIcon style={{ fontSize: 13 }} />
                Agregar mensaje
              </MsgListAddBtn>
            </MsgListWrap>
            <FieldHint>Opcional. El bot enviará estos mensajes {buttonType === 'navigate' ? 'antes de navegar' : 'al presionar'}.</FieldHint>
          </FieldGroup>

          <FieldCheckRow>
            <FieldCheckbox
              type="checkbox"
              checked={showReceiptAfter}
              onChange={e => setShowReceiptAfter(e.target.checked)}
            />
            <FieldCheckInfo>
              <FieldCheckTitle>Mostrar botón de cargar comprobante al finalizar</FieldCheckTitle>
              <FieldCheckSub>El cliente verá un botón para subir el comprobante luego de los mensajes</FieldCheckSub>
            </FieldCheckInfo>
          </FieldCheckRow>

          {showReceiptAfter && (
            <>
              <FieldGroup>
                <FieldLabel>Procesamiento del comprobante</FieldLabel>
                <FieldSelect value={receiptProcessing} onChange={e => setReceiptProcessing(e.target.value)}>
                  <option value="auto">Automático por banco activo</option>
                  <option value="manual">Manual por operador</option>
                </FieldSelect>
                <FieldHint>El cliente podrá subir imagen o PDF. El modo queda asociado al botón.</FieldHint>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Texto de solicitud de comprobante</FieldLabel>
                <FieldTextarea
                  value={receiptPrompt}
                  onChange={e => setReceiptPrompt(e.target.value)}
                  placeholder="Ej: Subi el comprobante de pago para validarlo."
                />
              </FieldGroup>
            </>
          )}

          {buttonType === 'navigate' && (
            <FieldCheckRow>
              <FieldCheckbox
                type="checkbox"
                checked={isBack}
                onChange={e => setIsBack(e.target.checked)}
              />
              <FieldCheckInfo>
                <FieldCheckTitle>Marcar como botón "Volver"</FieldCheckTitle>
                <FieldCheckSub>Se mostrará con estilo diferente (color ámbar) indicando que regresa</FieldCheckSub>
              </FieldCheckInfo>
            </FieldCheckRow>
          )}
        </ModalBody>

        <ModalFoot>
          <ModalBtn $v="ghost" onClick={onClose}>Cancelar</ModalBtn>
          <ModalBtn
            $v="primary"
            onClick={handleSave}
            disabled={!label.trim() || (buttonType === 'navigate' && !actionScreenId) || (showReceiptAfter && !receiptPrompt.trim())}
          >
            <CheckIcon style={{ fontSize: 14 }} />
            {item ? 'Guardar cambios' : 'Agregar botón'}
          </ModalBtn>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

/* ═══════════════════════════════════
   Confirm Delete Modal
═══════════════════════════════════ */
const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
  <Overlay onClick={e => e.target === e.currentTarget && onCancel()}>
    <ModalCard onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
      <ModalHead>
        <div>
          <ModalTitle>{title}</ModalTitle>
          <ModalSub>{message}</ModalSub>
        </div>
        <ModalClose onClick={onCancel}><CloseIcon style={{ fontSize: 16 }} /></ModalClose>
      </ModalHead>
      <ModalFoot>
        <ModalBtn $v="ghost" onClick={onCancel}>Cancelar</ModalBtn>
        <ModalBtn $v="danger" onClick={onConfirm}>
          <DeleteOutlinedIcon style={{ fontSize: 14 }} /> Eliminar
        </ModalBtn>
      </ModalFoot>
    </ModalCard>
  </Overlay>
)

/* ═══════════════════════════════════
   Add Screen Modal
═══════════════════════════════════ */
const AddScreenModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalCard onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <ModalHead>
          <div>
            <ModalTitle>Nueva pantalla</ModalTitle>
            <ModalSub>Creá un nuevo paso en el flujo del bot</ModalSub>
          </div>
          <ModalClose onClick={onClose}><CloseIcon style={{ fontSize: 16 }} /></ModalClose>
        </ModalHead>
        <ModalBody>
          <FieldGroup>
            <FieldLabel>Nombre de la pantalla</FieldLabel>
            <FieldInput
              ref={ref}
              placeholder="Ej: Métodos de pago"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
            />
            <FieldHint>El nombre es solo para identificarla en el panel de flujo</FieldHint>
          </FieldGroup>
        </ModalBody>
        <ModalFoot>
          <ModalBtn $v="ghost" onClick={onClose}>Cancelar</ModalBtn>
          <ModalBtn
            $v="primary"
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
          >
            <AddIcon style={{ fontSize: 14 }} /> Crear pantalla
          </ModalBtn>
        </ModalFoot>
      </ModalCard>
    </Overlay>
  )
}

/* ═══════════════════════════════════
   Preview Modal
═══════════════════════════════════ */
const PreviewModal = ({ flow, onClose }) => {
  const { systemConfig } = useSystemConfig()
  const [currentId, setCurrentId]         = useState('root')
  const [history, setHistory]             = useState(['root'])
  const [typing, setTyping]               = useState(false)
  const [previewResponses, setPreviewResponses] = useState([])
  const [showScreenMessages, setShowScreenMessages] = useState(true)
  const [previewUploadBtn, setPreviewUploadBtn] = useState(null)
  const bodyRef = useRef(null)

  const currentScreen = flow.screens.find(s => s.id === currentId)

  const navigate = (screenId, button = null) => {
    const hasResponses = (button?.responseMessages || []).length > 0
    setTyping(true)
    setTimeout(() => {
      setPreviewResponses((button?.responseMessages || []).map((text, index) => ({ id: `${button.id}-${index}`, text })))
      setCurrentId(screenId)
      setHistory(h => [...h, screenId])
      setShowScreenMessages(!hasResponses)
      setPreviewUploadBtn(null)
      setTyping(false)
    }, 600)
  }

  const triggerReceiptPreview = (button) => {
    const isNavWithReceipt = button.buttonType === 'navigate' && button.showReceiptAfter
    setTyping(true)
    setTimeout(() => {
      const responseItems = (button.responseMessages || []).map((text, index) => ({ id: `${button.id}-r-${index}`, text }))
      const promptItems = button.receiptPrompt
        ? [{ id: `${button.id}-prompt`, text: button.receiptPrompt }]
        : []
      setPreviewResponses([...responseItems, ...promptItems])
      if (isNavWithReceipt && button.actionScreenId) {
        setCurrentId(button.actionScreenId)
        setHistory(h => [...h, button.actionScreenId])
      }
      setShowScreenMessages(false)
      setPreviewUploadBtn(button)
      setTyping(false)
    }, 600)
  }

  const reset = () => {
    setCurrentId('root')
    setHistory(['root'])
    setPreviewResponses([])
    setShowScreenMessages(true)
    setPreviewUploadBtn(null)
    setTyping(false)
  }

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [currentId, typing])

  const messages = [...previewResponses, ...(showScreenMessages ? (currentScreen?.items.filter(i => i.type === 'message') ?? []) : [])]
  const buttons  = currentScreen?.items.filter(i => i.type === 'button')  ?? []

  const breadcrumb = history
    .map(id => flow.screens.find(s => s.id === id)?.name ?? id)
    .join(' › ')

  return (
    <PreviewOverlay onClick={e => e.target === e.currentTarget && onClose()}>
      <PreviewContainer>
        <PreviewTopBar>
          <PreviewLabel>Vista previa del bot</PreviewLabel>
          <PreviewControls>
            <PreviewCtrlBtn onClick={reset}>
              <RefreshIcon style={{ fontSize: 13 }} /> Reiniciar
            </PreviewCtrlBtn>
            <PreviewCtrlBtn onClick={onClose}>
              <CloseIcon style={{ fontSize: 13 }} /> Cerrar
            </PreviewCtrlBtn>
          </PreviewControls>
        </PreviewTopBar>

        <PhoneFrame>
          <PhoneChatHeader>
            <PhoneChatAvatar>{systemConfig.logoUrl ? <img src={systemConfig.logoUrl} alt="" /> : systemConfig.appName.slice(0, 2).toUpperCase()}</PhoneChatAvatar>
            <PhoneChatInfo>
              <PhoneChatName>{systemConfig.appName} Bot</PhoneChatName>
              <PhoneChatOnline>En línea</PhoneChatOnline>
            </PhoneChatInfo>
          </PhoneChatHeader>

          <PhoneChatBody ref={bodyRef}>
            <ScreenBreadcrumb>{breadcrumb}</ScreenBreadcrumb>

            {messages.map(msg => (
              <BotBubble key={`${currentId}-${msg.id}`}>{renderBotText(msg.text)}</BotBubble>
            ))}

            {typing && (
              <BotTyping>
                <TypingDot $i={0} />
                <TypingDot $i={1} />
                <TypingDot $i={2} />
              </BotTyping>
            )}

            {!typing && (previewUploadBtn || buttons.length > 0) && (
              <ButtonsRow>
                {previewUploadBtn ? (
                  <PreviewButton $isUpload>
                    📎 Subir comprobante
                  </PreviewButton>
                ) : buttons.map(btn => (
                  <PreviewButton
                    key={btn.id}
                    $isBack={btn.isBack}
                    onClick={() => {
                      const isMessagesOnly = btn.buttonType === 'messages_only' || btn.buttonType === 'receipt_request'
                      if (isMessagesOnly || btn.showReceiptAfter) {
                        triggerReceiptPreview(btn)
                      } else {
                        navigate(btn.actionScreenId, btn)
                      }
                    }}
                  >
                    {btn.label}
                  </PreviewButton>
                ))}
              </ButtonsRow>
            )}

            {!typing && messages.length === 0 && buttons.length === 0 && (
              <BotBubble style={{ color: '#475569', fontStyle: 'italic' }}>
                Esta pantalla no tiene contenido aún.
              </BotBubble>
            )}
          </PhoneChatBody>
        </PhoneFrame>
      </PreviewContainer>
    </PreviewOverlay>
  )
}

/* ═══════════════════════════════════
   Main page component
═══════════════════════════════════ */
const BotBuilderPage = ({ onMenuOpen }) => {
  const [flow, setFlow]                         = useState(INITIAL_FLOW)
  const [selectedScreenId, setSelectedScreenId] = useState('root')
  const [modal, setModal]                       = useState(null)
  const [dragIndex, setDragIndex]               = useState(null)
  const [dragOverIndex, setDragOverIndex]       = useState(null)
  const [toast, setToast]                       = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [isMobile, setIsMobile]                 = useState(() => window.innerWidth < 768)
  const [mobilePanel, setMobilePanel]           = useState('flow')
  const toastTimerRef = useRef(null)

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let alive = true

    const loadFlow = async () => {
      setLoading(true)
      try {
        const data = await api.get('/api/bot-builder')
        const nextFlow = data.flow?.screens?.length ? data.flow : INITIAL_FLOW
        if (!alive) return
        setFlow(nextFlow)
        setSelectedScreenId(nextFlow.screens.find(s => s.isRoot)?.id || nextFlow.screens[0]?.id || 'root')
      } catch (error) {
        if (!alive) return
        notify(error.payload?.error || error.message || 'No se pudo cargar el flujo del bot', 'danger')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadFlow()
    return () => { alive = false }
  }, [notify])

  const selectedScreen = flow.screens.find(s => s.id === selectedScreenId) ?? null

  /* ── flow helpers ── */
  const updateScreen = useCallback((screenId, updater) => {
    setFlow(f => ({
      ...f,
      screens: f.screens.map(s => s.id === screenId ? updater(s) : s),
    }))
  }, [])

  const updateItems = useCallback((screenId, items) => {
    updateScreen(screenId, s => ({ ...s, items }))
  }, [updateScreen])

  /* ── save ── */
  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await api.put('/api/bot-builder', { flow })
      if (data.flow?.screens?.length) setFlow(data.flow)
      notify('Flujo guardado correctamente', 'success')
    } catch (error) {
      const details = Array.isArray(error.payload?.details) ? `: ${error.payload.details.join(', ')}` : ''
      notify(`${error.payload?.error || error.message || 'No se pudo guardar el flujo'}${details}`, 'danger')
    } finally {
      setSaving(false)
    }
  }

  /* ── screen name editing ── */
  const handleScreenRename = (value) => {
    if (!selectedScreen || selectedScreen.isRoot) return
    updateScreen(selectedScreenId, s => ({ ...s, name: value }))
  }

  /* ── select screen (handles mobile panel switch) ── */
  const handleSelectScreen = (id) => {
    setSelectedScreenId(id)
    if (isMobile) setMobilePanel('editor')
  }

  /* ── add screen ── */
  const handleAddScreen = (name) => {
    const id = `screen-${makeId()}`
    setFlow(f => ({
      ...f,
      screens: [
        ...f.screens,
        {
          id,
          name,
          items: [
            { id: makeId(), type: 'button', label: '⬅️ Volver al inicio', actionScreenId: 'root', isBack: true, order: 0 },
          ],
        },
      ],
    }))
    setSelectedScreenId(id)
    if (isMobile) setMobilePanel('editor')
    setModal(null)
  }

  /* ── delete screen ── */
  const handleDeleteScreen = () => {
    if (!selectedScreen || selectedScreen.isRoot) return
    setFlow(f => ({
      ...f,
      screens: f.screens.filter(s => s.id !== selectedScreenId),
    }))
    setSelectedScreenId('root')
    setModal(null)
  }

  /* ── item modals ── */
  const openEditMessage = (item = null) => setModal({ type: 'message', item })
  const openEditButton  = (item = null) => setModal({ type: 'button',  item })

  const handleSaveMessage = (text) => {
    const items = [...selectedScreen.items]
    if (modal.item) {
      const idx = items.findIndex(i => i.id === modal.item.id)
      items[idx] = { ...items[idx], text }
    } else {
      items.push({ id: makeId(), type: 'message', text, order: items.length })
    }
    updateItems(selectedScreenId, items)
    setModal(null)
  }

  const handleSaveButton = ({ label, actionScreenId, isBack, buttonType = 'navigate', receiptProcessing = 'manual', receiptPrompt = '', showReceiptAfter = false, responseMessages = [] }) => {
    const items = [...selectedScreen.items]
    if (modal.item) {
      const idx = items.findIndex(i => i.id === modal.item.id)
      items[idx] = { ...items[idx], label, actionScreenId, isBack, buttonType, receiptProcessing, receiptPrompt, showReceiptAfter, responseMessages }
    } else {
      items.push({ id: makeId(), type: 'button', label, actionScreenId, isBack, buttonType, receiptProcessing, receiptPrompt, showReceiptAfter, responseMessages, order: items.length })
    }
    updateItems(selectedScreenId, items)
    setModal(null)
  }

  const handleDeleteItem = (itemId) => {
    updateItems(selectedScreenId, selectedScreen.items.filter(i => i.id !== itemId))
  }

  /* ── drag & drop ── */
  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (index !== dragIndex) setDragOverIndex(index)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const items = [...selectedScreen.items]
    const [removed] = items.splice(dragIndex, 1)
    items.splice(index, 0, removed)
    updateItems(selectedScreenId, items)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null)
    }
  }

  /* ── render item label ── */
  const getItemLabel = (item) => {
    if (item.type === 'message') return item.text
    return item.label
  }

  const getItemSubLabel = (item) => {
    if (item.type !== 'button') return null
    if (item.buttonType === 'receipt_request') {
      return item.receiptProcessing === 'auto' ? 'Solicita comprobante · Banco activo' : 'Solicita comprobante · Manual'
    }
    const target = flow.screens.find(s => s.id === item.actionScreenId)
    if (!target) return 'Pantalla no encontrada'
    return `→ ${target.name}`
  }

  const getItemTypeLabel = (item) => {
    if (item.type === 'message') return 'Mensaje'
    return item.isBack ? 'Volver' : 'Botón'
  }

  return (
    <PageWrap>

      {/* ── header ── */}
      <PageHeader>
        <HeaderLeft>
          {onMenuOpen && (
            <MenuBtn onClick={onMenuOpen} aria-label="Abrir menú">
              <MenuIcon style={{ fontSize: 20 }} />
            </MenuBtn>
          )}
          <TitleBlock>
            <PageTitle>Constructor del Bot</PageTitle>
            <PageSub>
              {loading ? 'Cargando flujo...' : `${flow.screens.length} pantallas · arrastrar para reordenar`}
            </PageSub>
          </TitleBlock>
        </HeaderLeft>

        <HeaderRight>
          <HeaderBtn $v="ghost" onClick={() => setModal({ type: 'preview' })}>
            <VisibilityOutlinedIcon style={{ fontSize: 15 }} />
            <span>Vista previa</span>
          </HeaderBtn>
          <HeaderBtn $v="primary" onClick={handleSave} disabled={saving || loading}>
            <SaveOutlinedIcon style={{ fontSize: 15 }} />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </HeaderBtn>
        </HeaderRight>
      </PageHeader>

      {/* ── main layout ── */}
      <BuilderLayout>

        {/* ── flow panel (left / mobile full) ── */}
        <FlowPanel $hidden={isMobile && mobilePanel === 'editor'}>
          <FlowPanelHead>
            <FlowPanelTitle>Pantallas del flujo</FlowPanelTitle>
          </FlowPanelHead>

          <ScreenList>
            {flow.screens.map(screen => (
              <ScreenCard
                key={screen.id}
                $active={screen.id === selectedScreenId}
                onClick={() => handleSelectScreen(screen.id)}
              >
                <ScreenCardDot $root={screen.isRoot}>
                  {screen.isRoot ? <HomeOutlinedIcon style={{ fontSize: 14 }} /> : <ChatBubbleOutlineIcon style={{ fontSize: 13 }} />}
                </ScreenCardDot>
                <ScreenCardInfo>
                  <ScreenCardName $active={screen.id === selectedScreenId}>
                    {screen.name}
                    {screen.isRoot && <RootBadge>Inicio</RootBadge>}
                  </ScreenCardName>
                  <ScreenCardMeta>
                    {screen.items.filter(i => i.type === 'message').length} mens.
                    {' · '}
                    {screen.items.filter(i => i.type === 'button').length} bot.
                  </ScreenCardMeta>
                </ScreenCardInfo>
              </ScreenCard>
            ))}

            <AddScreenBtn onClick={() => setModal({ type: 'add-screen' })}>
              <AddIcon style={{ fontSize: 15 }} />
              Nueva pantalla
            </AddScreenBtn>
          </ScreenList>
        </FlowPanel>

        {/* ── editor panel (right / mobile full) ── */}
        <EditorPanel $hidden={isMobile && mobilePanel === 'flow'}>
          {!selectedScreen ? (
            <EmptyEditor>
              <EmptyEditorIcon>🤖</EmptyEditorIcon>
              <EmptyEditorTitle>Seleccioná una pantalla</EmptyEditorTitle>
              <EmptyEditorSub>Hacé click en una pantalla del panel izquierdo para editarla</EmptyEditorSub>
            </EmptyEditor>
          ) : (
            <>
              {/* editor head */}
              <EditorPanelHead>
                <MobileBackBtn
                  type="button"
                  onClick={() => setMobilePanel('flow')}
                  aria-label="Volver a pantallas"
                >
                  <ArrowBackIcon />
                  Pantallas
                </MobileBackBtn>

                <ScreenNameInput
                  value={selectedScreen.name}
                  onChange={e => handleScreenRename(e.target.value)}
                  readOnly={selectedScreen.isRoot}
                  placeholder="Nombre de la pantalla"
                  title={selectedScreen.isRoot ? 'La pantalla de inicio no puede renombrarse' : 'Clic para editar el nombre'}
                />

                {!selectedScreen.isRoot && (
                  <EditorActionBtn
                    $danger
                    onClick={() => setModal({ type: 'confirm-delete-screen' })}
                    title="Eliminar pantalla"
                  >
                    <DeleteOutlinedIcon style={{ fontSize: 16 }} />
                  </EditorActionBtn>
                )}
              </EditorPanelHead>

              {/* editor body */}
              <EditorScroll>
                <SectionLabel>
                  Elementos · arrastrar para reordenar
                </SectionLabel>

                {selectedScreen.items.length === 0 ? (
                  <EmptyItemsHint>
                    <InfoOutlinedIcon style={{ fontSize: 15 }} />
                    Esta pantalla no tiene elementos. Añadí mensajes o botones abajo.
                  </EmptyItemsHint>
                ) : (
                  <ItemsList onDragLeave={handleDragLeave}>
                    {selectedScreen.items.map((item, index) => (
                      <ItemCard
                        key={item.id}
                        draggable
                        $dragging={dragIndex === index}
                        $dropTarget={dragOverIndex === index && dragIndex !== index}
                        onDragStart={e => handleDragStart(e, index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDrop={e => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <DragHandle>
                          <DragIndicatorIcon style={{ fontSize: 16 }} />
                        </DragHandle>

                        <ItemTypeIcon $type={item.type} $isBack={item.isBack}>
                          {item.type === 'message'
                            ? <ChatBubbleOutlineIcon style={{ fontSize: 14 }} />
                            : item.isBack
                              ? <ReplyIcon style={{ fontSize: 14 }} />
                              : <TouchAppOutlinedIcon style={{ fontSize: 14 }} />
                          }
                        </ItemTypeIcon>

                        <ItemContent>
                          <ItemTypeLabel $type={item.type} $isBack={item.isBack}>
                            {getItemTypeLabel(item)}
                          </ItemTypeLabel>
                          <ItemText title={getItemLabel(item)}>
                            {getItemLabel(item)}
                          </ItemText>
                          {getItemSubLabel(item) && (
                            <ItemSubText>
                              <KeyboardArrowRightIcon style={{ fontSize: 12 }} />
                              {getItemSubLabel(item)}
                            </ItemSubText>
                          )}
                        </ItemContent>

                        <ItemActions>
                          <ItemActionBtn
                            onClick={() => item.type === 'message'
                              ? openEditMessage(item)
                              : openEditButton(item)
                            }
                            title="Editar"
                          >
                            <EditOutlinedIcon style={{ fontSize: 14 }} />
                          </ItemActionBtn>
                          <ItemActionBtn
                            $danger
                            onClick={() => handleDeleteItem(item.id)}
                            title="Eliminar"
                          >
                            <DeleteOutlinedIcon style={{ fontSize: 14 }} />
                          </ItemActionBtn>
                        </ItemActions>
                      </ItemCard>
                    ))}
                  </ItemsList>
                )}

                <AddItemsBar>
                  <AddItemBtn $type="message" onClick={() => openEditMessage()}>
                    <ChatBubbleOutlineIcon style={{ fontSize: 13 }} />
                    Agregar mensaje
                  </AddItemBtn>
                  <AddItemBtn $type="button" onClick={() => openEditButton()}>
                    <TouchAppOutlinedIcon style={{ fontSize: 13 }} />
                    Agregar botón
                  </AddItemBtn>
                </AddItemsBar>
              </EditorScroll>
            </>
          )}
        </EditorPanel>
      </BuilderLayout>

      {/* ── modals ── */}

      {modal?.type === 'message' && (
        <EditMessageModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={handleSaveMessage}
        />
      )}

      {modal?.type === 'button' && (
        <EditButtonModal
          item={modal.item}
          screens={flow.screens}
          currentScreenId={selectedScreenId}
          onClose={() => setModal(null)}
          onSave={handleSaveButton}
        />
      )}

      {modal?.type === 'add-screen' && (
        <AddScreenModal
          onClose={() => setModal(null)}
          onSave={handleAddScreen}
        />
      )}

      {modal?.type === 'confirm-delete-screen' && (
        <ConfirmModal
          title="Eliminar pantalla"
          message={`¿Eliminás "${selectedScreen?.name}"? Los botones que apuntaban a esta pantalla quedarán sin destino.`}
          onConfirm={handleDeleteScreen}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'preview' && (
        <PreviewModal
          flow={flow}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── save toast ── */}
      {toast && (
        <SaveToast $type={toast.type}>
          <CheckIcon style={{ fontSize: 15 }} />
          {toast.message}
        </SaveToast>
      )}

    </PageWrap>
  )
}

export default BotBuilderPage
