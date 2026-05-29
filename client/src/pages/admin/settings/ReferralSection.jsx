import { useEffect, useState } from 'react'
import styled from 'styled-components'
import CardGiftcardOutlinedIcon  from '@mui/icons-material/CardGiftcardOutlined'
import PeopleAltOutlinedIcon     from '@mui/icons-material/PeopleAltOutlined'
import LinkOutlinedIcon          from '@mui/icons-material/LinkOutlined'
import ContentCopyIcon           from '@mui/icons-material/ContentCopy'
import CheckIcon                 from '@mui/icons-material/Check'
import InfoOutlinedIcon          from '@mui/icons-material/InfoOutlined'
import { api } from '../../../utils/api'
import { useToast } from '../../../context/ToastContext'

/* ─── Styled components ─────────────────────────────────────────────── */
const Wrap = styled.div`display:flex;flex-direction:column;gap:20px;`

const Card = styled.div`
  background: var(--bg-card, #1a1a2e);
  border: 1px solid var(--border, rgba(255,255,255,.08));
  border-radius: 14px;
  overflow: hidden;
`
const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.07));
`
const CardIcon = styled.div`
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${p => p.$bg || 'rgba(99,102,241,.15)'};
  color: ${p => p.$color || '#818cf8'};
  flex-shrink: 0;
  svg { font-size: 20px; }
`
const CardTitle  = styled.div`font-size:.94rem;font-weight:600;color:var(--text,#e2e8f0);`
const CardSub    = styled.div`font-size:.78rem;color:var(--text-muted,#94a3b8);margin-top:2px;`
const CardBody   = styled.div`padding:20px;`

/* Toggle row */
const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`
const ToggleText = styled.div`flex: 1; min-width: 0;`
const ToggleTitle = styled.div`font-size:.875rem;font-weight:500;color:var(--text,#e2e8f0);`
const ToggleSub   = styled.div`font-size:.775rem;color:var(--text-muted,#94a3b8);margin-top:2px;`
const ToggleSwitch = styled.button`
  flex-shrink: 0;
  width: 44px; height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  background: ${p => p.$on ? 'rgba(99,102,241,.9)' : 'rgba(255,255,255,.15)'};
  transition: background .2s;
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${p => p.$on ? '23px' : '3px'};
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: left .2s;
  }
`

/* Fichas input */
const InputRow = styled.div`display:flex;align-items:center;gap:12px;flex-wrap:wrap;`
const FieldLabel = styled.label`font-size:.8rem;font-weight:500;color:var(--text-muted,#94a3b8);display:block;margin-bottom:6px;`
const NumberInput = styled.input`
  width: 120px;
  padding: 9px 14px;
  border-radius: 8px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  color: var(--text,#e2e8f0);
  font-size:.875rem;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: rgba(99,102,241,.6); }
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button { opacity: 1; }
`
const InputHint = styled.div`font-size:.75rem;color:var(--text-muted,#94a3b8);`

/* Save button */
const SaveBtn = styled.button`
  padding: 9px 22px;
  border-radius: 8px;
  background: rgba(99,102,241,.85);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: .875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: ${p => p.disabled ? .5 : 1};
  pointer-events: ${p => p.disabled ? 'none' : 'auto'};
  &:hover { background: rgba(99,102,241,1); }
`

/* Info banner */
const InfoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(99,102,241,.07);
  border: 1px solid rgba(99,102,241,.2);
  font-size: .8rem;
  color: rgba(255,255,255,.65);
  line-height: 1.55;
  svg { font-size: 17px; color: #818cf8; flex-shrink: 0; margin-top: 1px; }
`

/* Link preview */
const LinkPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
`
const LinkText = styled.div`
  flex: 1;
  font-size: .8rem;
  color: #818cf8;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const CopyBtn = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted, #94a3b8);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 6px;
  transition: color .15s, background .15s;
  svg { font-size: 16px; }
  &:hover { background: rgba(255,255,255,.08); color: var(--text,#e2e8f0); }
`

const Divider = styled.div`height: 1px; background: rgba(255,255,255,.06); margin: 16px 0;`

/* ─── Component ──────────────────────────────────────────────────────── */
export default function ReferralSection() {
  const toast = useToast()

  const [enabled,  setEnabled]  = useState(true)
  const [fichas,   setFichas]   = useState(0)
  const [saving,   setSaving]   = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [copied,   setCopied]   = useState(false)

  const chatOrigin = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, '')
  const exampleLink = `${chatOrigin}?ref=XXXX-YY99`

  /* Load current settings */
  useEffect(() => {
    api.get('/api/settings')
      .then(data => {
        const cfg = data.systemConfig || {}
        setEnabled(cfg.referralEnabled !== false)
        setFichas(Number(cfg.referralFichas) || 0)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.put('/api/settings/system', {
        referralEnabled: enabled,
        referralFichas:  Math.max(0, parseInt(fichas, 10) || 0),
      })
      toast.success('Configuración de referidos guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const copyExample = () => {
    navigator.clipboard?.writeText(exampleLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!loaded) return null

  return (
    <Wrap>
      {/* ── Enable / disable ── */}
      <Card>
        <CardHead>
          <CardIcon $bg="rgba(99,102,241,.15)" $color="#818cf8">
            <PeopleAltOutlinedIcon />
          </CardIcon>
          <div>
            <CardTitle>Sistema de referidos</CardTitle>
            <CardSub>Premiá a tus usuarios por traer nuevos jugadores</CardSub>
          </div>
        </CardHead>
        <CardBody>
          <ToggleRow>
            <ToggleText>
              <ToggleTitle>Activar sistema de referidos</ToggleTitle>
              <ToggleSub>
                Cuando está activo, los usuarios pueden compartir su código o enlace.
                Al primer depósito del referido, el referente recibe las fichas configuradas.
              </ToggleSub>
            </ToggleText>
            <ToggleSwitch $on={enabled} onClick={() => setEnabled(p => !p)} aria-label="Toggle referidos" />
          </ToggleRow>
        </CardBody>
      </Card>

      {/* ── Fichas reward ── */}
      <Card>
        <CardHead>
          <CardIcon $bg="rgba(245,158,11,.12)" $color="#f59e0b">
            <CardGiftcardOutlinedIcon />
          </CardIcon>
          <div>
            <CardTitle>Fichas por referido</CardTitle>
            <CardSub>Cantidad que se acredita al referente cuando su invitado hace el primer depósito</CardSub>
          </div>
        </CardHead>
        <CardBody>
          <div>
            <FieldLabel htmlFor="ref-fichas">Fichas a acreditar</FieldLabel>
            <InputRow>
              <NumberInput
                id="ref-fichas"
                type="number"
                min="0"
                max="99999"
                step="1"
                value={fichas}
                onChange={e => setFichas(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <InputHint>fichas por cada referido que realice su primer depósito</InputHint>
            </InputRow>
          </div>

          <Divider />

          <InfoBanner>
            <InfoOutlinedIcon />
            <span>
              Las fichas <strong>no se acreditan automáticamente</strong> en la plataforma de casino.
              El usuario referente recibirá una notificación en el chat. Un agente deberá verificar
              y acreditar las fichas manualmente o a través de la integración de la plataforma.
            </span>
          </InfoBanner>

          <div style={{ marginTop: 16 }}>
            <SaveBtn onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </SaveBtn>
          </div>
        </CardBody>
      </Card>

      {/* ── Link format ── */}
      <Card>
        <CardHead>
          <CardIcon $bg="rgba(56,189,248,.12)" $color="#38bdf8">
            <LinkOutlinedIcon />
          </CardIcon>
          <div>
            <CardTitle>Formato del enlace de referido</CardTitle>
            <CardSub>Así se ve el link que cada usuario puede compartir</CardSub>
          </div>
        </CardHead>
        <CardBody>
          <FieldLabel>Ejemplo de enlace</FieldLabel>
          <LinkPreview>
            <LinkText>{exampleLink}</LinkText>
            <CopyBtn onClick={copyExample} title="Copiar ejemplo">
              {copied ? <CheckIcon /> : <ContentCopyIcon />}
            </CopyBtn>
          </LinkPreview>
          <div style={{ marginTop: 12, fontSize: '.775rem', color: 'var(--text-muted,#94a3b8)', lineHeight: 1.6 }}>
            El código <strong>XXXX-YY99</strong> se reemplaza por el código único de cada usuario.
            Cuando alguien accede al chat por ese enlace, el código se aplica automáticamente.
            También pueden ingresarlo manualmente en el formulario de inicio de sesión o registro.
          </div>
        </CardBody>
      </Card>
    </Wrap>
  )
}
