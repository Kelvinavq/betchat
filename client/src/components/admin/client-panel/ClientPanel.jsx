import { useState } from 'react'
import { createPortal } from 'react-dom'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DescriptionIcon from '@mui/icons-material/Description'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Wrap, PanelHeader, CloseBtn, PanelAvatar, PanelOnlineDot, PanelUsername, PanelStatus,
  TabBar, Tab, ScrollArea,
  InfoCard, InfoCardTitle, FieldRow, FieldLabel, FieldValue, FieldInput, FieldTextarea, EditHint,
  TagsSection, ClientTag, AddTagBtn,
  FilterBar, FilterBtn, FilesGrid, FileCard, FileThumb, FileInfo, FileName, FileDate,
  PaginationRow, PageBtn, PageInfo,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg, ViewerEmbed, ViewerActions, ViewerBtn,
} from './ClientPanel.styles'

/* ── available tags ── */
const ALL_TAGS = [
  { id: 'vip',       label: 'VIP',        bg: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: 'rgba(245,158,11,0.28)' },
  { id: 'frecuente', label: 'Frecuente',  bg: 'rgba(59,130,246,0.14)', color: '#60a5fa', border: 'rgba(59,130,246,0.28)' },
  { id: 'activo',    label: 'Activo',     bg: 'rgba(34,197,94,0.14)',  color: '#4ade80', border: 'rgba(34,197,94,0.28)'  },
  { id: 'nuevo',     label: 'Nuevo',      bg: 'rgba(139,92,246,0.14)', color: '#a78bfa', border: 'rgba(139,92,246,0.28)' },
  { id: 'especial',  label: 'Especial',   bg: 'rgba(236,72,153,0.14)', color: '#f472b6', border: 'rgba(236,72,153,0.28)' },
  { id: 'riesgo',    label: 'Riesgo',     bg: 'rgba(239,68,68,0.14)',  color: '#f87171', border: 'rgba(239,68,68,0.28)'  },
  { id: 'verificado',label: 'Verificado', bg: 'rgba(6,182,212,0.14)',  color: '#22d3ee', border: 'rgba(6,182,212,0.28)'  },
]

const THUMB_COLORS = [
  'linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%)',
  'linear-gradient(135deg, #1a0050 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #50000a 0%, #e8000d 100%)',
  'linear-gradient(135deg, #004d20 0%, #16a34a 100%)',
]

const FILES_PER_PAGE = 6

/* ── editable field ── */
const EditableField = ({ label, value, onChange, multiline = false }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)

  const save = () => { onChange(val); setEditing(false) }

  if (editing) {
    return (
      <FieldRow $editable>
        <FieldLabel>{label}</FieldLabel>
        {multiline ? (
          <FieldTextarea
            value={val}
            rows={3}
            onChange={e => setVal(e.target.value)}
            onBlur={save}
            autoFocus
          />
        ) : (
          <FieldInput
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        )}
      </FieldRow>
    )
  }

  return (
    <FieldRow $editable onClick={() => setEditing(true)}>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue $empty={!val}>{val || 'Sin valor — clic para editar'}</FieldValue>
      <EditHint>✎ editar</EditHint>
    </FieldRow>
  )
}

/* ── viewer lightbox ── */
const FileViewer = ({ data, onClose }) => {
  const handleDownload = () => {
    if (!data.url) return
    const a = document.createElement('a')
    a.href = data.url; a.download = data.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  return (
    <ViewerOverlay onClick={onClose}>
      <ViewerContent onClick={e => e.stopPropagation()}>
        <ViewerFileName>{data.name}</ViewerFileName>
        {data.type === 'image'
          ? data.url
            ? <ViewerImg src={data.url} alt={data.name} />
            : <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 14 }}>Vista previa no disponible</div>
          : <ViewerEmbed src={data.url} title={data.name} />
        }
        <ViewerActions>
          <ViewerBtn type="button" $download onClick={handleDownload}><FileDownloadIcon />Descargar</ViewerBtn>
          <ViewerBtn type="button" onClick={onClose}><CloseIcon />Cerrar</ViewerBtn>
        </ViewerActions>
      </ViewerContent>
    </ViewerOverlay>
  )
}

/* ── main component ── */
const ClientPanel = ({ client, onClose, $width, $fullWidth }) => {
  const [tab, setTab]             = useState('info')
  const [fileFilter, setFileFilter] = useState('all')
  const [filePage, setFilePage]   = useState(1)
  const [viewerData, setViewerData] = useState(null)

  // editable state
  const [cuit, setCuit]           = useState(client.cuit || '')
  const [holder, setHolder]       = useState(client.holderName || '')
  const [note, setNote]           = useState(client.note || '')
  const [activeTags, setActiveTags] = useState(
    new Set((client.clientTags || []).map(t => t.toLowerCase()))
  )

  const toggleTag = (id) => {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const files = client.files || []
  const filteredFiles = fileFilter === 'all'
    ? files
    : files.filter(f => f.type === fileFilter)

  const totalPages = Math.ceil(filteredFiles.length / FILES_PER_PAGE)
  const pageFiles  = filteredFiles.slice((filePage - 1) * FILES_PER_PAGE, filePage * FILES_PER_PAGE)

  const openFile = (file) => setViewerData({ type: file.type, url: file.url || null, name: file.name })

  return (
    <Wrap $width={$width} $fullWidth={$fullWidth}>
      {viewerData && createPortal(
        <FileViewer data={viewerData} onClose={() => setViewerData(null)} />,
        document.body
      )}

      <PanelHeader>
        <CloseBtn onClick={onClose} aria-label="Cerrar panel"><CloseIcon /></CloseBtn>
        <PanelAvatar>
          {client.username[0].toUpperCase()}
          <PanelOnlineDot $online={client.online} />
        </PanelAvatar>
        <PanelUsername>{client.username}</PanelUsername>
        <PanelStatus $online={client.online}>
          {client.online ? 'En línea' : 'Desconectado'}
        </PanelStatus>
      </PanelHeader>

      <TabBar>
        <Tab $active={tab === 'info'} onClick={() => setTab('info')}>
          <InfoOutlinedIcon />Info
        </Tab>
        <Tab $active={tab === 'files'} onClick={() => setTab('files')}>
          <FolderOutlinedIcon />Archivos
        </Tab>
      </TabBar>

      <ScrollArea>
        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <>
            {/* account details */}
            <InfoCard>
              <InfoCardTitle>Datos de cuenta</InfoCardTitle>
              <FieldRow>
                <FieldLabel>Fecha de registro</FieldLabel>
                <FieldValue>{client.joinDate}</FieldValue>
              </FieldRow>
              <EditableField label="CUIT / CUIL" value={cuit} onChange={setCuit} />
              <EditableField label="Nombre del titular" value={holder} onChange={setHolder} />
            </InfoCard>

            {/* note */}
            <InfoCard>
              <InfoCardTitle>Nota</InfoCardTitle>
              <EditableField
                label="Nota interna"
                value={note}
                onChange={setNote}
                multiline
              />
            </InfoCard>

            {/* tags */}
            <InfoCard>
              <InfoCardTitle>Etiquetas</InfoCardTitle>
              <TagsSection>
                {ALL_TAGS.map(tag => (
                  <ClientTag
                    key={tag.id}
                    type="button"
                    $active={activeTags.has(tag.id)}
                    $bg={tag.bg}
                    $color={tag.color}
                    $border={tag.border}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.label}
                  </ClientTag>
                ))}
              </TagsSection>
            </InfoCard>
          </>
        )}

        {/* ── FILES TAB ── */}
        {tab === 'files' && (
          <>
            <FilterBar>
              <FilterBtn $active={fileFilter === 'all'}   type="button" onClick={() => { setFileFilter('all');   setFilePage(1) }}>Todos</FilterBtn>
              <FilterBtn $active={fileFilter === 'image'} type="button" onClick={() => { setFileFilter('image'); setFilePage(1) }}>Imágenes</FilterBtn>
              <FilterBtn $active={fileFilter === 'pdf'}   type="button" onClick={() => { setFileFilter('pdf');   setFilePage(1) }}>Docs</FilterBtn>
            </FilterBar>

            {pageFiles.length === 0 ? (
              <FieldValue $empty style={{ textAlign: 'center', padding: '20px 0' }}>
                Sin archivos
              </FieldValue>
            ) : (
              <FilesGrid>
                {pageFiles.map(file => (
                  <FileCard key={file.id} type="button" onClick={() => openFile(file)}>
                    <FileThumb $bg={THUMB_COLORS[file.id % THUMB_COLORS.length]}>
                      {file.type === 'image'
                        ? file.url ? <img src={file.url} alt={file.name} /> : '🖼'
                        : <DescriptionIcon style={{ fontSize: 32, color: 'rgba(255,255,255,0.55)' }} />
                      }
                    </FileThumb>
                    <FileInfo>
                      <FileName>{file.name}</FileName>
                      <FileDate>{file.date}</FileDate>
                    </FileInfo>
                  </FileCard>
                ))}
              </FilesGrid>
            )}

            {totalPages > 1 && (
              <PaginationRow>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p - 1)}
                  disabled={filePage === 1}
                >
                  <ChevronLeftIcon style={{ fontSize: 18 }} />
                </PageBtn>
                <PageInfo>{filePage} / {totalPages}</PageInfo>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p + 1)}
                  disabled={filePage === totalPages}
                >
                  <ChevronRightIcon style={{ fontSize: 18 }} />
                </PageBtn>
              </PaginationRow>
            )}
          </>
        )}
      </ScrollArea>
    </Wrap>
  )
}

export default ClientPanel
