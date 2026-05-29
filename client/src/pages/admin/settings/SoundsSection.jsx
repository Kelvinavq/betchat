import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import VolumeUpOutlinedIcon     from '@mui/icons-material/VolumeUpOutlined'
import VolumeOffOutlinedIcon    from '@mui/icons-material/VolumeOffOutlined'
import PlayArrowOutlinedIcon    from '@mui/icons-material/PlayArrowOutlined'
import DeleteOutlineIcon        from '@mui/icons-material/DeleteOutlined'
import CloudUploadOutlinedIcon  from '@mui/icons-material/CloudUploadOutlined'
import CheckCircleOutlinedIcon  from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { api, resolveApiAsset } from '../../../utils/api'
import { useNotificationSound } from '../../../hooks/useNotificationSound'
import { useToast } from '../../../context/ToastContext'

/* ─── Styled components ───────────────────────────────────────────── */
const SSection = styled.div`display:flex;flex-direction:column;gap:24px;`

const SCard = styled.div`
  background: var(--bg-card, #1a1a2e);
  border: 1px solid var(--border, rgba(255,255,255,.08));
  border-radius: 12px;
  overflow: hidden;
`
const SCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.08));
`
const SCardIcon = styled.div`
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: rgba(99,102,241,.15);
  color: #818cf8;
  flex-shrink: 0;
  svg { font-size: 20px; }
`
const SCardTitle = styled.div`font-size:.94rem;font-weight:600;color:var(--text,#e2e8f0);`
const SCardSub   = styled.div`font-size:.78rem;color:var(--text-muted,#94a3b8);margin-top:2px;`
const SCardBody  = styled.div`padding:20px;`

const SoundList = styled.div`display:flex;flex-direction:column;gap:8px;`
const SoundRow  = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${p => p.$selected
    ? 'rgba(99,102,241,.5)'
    : 'rgba(255,255,255,.06)'};
  background: ${p => p.$selected
    ? 'rgba(99,102,241,.1)'
    : 'transparent'};
  cursor: pointer;
  transition: background .15s, border-color .15s;
  &:hover { background: rgba(255,255,255,.04); }
`
const SoundSelectIcon = styled.div`
  flex-shrink: 0;
  color: ${p => p.$selected ? '#818cf8' : 'var(--text-muted,#94a3b8)'};
  display: flex; align-items: center;
  svg { font-size: 20px; }
`
const SoundInfo  = styled.div`flex:1;min-width:0;`
const SoundName  = styled.div`font-size:.875rem;font-weight:500;color:var(--text,#e2e8f0);truncate:ellipsis;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const SoundMeta  = styled.div`font-size:.75rem;color:var(--text-muted,#94a3b8);`
const SoundActions = styled.div`display:flex;align-items:center;gap:4px;flex-shrink:0;`
const SoundBtn   = styled.button`
  background: none; border: none; cursor: pointer;
  width: 32px; height: 32px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted,#94a3b8);
  transition: background .15s, color .15s;
  &:hover { background: rgba(255,255,255,.08); color: var(--text,#e2e8f0); }
  svg { font-size: 18px; }
`
const DeleteBtn = styled(SoundBtn)`
  &:hover { background: rgba(239,68,68,.12); color: #f87171; }
`
const NoneRow = styled(SoundRow)`cursor:pointer;`

/* Upload form */
const UploadGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;`
const UpField    = styled.div`display:flex;flex-direction:column;gap:6px;`
const UpLabel    = styled.label`font-size:.78rem;font-weight:500;color:var(--text-muted,#94a3b8);`
const UpInput    = styled.input`
  width:100%;padding:9px 12px;border-radius:8px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1);
  color:var(--text,#e2e8f0);font-size:.875rem;
  outline:none;box-sizing:border-box;
  &:focus{border-color:rgba(99,102,241,.6);}
`
const FileDropZone = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  padding:20px;border-radius:8px;
  border:2px dashed ${p => p.$hasFile ? 'rgba(99,102,241,.6)' : 'rgba(255,255,255,.12)'};
  background:${p => p.$hasFile ? 'rgba(99,102,241,.07)' : 'transparent'};
  cursor:pointer;transition:border-color .15s,background .15s;
  &:hover{border-color:rgba(99,102,241,.4);}
  svg{font-size:28px;color:${p => p.$hasFile ? '#818cf8' : 'var(--text-muted,#94a3b8)'};}
  grid-column:1/-1;
`
const FileDropText  = styled.div`font-size:.825rem;color:var(--text-muted,#94a3b8);`
const FileDropName  = styled.div`font-size:.825rem;color:#818cf8;font-weight:500;`
const DurationHint  = styled.div`font-size:.75rem;color:var(--text-muted,#94a3b8);`
const ErrorText     = styled.div`font-size:.78rem;color:#f87171;margin-top:4px;`
const UploadBtn     = styled.button`
  margin-top:4px;padding:9px 20px;border-radius:8px;
  background:rgba(99,102,241,.85);color:#fff;
  border:none;cursor:pointer;font-size:.875rem;font-weight:500;
  display:flex;align-items:center;gap:6px;
  opacity:${p => p.disabled ? .5 : 1};
  pointer-events:${p => p.disabled ? 'none' : 'auto'};
  &:hover{background:rgba(99,102,241,1);}
`
const EmptyHint = styled.div`
  padding:24px;text-align:center;
  font-size:.82rem;color:var(--text-muted,#94a3b8);
`

const MAX_DURATION_S = 5
const MAX_FILE_MB    = 1

/* ─── helpers ──────────────────────────────────────────────────── */
function fmtDuration(s) {
  const sec = Number(s) || 0
  return `${sec.toFixed(1)}s`
}
function fmtSize(bytes) {
  if (!bytes) return ''
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function SoundsSection({ userRole }) {
  const { soundEnabled, currentSound, toggleEnabled, selectSound } = useNotificationSound()
  const toast = useToast()
  const isAdmin = userRole === 'admin'

  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(true)

  // Upload form
  const [uploadName, setUploadName]     = useState('')
  const [uploadFile, setUploadFile]     = useState(null) // { dataUrl, name, duration, size }
  const [uploadErr, setUploadErr]       = useState('')
  const [uploading, setUploading]       = useState(false)
  const fileInputRef = useRef(null)
  const playingRef   = useRef(null)

  /* Load list */
  useEffect(() => {
    setLoading(true)
    api.get('/api/notification-sounds')
      .then(data => setSounds(data.sounds || []))
      .catch(() => toast.error('Error al cargar los sonidos'))
      .finally(() => setLoading(false))
  }, [])

  /* Preview play */
  const previewSound = (fileUrl, e) => {
    e?.stopPropagation()
    if (playingRef.current) { playingRef.current.pause(); playingRef.current = null }
    const audio = new Audio(resolveApiAsset(fileUrl))
    audio.volume = 0.75
    audio.play().catch(() => toast.error('No se pudo reproducir el audio'))
    playingRef.current = audio
  }

  /* File pick */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadErr('')

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadErr(`El archivo supera ${MAX_FILE_MB} MB`)
      return
    }

    const audioEl = document.createElement('audio')
    const url = URL.createObjectURL(file)
    audioEl.src = url
    audioEl.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (!Number.isFinite(audioEl.duration) || audioEl.duration > MAX_DURATION_S) {
        setUploadErr(`La duración máxima es ${MAX_DURATION_S} segundos (este audio dura ${audioEl.duration?.toFixed(1)}s)`)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => setUploadFile({
        dataUrl:  ev.target.result,
        name:     file.name,
        duration: audioEl.duration,
        size:     file.size,
      })
      reader.readAsDataURL(file)
    }
    audioEl.onerror = () => {
      URL.revokeObjectURL(url)
      setUploadErr('No se pudo leer el archivo de audio')
    }
  }

  /* Upload submit */
  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    setUploadErr('')
    try {
      const data = await api.post('/api/notification-sounds', {
        name:     uploadName.trim(),
        data_url: uploadFile.dataUrl,
        duration: uploadFile.duration,
      })
      setSounds(prev => [data.sound, ...prev])
      setUploadName('')
      setUploadFile(null)
      toast.success('Sonido subido correctamente')
    } catch (err) {
      setUploadErr(err?.payload?.error || 'Error al subir el sonido')
    } finally {
      setUploading(false)
    }
  }

  /* Delete */
  const handleDelete = async (sound, e) => {
    e?.stopPropagation()
    try {
      await api.delete(`/api/notification-sounds/${sound.id}`)
      setSounds(prev => prev.filter(s => s.id !== sound.id))
      if (currentSound?.id === sound.id) selectSound(null)
      toast.success('Sonido eliminado')
    } catch {
      toast.error('Error al eliminar el sonido')
    }
  }

  return (
    <SSection>
      {/* ── Toggle global ── */}
      <SCard>
        <SCardHead>
          <SCardIcon>
            {soundEnabled ? <VolumeUpOutlinedIcon /> : <VolumeOffOutlinedIcon />}
          </SCardIcon>
          <div>
            <SCardTitle>Sonido de notificaciones</SCardTitle>
            <SCardSub>Activar o desactivar el tono al recibir mensajes</SCardSub>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ToggleSwitch $on={soundEnabled} onClick={toggleEnabled}>
              <ToggleKnob $on={soundEnabled} />
            </ToggleSwitch>
          </div>
        </SCardHead>
      </SCard>

      {/* ── Sound selector ── */}
      <SCard>
        <SCardHead>
          <SCardIcon><VolumeUpOutlinedIcon /></SCardIcon>
          <div>
            <SCardTitle>Tu tono</SCardTitle>
            <SCardSub>Elegí el sonido que preferís. Cada usuario tiene el suyo.</SCardSub>
          </div>
        </SCardHead>
        <SCardBody>
          {loading ? (
            <EmptyHint>Cargando sonidos…</EmptyHint>
          ) : (
            <SoundList>
              {/* "None" option */}
              <NoneRow
                $selected={!currentSound}
                onClick={() => selectSound(null)}
              >
                <SoundSelectIcon $selected={!currentSound}>
                  {!currentSound ? <CheckCircleOutlinedIcon /> : <RadioButtonUncheckedIcon />}
                </SoundSelectIcon>
                <SoundInfo>
                  <SoundName>Sin sonido</SoundName>
                  <SoundMeta>No reproducir ningún tono</SoundMeta>
                </SoundInfo>
              </NoneRow>

              {sounds.length === 0 && (
                <EmptyHint>
                  {isAdmin
                    ? 'Todavía no hay sonidos. Subí el primero abajo.'
                    : 'Todavía no hay sonidos. Un administrador debe subir uno.'}
                </EmptyHint>
              )}

              {sounds.map(sound => (
                <SoundRow
                  key={sound.id}
                  $selected={currentSound?.id === sound.id}
                  onClick={() => selectSound(sound)}
                >
                  <SoundSelectIcon $selected={currentSound?.id === sound.id}>
                    {currentSound?.id === sound.id
                      ? <CheckCircleOutlinedIcon />
                      : <RadioButtonUncheckedIcon />}
                  </SoundSelectIcon>
                  <SoundInfo>
                    <SoundName>{sound.name}</SoundName>
                    <SoundMeta>
                      {fmtDuration(sound.duration)}
                      {sound.file_size ? ` · ${fmtSize(sound.file_size)}` : ''}
                    </SoundMeta>
                  </SoundInfo>
                  <SoundActions>
                    <SoundBtn
                      title="Previsualizar"
                      onClick={e => previewSound(sound.file_url, e)}
                    >
                      <PlayArrowOutlinedIcon />
                    </SoundBtn>
                    {isAdmin && (
                      <DeleteBtn
                        title="Eliminar"
                        onClick={e => handleDelete(sound, e)}
                      >
                        <DeleteOutlineIcon />
                      </DeleteBtn>
                    )}
                  </SoundActions>
                </SoundRow>
              ))}
            </SoundList>
          )}
        </SCardBody>
      </SCard>

      {/* ── Upload (admin only) ── */}
      {isAdmin && (
        <SCard>
          <SCardHead>
            <SCardIcon><CloudUploadOutlinedIcon /></SCardIcon>
            <div>
              <SCardTitle>Subir nuevo sonido</SCardTitle>
              <SCardSub>Máx. {MAX_DURATION_S} segundos · {MAX_FILE_MB} MB · mp3 / ogg / wav / webm</SCardSub>
            </div>
          </SCardHead>
          <SCardBody>
            <UploadGrid>
              <UpField style={{ gridColumn: '1/-1' }}>
                <UpLabel>Nombre del sonido *</UpLabel>
                <UpInput
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="Ej: Ding suave"
                  maxLength={120}
                />
              </UpField>

              <FileDropZone
                $hasFile={Boolean(uploadFile)}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUploadOutlinedIcon />
                {uploadFile
                  ? <FileDropName>✓ {uploadFile.name} ({fmtDuration(uploadFile.duration)} · {fmtSize(uploadFile.size)})</FileDropName>
                  : <FileDropText>Hacé clic para seleccionar un archivo de audio</FileDropText>
                }
                <DurationHint>Máximo {MAX_DURATION_S} segundos y {MAX_FILE_MB} MB</DurationHint>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </FileDropZone>

              {uploadErr && <ErrorText style={{ gridColumn: '1/-1' }}>{uploadErr}</ErrorText>}
            </UploadGrid>

            <div style={{ marginTop: 16 }}>
              {uploadFile && (
                <SoundBtn
                  as="button"
                  title="Previsualizar"
                  style={{ display: 'inline-flex', marginRight: 8, width: 'auto', padding: '0 12px', gap: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)' }}
                  onClick={() => previewSound(uploadFile.dataUrl)}
                >
                  <PlayArrowOutlinedIcon /> Escuchar
                </SoundBtn>
              )}
              <UploadBtn
                disabled={!uploadFile || !uploadName.trim() || uploading}
                onClick={handleUpload}
              >
                <CloudUploadOutlinedIcon style={{ fontSize: 18 }} />
                {uploading ? 'Subiendo…' : 'Subir sonido'}
              </UploadBtn>
            </div>
          </SCardBody>
        </SCard>
      )}
    </SSection>
  )
}

/* ── Toggle styled components (inline to avoid extra file) ── */
const ToggleSwitch = styled.div`
  width: 44px; height: 24px;
  border-radius: 12px;
  background: ${p => p.$on ? 'rgba(99,102,241,.9)' : 'rgba(255,255,255,.15)'};
  cursor: pointer;
  position: relative;
  transition: background .2s;
  flex-shrink: 0;
`
const ToggleKnob = styled.div`
  position: absolute;
  top: 3px;
  left: ${p => p.$on ? '23px' : '3px'};
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: left .2s;
`
