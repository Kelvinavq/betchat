import { useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { api } from '../../../utils/api.js'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`
const popIn = keyframes`0%{transform:scale(0.88);opacity:0}100%{transform:scale(1);opacity:1}`
const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`

/* ── Tokens ── */
const T = {
  card: '#0c1220',
  accent: '#3b82f6',
  gold: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  t1: '#f8fafc',
  t2: '#94a3b8',
  border: 'rgba(255,255,255,0.08)',
}

/* ── Styled Components ── */
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  animation: ${fadeIn} 0.3s ease both;
`

const DropArea = styled.div`
  border: 2px dashed ${({ dragover }) =>
    dragover ? T.accent : 'rgba(255,255,255,0.15)'};
  border-radius: 14px;
  background: ${({ dragover }) =>
    dragover ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)'};
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  &:hover {
    border-color: ${T.accent};
    background: rgba(59,130,246,0.06);
  }
`

const DropIcon = styled.div`
  font-size: 32px;
  line-height: 1;
`

const DropText = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${T.t1};
`

const DropHint = styled.div`
  font-size: 12px;
  color: ${T.t2};
`

const PreviewArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: ${popIn} 0.3s ease both;
`

const PreviewImg = styled.img`
  width: 100%;
  max-height: 140px;
  object-fit: contain;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
  border: 1px solid ${T.border};
`

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(59,130,246,0.07);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: ${T.t2};
`

const FileIcon = styled.div`
  font-size: 22px;
  flex-shrink: 0;
`

const FileName = styled.div`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${T.t1};
  font-weight: 600;
`

const FileSize = styled.div`
  flex-shrink: 0;
  font-size: 12px;
  color: ${T.t2};
`

const ChangeBtn = styled.button`
  background: none;
  border: none;
  color: ${T.accent};
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  flex-shrink: 0;
  font-family: inherit;
  &:hover { opacity: 0.8; }
`

const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`

const UploadBtn = styled.button`
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: ${({ disabled }) =>
    disabled
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
  color: ${({ disabled }) => (disabled ? T.t2 : '#fff')};
  font-size: 16px;
  font-weight: 800;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.2s, opacity 0.2s;
  &:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.92; }
`

const SuccessBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 16px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 12px;
  color: ${T.success};
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  line-height: 1.55;
  animation: ${popIn} 0.4s ease both;
`

const ErrorBox = styled.div`
  padding: 12px 16px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 10px;
  color: ${T.danger};
  font-size: 13px;
  text-align: center;
  line-height: 1.5;
`

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPT = '.jpg,.jpeg,.png,.gif,.pdf,.webp'

export default function ReceiptUpload({ eventId, clientId, onUploaded }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const inputRef = useRef(null)

  const processFile = (f) => {
    if (!f) return
    if (f.size > MAX_SIZE) {
      setError('El archivo supera el límite de 10 MB.')
      return
    }
    setError('')
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const handleInputChange = (e) => {
    processFile(e.target.files?.[0])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setFile(null)
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('receipt', file)
      await api.post(`/api/client/events/${eventId}/receipt`, fd)
      setDone(true)
      if (onUploaded) onUploaded()
    } catch (err) {
      setError(err.message || 'Error al enviar el comprobante')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <Wrap>
        <SuccessBox>
          <div style={{ fontSize: 38 }}>✓</div>
          <div>Comprobante recibido.</div>
          <div style={{ fontSize: 13, color: T.t2 }}>
            Lo revisaremos pronto y te notificaremos el resultado.
          </div>
        </SuccessBox>
      </Wrap>
    )
  }

  const isImage = file?.type?.startsWith('image/')

  return (
    <Wrap>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {!file ? (
        <DropArea
          dragover={dragOver ? 1 : 0}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <DropIcon>📎</DropIcon>
          <DropText>Seleccionar comprobante</DropText>
          <DropHint>JPG, PNG, PDF — máx. 10 MB</DropHint>
          <DropHint style={{ color: T.accent, marginTop: 4 }}>
            o arrastrá el archivo aquí
          </DropHint>
        </DropArea>
      ) : (
        <PreviewArea>
          {isImage && preview && (
            <PreviewImg src={preview} alt="Vista previa del comprobante" />
          )}
          <FileInfo>
            <FileIcon>{isImage ? '🖼️' : '📄'}</FileIcon>
            <FileName>{file.name}</FileName>
            <FileSize>{formatBytes(file.size)}</FileSize>
            <ChangeBtn type="button" onClick={handleClear}>Cambiar</ChangeBtn>
          </FileInfo>
        </PreviewArea>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      <UploadBtn
        type="button"
        disabled={!file || uploading}
        onClick={handleUpload}
      >
        {uploading ? (
          <>
            <Spinner />
            <span>Enviando...</span>
          </>
        ) : (
          'Enviar comprobante'
        )}
      </UploadBtn>
    </Wrap>
  )
}
