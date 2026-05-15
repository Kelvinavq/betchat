import { useEffect, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { useConfirm } from '../../../components/common/ConfirmDialog'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { api, API_BASE_URL } from '../../../utils/api'
import {
  Card, CardHead, CardIcon, CardHeadText, CardTitle, CardSub,
  SubSection, SubTitle, SubDesc,
  ScheduleRow, IntervalWrap, IntervalLabel, IntervalInput,
  RunInfo, RunPill,
  DateRow, DateLabel, DateInput,
  ActionRow, RunBtn, SaveBtn, Spinner, ResultBadge,
  PanicGrid, PanicCard, PanicGlow, PanicHead, PanicIcon, PanicTitle, PanicSub,
  PanicBody, PanicActions, PanicBtn, PanicNotice, PanicConfirmBox, PanicConfirmLabel, PanicConfirmInput,
} from './AdvancedSection.styles'

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const formatDate = (iso, tz) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
}

const nextRunDate = (lastRunAt, intervalDays) => {
  if (!intervalDays || !lastRunAt) return null
  const d = new Date(lastRunAt)
  d.setDate(d.getDate() + intervalDays)
  return d.toISOString().slice(0, 10)
}

export default function AdvancedSection() {
  const { timezone } = useDateFormat()
  const { confirm, dialogNode } = useConfirm()
  const [config, setConfig] = useState({ intervalDays: 0, clearMessages: true, clearFiles: true, lastRunAt: null, lastRunStats: null })
  const [intervalInput, setIntervalInput] = useState('0')
  const [scheduleSaved, setScheduleSaved] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [msgFrom, setMsgFrom] = useState(daysAgoStr(365))
  const [msgTo,   setMsgTo]   = useState(daysAgoStr(7))
  const [runningMsg, setRunningMsg] = useState(false)
  const [msgResult, setMsgResult] = useState(null)

  const [fileFrom, setFileFrom] = useState(daysAgoStr(365))
  const [fileTo,   setFileTo]   = useState(daysAgoStr(7))
  const [runningFiles, setRunningFiles] = useState(false)
  const [fileResult, setFileResult] = useState(null)
  const [wipeConfirm, setWipeConfirm] = useState('')
  const [panicBusy, setPanicBusy] = useState(false)

  useEffect(() => {
    api.get('/api/maintenance').then(data => {
      setConfig(data)
      setIntervalInput(String(data.intervalDays ?? 0))
    }).catch(() => {})
  }, [])

  const saveSchedule = async () => {
    setSavingSchedule(true)
    setScheduleSaved(false)
    try {
      const days = Math.max(0, parseInt(intervalInput, 10) || 0)
      await api.put('/api/maintenance', { intervalDays: days, clearMessages: config.clearMessages, clearFiles: config.clearFiles })
      setConfig(prev => ({ ...prev, intervalDays: days }))
      setScheduleSaved(true)
      setTimeout(() => setScheduleSaved(false), 2500)
    } catch {
      // keep current
    } finally {
      setSavingSchedule(false)
    }
  }

  const runMessages = async () => {
    if (!msgFrom || !msgTo) return
    setRunningMsg(true)
    setMsgResult(null)
    try {
      const data = await api.post('/api/maintenance/run', {
        clearMessages: { enabled: true, fromDate: msgFrom, toDate: msgTo },
        clearFiles: { enabled: false },
      })
      setConfig(prev => ({ ...prev, lastRunAt: new Date().toISOString(), lastRunStats: data.stats }))
      setMsgResult({ ok: true, stats: data.stats })
    } catch (err) {
      setMsgResult({ ok: false, error: err?.message || 'Error al ejecutar' })
    } finally {
      setRunningMsg(false)
    }
  }

  const runFiles = async () => {
    if (!fileFrom || !fileTo) return
    setRunningFiles(true)
    setFileResult(null)
    try {
      const data = await api.post('/api/maintenance/run', {
        clearMessages: { enabled: false },
        clearFiles: { enabled: true, fromDate: fileFrom, toDate: fileTo },
      })
      setConfig(prev => ({ ...prev, lastRunAt: new Date().toISOString(), lastRunStats: data.stats }))
      setFileResult({ ok: true, stats: data.stats })
    } catch (err) {
      setFileResult({ ok: false, error: err?.message || 'Error al ejecutar' })
    } finally {
      setRunningFiles(false)
    }
  }

  const exportDatabase = async () => {
    setPanicBusy(true)
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/+$/, '')}/api/maintenance/export`, { credentials: 'include' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `betchat-backup-${new Date().toISOString().slice(0, 10)}.sql`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } finally {
      setPanicBusy(false)
    }
  }

  const wipeChats = async () => {
    if (wipeConfirm !== 'BORRAR TODO') return
    const ok = await confirm({
      title: 'Vaciar chats',
      message: 'Se borrarán TODOS los chats, mensajes y archivos asociados. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, borrar todo',
      variant: 'danger',
    })
    if (!ok) return

    setPanicBusy(true)
    try {
      await api.post('/api/maintenance/purge-chats', { confirm: wipeConfirm })
      setMsgResult({ ok: true, stats: { messagesDeleted: 'all', filesDeleted: 0 } })
      setFileResult({ ok: true, stats: { filesDeleted: 0, filesSkipped: 0 } })
    } catch (err) {
      setMsgResult({ ok: false, error: err?.message || 'No se pudo vaciar chats' })
    } finally {
      setPanicBusy(false)
      setWipeConfirm('')
    }
  }

  const next = nextRunDate(config.lastRunAt, config.intervalDays)

  return (
    <>
      <Card>
      <CardHead>
        <CardIcon><BuildOutlinedIcon /></CardIcon>
        <CardHeadText>
          <CardTitle>Mantenimiento</CardTitle>
          <CardSub>Limpieza de historial y archivos del sistema. Solo accesible para administradores.</CardSub>
        </CardHeadText>
      </CardHead>

      {/* Programación automática */}
      <SubSection>
        <SubTitle>Programación automática</SubTitle>
        <SubDesc>
          El mantenimiento se ejecutará automáticamente cada cierta cantidad de días.
          Ingresá 0 para desactivarlo.
        </SubDesc>

        <ScheduleRow>
          <IntervalWrap>
            <IntervalLabel>Cada</IntervalLabel>
            <IntervalInput
              type="number"
              min="0"
              max="365"
              value={intervalInput}
              onChange={e => { setIntervalInput(e.target.value); setScheduleSaved(false) }}
            />
            <IntervalLabel>días</IntervalLabel>
          </IntervalWrap>

          <SaveBtn
            type="button"
            $saved={scheduleSaved}
            disabled={savingSchedule}
            onClick={saveSchedule}
          >
            {savingSchedule
              ? <><Spinner />Guardando</>
              : scheduleSaved
                ? <><CheckIcon />Guardado</>
                : 'Guardar programación'
            }
          </SaveBtn>
        </ScheduleRow>

        <RunInfo>
          <RunPill>
            <AccessTimeOutlinedIcon />
            {config.lastRunAt
              ? `Última ejecución: ${formatDate(config.lastRunAt, timezone)}`
              : 'Nunca ejecutado'
            }
          </RunPill>
          {config.intervalDays > 0 && (
            <RunPill $accent>
              <EventRepeatOutlinedIcon />
              {next
                ? `Próxima: ${new Date(next).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', ...(timezone && { timeZone: timezone }) })}`
                : `Cada ${config.intervalDays} días`
              }
            </RunPill>
          )}
          {config.lastRunStats && (
            <RunPill>
              <CheckIcon />
              Última: {config.lastRunStats.messagesDeleted ?? 0} mensajes · {config.lastRunStats.filesDeleted ?? 0} archivos
            </RunPill>
          )}
        </RunInfo>
      </SubSection>

      {/* Limpiar mensajes */}
      <SubSection $bordered>
        <SubTitle>
          <ChatBubbleOutlineIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle', opacity: 0.6 }} />
          Limpiar historial de mensajes
        </SubTitle>
        <SubDesc>
          Elimina permanentemente los registros de mensajes y sus archivos adjuntos en el rango de fechas indicado.
        </SubDesc>

        <DateRow>
          <DateLabel>Desde</DateLabel>
          <DateInput type="date" value={msgFrom} max={msgTo || todayStr()} onChange={e => { setMsgFrom(e.target.value); setMsgResult(null) }} />
          <DateLabel>Hasta</DateLabel>
          <DateInput type="date" value={msgTo}   max={todayStr()}          onChange={e => { setMsgTo(e.target.value);   setMsgResult(null) }} />
        </DateRow>

        <ActionRow>
          <RunBtn
            type="button"
            $danger
            disabled={runningMsg || !msgFrom || !msgTo}
            onClick={runMessages}
          >
            {runningMsg ? <><Spinner />Ejecutando...</> : <><PlayArrowOutlinedIcon />Limpiar mensajes</>}
          </RunBtn>

          {msgResult && (
            <ResultBadge $success={msgResult.ok}>
              {msgResult.ok
                ? <><CheckIcon />{msgResult.stats.messagesDeleted} mensajes eliminados · {msgResult.stats.filesDeleted} archivos</>
                : <><ErrorOutlineIcon />{msgResult.error}</>
              }
            </ResultBadge>
          )}
        </ActionRow>
      </SubSection>

      {/* Limpiar archivos */}
      <SubSection $bordered>
        <SubTitle>
          <WarningAmberOutlinedIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle', opacity: 0.8 }} />
          Botones de pánico
        </SubTitle>
        <SubDesc>
          Acciones irreversibles para soporte y recuperación. Requieren confirmación explícita y muestran advertencias personalizadas.
        </SubDesc>

        <PanicGrid>
          <PanicCard $tone="danger">
            <PanicGlow $tone="danger" />
            <PanicHead>
              <PanicIcon $tone="danger">
                <WarningAmberOutlinedIcon />
              </PanicIcon>
              <div>
                <PanicTitle>Vaciar chats</PanicTitle>
                <PanicSub>Borra todos los chats, mensajes y adjuntos del sistema.</PanicSub>
              </div>
            </PanicHead>

            <PanicBody>
              <PanicNotice>
                Esta acción es destructiva. Se eliminarán permanentemente todos los chats, mensajes y archivos asociados.
              </PanicNotice>
              <PanicConfirmBox>
                <PanicConfirmLabel>
                  Escribí <strong>BORRAR TODO</strong> para habilitar el botón.
                </PanicConfirmLabel>
                <PanicConfirmInput
                  value={wipeConfirm}
                  onChange={e => setWipeConfirm(e.target.value)}
                  placeholder="BORRAR TODO"
                />
              </PanicConfirmBox>
              <PanicActions>
                <PanicBtn
                  type="button"
                  $tone="danger"
                  disabled={panicBusy || wipeConfirm !== 'BORRAR TODO'}
                  onClick={wipeChats}
                >
                  <WarningAmberOutlinedIcon />
                  Vaciar chats
                </PanicBtn>
              </PanicActions>
            </PanicBody>
          </PanicCard>

          <PanicCard $tone="info">
            <PanicGlow $tone="info" />
            <PanicHead>
              <PanicIcon $tone="info">
                <DownloadOutlinedIcon />
              </PanicIcon>
              <div>
                <PanicTitle>Exportar base de datos</PanicTitle>
                <PanicSub>Descarga un backup SQL completo con estructura y datos.</PanicSub>
              </div>
            </PanicHead>

            <PanicBody>
              <PanicNotice>
                Se generará un archivo `.sql` listo para restaurar la base de datos más tarde.
              </PanicNotice>
              <PanicActions>
                <PanicBtn
                  type="button"
                  $tone="info"
                  disabled={panicBusy}
                  onClick={() => {
                    confirm({
                      title: 'Exportar base de datos',
                      message: 'Se descargará un respaldo SQL completo de la base de datos en formato .sql.',
                      confirmLabel: 'Exportar SQL',
                      variant: 'info',
                    }).then(ok => {
                      if (ok) exportDatabase()
                    })
                  }}
                >
                  <DownloadOutlinedIcon />
                  Exportar SQL
                </PanicBtn>
              </PanicActions>
            </PanicBody>
          </PanicCard>
        </PanicGrid>
      </SubSection>

      <SubSection $bordered>
        <SubTitle>
          <ImageOutlinedIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle', opacity: 0.6 }} />
          Eliminar archivos de medios
        </SubTitle>
        <SubDesc>
          Elimina PDFs, imágenes y audios del disco sin borrar el historial de texto de los mensajes.
        </SubDesc>

        <DateRow>
          <DateLabel>Desde</DateLabel>
          <DateInput type="date" value={fileFrom} max={fileTo || todayStr()} onChange={e => { setFileFrom(e.target.value); setFileResult(null) }} />
          <DateLabel>Hasta</DateLabel>
          <DateInput type="date" value={fileTo}   max={todayStr()}           onChange={e => { setFileTo(e.target.value);   setFileResult(null) }} />
        </DateRow>

        <ActionRow>
          <RunBtn
            type="button"
            $danger
            disabled={runningFiles || !fileFrom || !fileTo}
            onClick={runFiles}
          >
            {runningFiles ? <><Spinner />Ejecutando...</> : <><PlayArrowOutlinedIcon />Limpiar archivos</>}
          </RunBtn>

          {fileResult && (
            <ResultBadge $success={fileResult.ok}>
              {fileResult.ok
                ? <><CheckIcon />{fileResult.stats.filesDeleted} archivos eliminados{fileResult.stats.filesSkipped > 0 ? ` · ${fileResult.stats.filesSkipped} omitidos` : ''}</>
                : <><ErrorOutlineIcon />{fileResult.error}</>
              }
            </ResultBadge>
          )}
        </ActionRow>
      </SubSection>
      </Card>
      {dialogNode}
    </>
  )
}

