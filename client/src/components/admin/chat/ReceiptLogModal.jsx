import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes, css } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import TerminalIcon from '@mui/icons-material/Terminal'
import DataObjectIcon from '@mui/icons-material/DataObject'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { api } from '../../../utils/api'

/* ─── animations ─────────────────────────────────────────── */
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
`

/* ─── layout ─────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
`

const Drawer = styled.div`
  width: min(580px, 100vw);
  height: auto;
  max-height: calc(100vh - 24px);
  margin: 12px 0;
  background: var(--bc-admin-sidebar-bg, #0f0f1e);
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
  background: var(--bc-admin-topbar-bg, #0d0d1b);
  position: sticky;
  top: 0;
  z-index: 2;
`

const HeadIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #a78bfa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { font-size: 18px; }
`

const HeadInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const HeadTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HeadMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 1px;
`

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  color: rgba(255, 255, 255, 0.38);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
  svg { font-size: 18px; }
  &:hover { color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.06); }
`

const Body = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

/* ─── badges ─────────────────────────────────────────────── */
const PROVIDER_COLORS = {
  mercadopago: { bg: 'rgba(0, 176, 155, 0.12)', border: 'rgba(0, 176, 155, 0.3)', text: '#34d399' },
  hgcash:      { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
  manual:      { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
}

const RESULT_COLORS = {
  paid:             { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80' },
  pending:          { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
  duplicate:        { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', text: '#fb923c' },
  invalid:          { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
  insufficient_info:{ bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
  amount_low:       { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
  error:            { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
}

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.08)'};
  border: 1px solid ${({ $border }) => $border || 'rgba(255,255,255,0.12)'};
  color: ${({ $text }) => $text || 'rgba(255,255,255,0.6)'};
`

/* ─── section ─────────────────────────────────────────────── */
const Section = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  overflow: hidden;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
`

const SectionIcon = styled.div`
  color: ${({ $color }) => $color || 'rgba(139, 92, 246, 0.8)'};
  display: flex;
  align-items: center;
  svg { font-size: 15px; }
`

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const SectionBody = styled.div`
  padding: 12px 14px;
`

const ScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

/* ─── model pill ─────────────────────────────────────────── */
const ModelPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  font-size: 12px;
  color: #a78bfa;
  font-weight: 500;
  margin-bottom: 10px;
  svg { font-size: 14px; }
`

/* ─── code block ─────────────────────────────────────────── */
const CodeWrap = styled.div`
  position: relative;
  &:hover button { opacity: 1; }
`

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px;
  font-size: 11.5px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  color: rgba(255, 255, 255, 0.78);
  overflow-x: auto;
  overflow-y: auto;
  max-height: none;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
`

const CopyBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity 0.15s;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.6);
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { font-size: 13px; }
  &:hover { color: #fff; background: rgba(0,0,0,0.8); }
`

/* ─── key-value grid ─────────────────────────────────────── */
const KvGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  align-items: start;
`

const KvKey = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  padding-top: 1px;
`

const KvVal = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
  font-family: ${({ $mono }) => $mono ? "'JetBrains Mono', 'Fira Code', monospace" : 'inherit'};
  word-break: break-all;
`

const ConfidenceDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  background: ${({ $level }) => ({ high: '#4ade80', medium: '#fbbf24', low: '#f87171' }[$level] || '#6b7280')};
`

/* ─── timeline ───────────────────────────────────────────── */
const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const STEP_META = {
  ai_extraction_start:    { icon: '⚙', color: '#6b7280', label: 'Iniciando extracción IA' },
  ai_extraction_complete: { icon: '✓', color: '#4ade80', label: 'Extracción IA completada' },
  ai_extraction_error:    { icon: '✗', color: '#f87171', label: 'Error en extracción IA' },
  validation_ok:          { icon: '✓', color: '#4ade80', label: 'Validación exitosa' },
  validation_failed:      { icon: '✗', color: '#f87171', label: 'Validación fallida' },
  amount_too_low:         { icon: '⚠', color: '#fbbf24', label: 'Monto por debajo del mínimo' },
  no_active_account:      { icon: '✗', color: '#f87171', label: 'Sin cuenta activa' },
  mp_api_lookup_start:    { icon: '⟳', color: '#60a5fa', label: 'Consultando API Mercado Pago' },
  mp_api_lookup_found:    { icon: '✓', color: '#4ade80', label: 'Pago encontrado en Mercado Pago' },
  mp_api_lookup_not_found:{ icon: '✗', color: '#f87171', label: 'Pago no encontrado en Mercado Pago' },
  movement_lookup_start:  { icon: '⟳', color: '#60a5fa', label: 'Buscando movimiento HG Cash' },
  movement_lookup_found:  { icon: '✓', color: '#4ade80', label: 'Movimiento HG Cash encontrado' },
  movement_lookup_not_found: { icon: '✗', color: '#f87171', label: 'Movimiento HG Cash no encontrado' },
  duplicate_found:        { icon: '⚠', color: '#fb923c', label: 'Comprobante duplicado detectado' },
  duplicate_check_ok:     { icon: '✓', color: '#4ade80', label: 'Sin duplicados' },
  panel_credit_start:     { icon: '⟳', color: '#60a5fa', label: 'Acreditando en panel' },
  panel_credit_ok:        { icon: '✓', color: '#4ade80', label: 'Acreditación en panel exitosa' },
  panel_credit_failed:    { icon: '✗', color: '#f87171', label: 'Error al acreditar en panel' },
  movement_saved:         { icon: '✓', color: '#4ade80', label: 'Movimiento guardado' },
  movement_updated:       { icon: '✓', color: '#4ade80', label: 'Movimiento actualizado' },
  movement_created:       { icon: '✓', color: '#4ade80', label: 'Movimiento creado (pendiente revisión)' },
  error:                  { icon: '✗', color: '#f87171', label: 'Error inesperado' },
}

const TlItem = styled.div`
  display: flex;
  gap: 12px;
  position: relative;
  padding-bottom: 12px;
  &:last-child { padding-bottom: 0; }
  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 14px;
    top: 28px;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
`

const TlDot = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}1a` || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ $color }) => `${$color}4d` || 'rgba(255,255,255,0.1)'};
  color: ${({ $color }) => $color || 'rgba(255,255,255,0.5)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
`

const TlContent = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 4px;
`

const TlLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  margin-bottom: 2px;
`

const TlTime = styled.div`
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.28);
  margin-bottom: 4px;
  font-family: monospace;
`

const TlDetail = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: rgba(255, 255, 255, 0.55);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
`

/* ─── result section ─────────────────────────────────────── */
const ResultCard = styled.div`
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.03)'};
  border: 1px solid ${({ $border }) => $border || 'rgba(255,255,255,0.1)'};
  border-radius: 10px;
  padding: 14px;
`

const ResultScroll = styled.div``

const ResultStatus = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $text }) => $text || 'rgba(255,255,255,0.9)'};
  margin-bottom: 4px;
`

const ResultReason = styled.div`
  font-size: 11.5px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 10px;
`

/* ─── loading / error states ─────────────────────────────── */
const CenterState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 40px 20px;
  text-align: center;
`

/* ─── helpers ─────────────────────────────────────────────── */
const AI_MODEL_LABELS = {
  'google/gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  'google/gemini-2.0-flash-001': 'Gemini 2.0 Flash',
  'openai/gpt-4o-mini': 'GPT-4o Mini',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'openai/gpt-4o': 'GPT-4o',
}

const PROVIDER_LABELS = {
  mercadopago: 'Mercado Pago',
  hgcash: 'HG Cash',
  manual: 'Manual',
}

const RESULT_LABELS = {
  paid: 'Acreditado',
  pending: 'Pendiente revisión',
  duplicate: 'Duplicado',
  invalid: 'Inválido',
  insufficient_info: 'Info insuficiente',
  amount_low: 'Monto bajo',
  error: 'Error interno',
}

function formatTs(isoStr) {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
  } catch {
    return isoStr
  }
}

function formatDetailObj(obj) {
  if (!obj) return ''
  return JSON.stringify(obj, null, 2)
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

/* ─── main component ─────────────────────────────────────── */
export default function ReceiptLogModal({ chatId, messageId, onClose }) {
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chatId || !messageId) return
    setLoading(true)
    setError(null)
    api.get(`/api/chats/${chatId}/messages/${messageId}/receipt-log`)
      .then(data => setLog(data.log))
      .catch(err => setError(err?.message || 'No se pudo cargar el log'))
      .finally(() => setLoading(false))
  }, [chatId, messageId])

  const providerColors = PROVIDER_COLORS[log?.provider] || {}
  const resultColors = RESULT_COLORS[log?.resultStatus] || {}

  const extracted = log?.aiExtractedJson || {}
  const steps = log?.processingSteps || []

  return createPortal(
    <Overlay onClick={onClose}>
      <Drawer onClick={e => e.stopPropagation()}>
        <Head>
          <HeadIcon><SmartToyOutlinedIcon /></HeadIcon>
          <HeadInfo>
            <HeadTitle>Log de procesamiento del comprobante</HeadTitle>
            <HeadMeta>
              {log ? `${PROVIDER_LABELS[log.provider] || log.provider} · ${log.createdAt ? new Date(log.createdAt).toLocaleString('es-AR') : ''}` : 'Cargando...'}
            </HeadMeta>
          </HeadInfo>
          <CloseBtn onClick={onClose}><CloseIcon /></CloseBtn>
        </Head>

        <Body>
          {loading && (
            <CenterState>
              <HourglassEmptyIcon style={{ fontSize: 32 }} />
              Cargando log...
            </CenterState>
          )}

          {!loading && error && (
            <CenterState>
              <CancelOutlinedIcon style={{ fontSize: 32, color: '#f87171' }} />
              {error === 'No se pudo cargar el log' && !log
                ? 'No hay log registrado para este comprobante.'
                : error}
            </CenterState>
          )}

          {!loading && log && (
            <>
              {/* ── badges ── */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge $bg={providerColors.bg} $border={providerColors.border} $text={providerColors.text}>
                  {PROVIDER_LABELS[log.provider] || log.provider}
                </Badge>
                {log.resultStatus && (
                  <Badge $bg={resultColors.bg} $border={resultColors.border} $text={resultColors.text}>
                    {RESULT_LABELS[log.resultStatus] || log.resultStatus}
                  </Badge>
                )}
                {log.movementId && (
                  <Badge>mov #{log.movementId}</Badge>
                )}
              </div>

              {/* ── AI extraction ── */}
              <Section>
                <SectionHead>
                  <SectionIcon $color="#a78bfa"><SmartToyOutlinedIcon /></SectionIcon>
                  <SectionTitle>Extracción por IA</SectionTitle>
                </SectionHead>
                <SectionBody>
                  <ScrollArea>
                    {log.aiModel && (
                      <ModelPill>
                        <SmartToyOutlinedIcon />
                        {AI_MODEL_LABELS[log.aiModel] || log.aiModel}
                      </ModelPill>
                    )}
                    {!log.aiModel && !log.aiRawResponse && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Sin datos de extracción IA</div>
                    )}

                    {log.aiRawResponse && (
                      <>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          <TerminalIcon style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }} />
                          Respuesta cruda de la IA
                        </div>
                        <CodeWrap>
                          <CodeBlock>{log.aiRawResponse}</CodeBlock>
                          <CopyBtn type="button" title="Copiar" onClick={() => copyText(log.aiRawResponse)}>
                            <ContentCopyIcon />
                          </CopyBtn>
                        </CodeWrap>
                      </>
                    )}

                    {log.aiExtractedJson && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          <DataObjectIcon style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }} />
                          Datos extraídos (normalizado)
                        </div>
                        <KvGrid>
                          {extracted.amount != null && (
                            <>
                              <KvKey>Monto</KvKey>
                              <KvVal $mono>${Number(extracted.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</KvVal>
                            </>
                          )}
                          {extracted.transaction_id && (
                            <>
                              <KvKey>ID transacción</KvKey>
                              <KvVal $mono>{extracted.transaction_id}</KvVal>
                            </>
                          )}
                          {extracted.id_type && (
                            <>
                              <KvKey>Tipo ID</KvKey>
                              <KvVal>{extracted.id_type}</KvVal>
                            </>
                          )}
                          {extracted.date && (
                            <>
                              <KvKey>Fecha</KvKey>
                              <KvVal $mono>{extracted.date}</KvVal>
                            </>
                          )}
                          {extracted.time && (
                            <>
                              <KvKey>Hora</KvKey>
                              <KvVal $mono>{extracted.time}</KvVal>
                            </>
                          )}
                          {extracted.cuit && (
                            <>
                              <KvKey>CUIT</KvKey>
                              <KvVal $mono>{extracted.cuit}</KvVal>
                            </>
                          )}
                          {extracted.cbu_cvu && (
                            <>
                              <KvKey>CBU/CVU</KvKey>
                              <KvVal $mono>{extracted.cbu_cvu}</KvVal>
                            </>
                          )}
                          {extracted.confidence && (
                            <>
                              <KvKey>Confianza</KvKey>
                              <KvVal>
                                <ConfidenceDot $level={extracted.confidence} />
                                {extracted.confidence}
                              </KvVal>
                            </>
                          )}
                          {extracted.notes && (
                            <>
                              <KvKey>Notas</KvKey>
                              <KvVal style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>{extracted.notes}</KvVal>
                            </>
                          )}
                        </KvGrid>
                      </div>
                    )}
                  </ScrollArea>
                </SectionBody>
              </Section>

              {/* ── processing steps ── */}
              {steps.length > 0 && (
                <Section>
                  <SectionHead>
                    <SectionIcon $color="#60a5fa"><AccountTreeOutlinedIcon /></SectionIcon>
                    <SectionTitle>Pasos de procesamiento</SectionTitle>
                  </SectionHead>
                  <SectionBody>
                    <ScrollArea>
                      <Timeline>
                      {steps.map((step, i) => {
                        const meta = STEP_META[step.step] || { icon: '·', color: '#6b7280', label: step.step }
                        const hasDetail = step.detail && Object.keys(step.detail).length > 0
                        return (
                          <TlItem key={i}>
                            <TlDot $color={meta.color}>{meta.icon}</TlDot>
                            <TlContent>
                              <TlLabel>{meta.label}</TlLabel>
                              <TlTime>{formatTs(step.ts)}</TlTime>
                              {hasDetail && (
                                <TlDetail>{formatDetailObj(step.detail)}</TlDetail>
                              )}
                            </TlContent>
                          </TlItem>
                        )
                      })}
                      </Timeline>
                    </ScrollArea>
                  </SectionBody>
                </Section>
              )}

              {/* ── result ── */}
              {log.resultStatus && (
                <Section>
                  <SectionHead>
                    <SectionIcon $color={resultColors.text || '#a78bfa'}><FlagOutlinedIcon /></SectionIcon>
                    <SectionTitle>Resultado final</SectionTitle>
                  </SectionHead>
                  <SectionBody>
                    <ResultCard $bg={resultColors.bg} $border={resultColors.border}>
                      <ResultStatus $text={resultColors.text}>
                        {RESULT_LABELS[log.resultStatus] || log.resultStatus}
                      </ResultStatus>
                      {log.resultReason && (
                        <ResultReason>{log.resultReason}</ResultReason>
                      )}
                      {log.resultDetail && (
                        <ResultScroll>
                          <CodeWrap>
                            <CodeBlock>{formatDetailObj(log.resultDetail)}</CodeBlock>
                            <CopyBtn type="button" title="Copiar" onClick={() => copyText(formatDetailObj(log.resultDetail))}>
                              <ContentCopyIcon />
                            </CopyBtn>
                          </CodeWrap>
                        </ResultScroll>
                      )}
                    </ResultCard>
                  </SectionBody>
                </Section>
              )}
            </>
          )}
        </Body>
      </Drawer>
    </Overlay>,
    document.body
  )
}
