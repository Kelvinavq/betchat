import { useCallback, useEffect, useState } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import { api } from '../../../utils/api'
import {
  Wrap, Header, Title, Sub,
  Grid, Card, CardTop, CardLeft, IconBubble, CardMeta, CardLabel, CardDesc,
  Toggle, Textarea, Footer, SaveBtn, StatusLine,
} from './AutoMessagesSection.styles'

const MESSAGE_DEFS = [
  {
    event: 'receipt_received',
    label: 'Comprobante recibido',
    desc: 'Se envía al instante cuando el cliente sube una imagen o PDF',
    icon: '📄',
    bg: 'rgba(99,102,241,0.13)',
  },
  {
    event: 'receipt_duplicate',
    label: 'Comprobante duplicado',
    desc: 'Se envía cuando el ID de transacción ya existe en el sistema',
    icon: '🔁',
    bg: 'rgba(245,158,11,0.13)',
  },
  {
    event: 'receipt_invalid',
    label: 'Comprobante inválido',
    desc: 'Se envía cuando la IA no puede leer o validar el comprobante',
    icon: '❌',
    bg: 'rgba(239,68,68,0.13)',
  },
  {
    event: 'receipt_insufficient_info',
    label: 'Información insuficiente',
    desc: 'Se envía cuando la IA detecta datos incompletos en el comprobante',
    icon: '⚠️',
    bg: 'rgba(249,115,22,0.13)',
  },
  {
    event: 'deposit_completed',
    label: 'Depósito completado',
    desc: 'Se envía cuando el operador marca el movimiento como pagado',
    icon: '✅',
    bg: 'rgba(16,185,129,0.13)',
  },
  {
    event: 'deposit_completed_report',
    label: 'Depósito reportado',
    desc: 'Se envía cuando el cliente reporta un pago HGCash y se acredita',
    icon: '💳',
    bg: 'rgba(34,197,94,0.13)',
  },
  {
    event: 'deposit_failed',
    label: 'Depósito rechazado',
    desc: 'Se envía cuando el operador rechaza el movimiento',
    icon: '🚫',
    bg: 'rgba(239,68,68,0.13)',
  },
  {
    event: 'receipt_reupload',
    label: 'Reenviar comprobante',
    desc: 'Se envía cuando el operador solicita que el cliente suba el comprobante nuevamente',
    icon: '📤',
    bg: 'rgba(56,189,248,0.13)',
  },
  {
    event: 'receipt_amount_low',
    label: 'Monto menor al permitido',
    desc: 'Se envía cuando el monto del comprobante es inferior al mínimo configurado',
    icon: '💸',
    bg: 'rgba(245,158,11,0.13)',
  },
  {
    event: 'hgcash_payment_not_found',
    label: 'Pago HGCash no encontrado',
    desc: 'Se envía cuando el cliente reporta pago con CUIL pero no hay un movimiento pendiente',
    icon: '🔎',
    bg: 'rgba(56,189,248,0.13)',
  },
  {
    event: 'withdrawal_approved',
    label: 'Retiro aprobado',
    desc: 'Se envía cuando el operador aprueba un retiro y se reinicia el bot del cliente',
    icon: '💸',
    bg: 'rgba(16,185,129,0.13)',
  },
  {
    event: 'withdrawal_rejected',
    label: 'Retiro rechazado',
    desc: 'Se envía cuando el operador rechaza un retiro',
    icon: '🚫',
    bg: 'rgba(239,68,68,0.13)',
  },
]

export default function AutoMessagesSection() {
  const [messages, setMessages] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/settings/auto-messages')
      const map = {}
      for (const m of data.messages || []) {
        map[m.event] = { message: m.message, isActive: m.isActive }
      }
      setMessages(map)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los mensajes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setField = (event, field, value) => {
    setMessages(prev => ({
      ...prev,
      [event]: { ...prev[event], [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = MESSAGE_DEFS.map(def => ({
        event:    def.event,
        message:  messages[def.event]?.message ?? '',
        isActive: messages[def.event]?.isActive ?? true,
      }))
      await api.put('/api/settings/auto-messages', { messages: payload })
      setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } catch (err) {
      setError(err.message || 'No se pudieron guardar los mensajes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Wrap>
        <StatusLine>Cargando mensajes...</StatusLine>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <Header>
        <Title>Mensajes automáticos</Title>
        <Sub>
          Configurá los mensajes que el sistema envía automáticamente al cliente en cada situación.
        </Sub>
      </Header>

      <Grid>
        {MESSAGE_DEFS.map(def => {
          const state = messages[def.event] || { message: '', isActive: true }
          return (
            <Card key={def.event}>
              <CardTop>
                <CardLeft>
                  <IconBubble $bg={def.bg}>{def.icon}</IconBubble>
                  <CardMeta>
                    <CardLabel>{def.label}</CardLabel>
                    <CardDesc>{def.desc}</CardDesc>
                  </CardMeta>
                </CardLeft>
                <Toggle
                  type="button"
                  $on={state.isActive}
                  onClick={() => setField(def.event, 'isActive', !state.isActive)}
                  title={state.isActive ? 'Desactivar mensaje' : 'Activar mensaje'}
                />
              </CardTop>

              <Textarea
                value={state.message}
                onChange={e => setField(def.event, 'message', e.target.value)}
                placeholder="Escribe el mensaje automático..."
                disabled={!state.isActive}
              />
            </Card>
          )
        })}
      </Grid>

      <Footer>
        {error && <StatusLine $error>{error}</StatusLine>}
        <SaveBtn
          type="button"
          $saved={saved}
          disabled={saving}
          onClick={handleSave}
        >
          {saved ? <><CheckIcon />Guardado</> : saving ? 'Guardando...' : 'Guardar mensajes'}
        </SaveBtn>
      </Footer>
    </Wrap>
  )
}
