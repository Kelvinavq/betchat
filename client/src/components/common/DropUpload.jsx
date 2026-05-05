import { useState, useRef } from 'react'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import {
  Overlay, RingsWrap, Ring, IconCircle,
  DropTitle, DropSubtitle, BrowseBtn, ErrorMsg,
  TypeBadge, PreviewImg, PdfCard, PreviewActions, ActionBtn, CloseBtn,
} from './DropUpload.styles'

const ACCEPT = 'image/*,application/pdf,.pdf'
const MAX_BYTES = 10 * 1024 * 1024

const DropUpload = ({ onSend, onClose }) => {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState(null)
  const [error, setError]       = useState('')
  const inputRef   = useRef(null)
  const dragCount  = useRef(0)      // counter avoids false-leave on child elements

  const processFile = (file) => {
    setError('')
    if (!file) return
    if (file.size > MAX_BYTES) { setError('El archivo no puede superar 10 MB'); return }
    const isImage = file.type.startsWith('image/')
    const isPdf   = file.type === 'application/pdf'
    if (!isImage && !isPdf) { setError('Solo se permiten imágenes o archivos PDF'); return }
    setPreview({ type: isImage ? 'image' : 'pdf', url: URL.createObjectURL(file), name: file.name })
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCount.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCount.current--
    if (dragCount.current <= 0) { dragCount.current = 0; setDragging(false) }
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = (e) => {
    e.preventDefault()
    dragCount.current = 0
    setDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }

  return (
    <Overlay
      $dragging={dragging}
      $hasPreview={!!preview}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CloseBtn type="button" onClick={onClose}><CloseIcon /></CloseBtn>

      {preview ? (
        <>
          <TypeBadge $type={preview.type}>
            {preview.type === 'image'
              ? <><ImageOutlinedIcon />{preview.name.split('.').pop().toUpperCase()}</>
              : <><DescriptionIcon />PDF</>
            }
          </TypeBadge>

          {preview.type === 'image'
            ? <PreviewImg src={preview.url} alt={preview.name} />
            : <PdfCard>
                <DescriptionIcon />
                <span>{preview.name}</span>
              </PdfCard>
          }

          <PreviewActions>
            <ActionBtn type="button" onClick={() => setPreview(null)}>Cancelar</ActionBtn>
            <ActionBtn type="button" $primary onClick={() => onSend(preview.type, preview.url, preview.name)}>
              <SendIcon />Enviar
            </ActionBtn>
          </PreviewActions>
        </>
      ) : (
        <>
          <RingsWrap>
            <Ring $size="158px" $alpha={0.10} $dur="3.6s" $delay="0s"   />
            <Ring $size="118px" $alpha={0.16} $dur="3.0s" $delay="0.6s" />
            <Ring $size="82px"  $alpha={0.22} $dur="2.4s" $delay="1.2s" />
            <IconCircle $dragging={dragging}>
              <CloudUploadIcon />
            </IconCircle>
          </RingsWrap>

          <DropTitle $dragging={dragging}>
            {dragging ? 'Suelta aquí' : 'Arrastra tu archivo aquí'}
          </DropTitle>
          <DropSubtitle>Imágenes o PDFs · máximo 10 MB</DropSubtitle>
          <BrowseBtn type="button" onClick={() => inputRef.current?.click()}>
            Explorar archivos
          </BrowseBtn>
          {error && <ErrorMsg>{error}</ErrorMsg>}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={e => { processFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </Overlay>
  )
}

export default DropUpload
