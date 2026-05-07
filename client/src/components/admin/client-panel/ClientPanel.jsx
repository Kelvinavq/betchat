import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DescriptionIcon from '@mui/icons-material/Description'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { api, resolveApiAsset } from '../../../utils/api'
import {
  Wrap, PanelHeader, CloseBtn, PanelAvatar, PanelOnlineDot, PanelUsername, PanelStatus,
  TabBar, Tab, ScrollArea,
  InfoCard, InfoCardTitle, FieldRow, FieldLabel, FieldValue, FieldInput, FieldTextarea, EditHint,
  TagsSection, ClientTag, TagCreateRow, TagInput, ColorInput, TagCreateBtn,
  FilterBar, FilterBtn, FilesGrid, FileCard, FileThumb, FileInfo, FileName, FileDate,
  PaginationRow, PageBtn, PageInfo,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg, ViewerEmbed, ViewerActions, ViewerBtn,
} from './ClientPanel.styles'

const DEFAULT_TAGS = [
  { id: 'default-vip', name: 'VIP', color: '#f59e0b' },
  { id: 'default-frecuente', name: 'Frecuente', color: '#60a5fa' },
  { id: 'default-activo', name: 'Activo', color: '#4ade80' },
  { id: 'default-nuevo', name: 'Nuevo', color: '#a78bfa' },
  { id: 'default-riesgo', name: 'Riesgo', color: '#f87171' },
]

const THUMB_COLORS = [
  'linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%)',
  'linear-gradient(135deg, #1a0050 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #50000a 0%, #e8000d 100%)',
  'linear-gradient(135deg, #004d20 0%, #16a34a 100%)',
]

const FILES_PER_PAGE = 6

const normalizeLabel = (value = '') => String(value).trim().toLowerCase()

const colorAlpha = (hex = '#2563eb', alpha = '22') => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `#2563eb${alpha}`
  return `${hex}${alpha}`
}

const normalizeFile = (file) => ({
  ...file,
  url: resolveApiAsset(file.url || ''),
})

const buildFallbackDetails = (client) => ({
  chatId: client.id,
  fullName: client.fullName && client.fullName !== client.username ? client.fullName : '',
  cuil: client.cuil || '',
  note: client.note || '',
  registeredAt: client.joinDate || client.createdAt || '',
  labels: client.clientTags || [],
  files: (client.files || []).map(normalizeFile),
})

const formatDateTime = (value) => {
  if (!value) return 'Sin valor'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin valor'
  return date.toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const EditableField = ({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  normalize,
  validate,
}) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [error, setError] = useState('')

  const save = async () => {
    const nextValue = normalize ? normalize(val) : val
    const nextError = validate ? validate(nextValue) : ''
    if (nextError) {
      setVal(nextValue)
      setError(nextError)
      return
    }

    setError('')
    setVal(nextValue)
    const saved = await onChange(nextValue)
    if (saved !== false) setEditing(false)
  }

  const handleChange = (event) => {
    const nextValue = normalize ? normalize(event.target.value) : event.target.value
    setVal(nextValue)
    if (error) setError('')
  }

  if (editing) {
    return (
      <FieldRow $editable>
        <FieldLabel>{label}</FieldLabel>
        {multiline ? (
          <FieldTextarea
            value={val}
            rows={5}
            maxLength={maxLength}
            onChange={handleChange}
            onBlur={save}
            autoFocus
          />
        ) : (
          <FieldInput
            value={val}
            maxLength={maxLength}
            onChange={handleChange}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        )}
        {error && <EditHint $error>{error}</EditHint>}
      </FieldRow>
    )
  }

  return (
    <FieldRow $editable onClick={() => { setVal(value || ''); setError(''); setEditing(true) }}>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue $empty={!value}>{value || 'Sin valor - clic para editar'}</FieldValue>
      <EditHint>editar</EditHint>
    </FieldRow>
  )
}

const FileViewer = ({ data, onClose }) => {
  const handleDownload = () => {
    if (!data.url) return
    const a = document.createElement('a')
    a.href = data.url
    a.download = data.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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

const ClientPanel = ({ client, onClose, $width, $fullWidth }) => {
  const [tab, setTab] = useState('info')
  const [fileFilter, setFileFilter] = useState('all')
  const [filePage, setFilePage] = useState(1)
  const [viewerData, setViewerData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [labelOptions, setLabelOptions] = useState(DEFAULT_TAGS)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#60a5fa')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [loadedDetails, setLoadedDetails] = useState(() => buildFallbackDetails(client))
  const fallbackDetails = buildFallbackDetails(client)
  const details = loadedDetails.chatId === client.id ? loadedDetails : fallbackDetails

  useEffect(() => {
    let active = true

    const loadClientDetails = async () => {
      try {
        const fallback = buildFallbackDetails(client)
        const payload = await api.get(`/api/chats/${client.id}/client`)
        if (!active) return
        const loaded = payload.client || {}
        setLoadedDetails({
          chatId: client.id,
          fullName: loaded.fullName ?? fallback.fullName,
          cuil: loaded.cuil || '',
          note: loaded.note || '',
          registeredAt: loaded.registeredAt || fallback.registeredAt,
          labels: loaded.labels || [],
          files: (loaded.files || []).map(normalizeFile),
        })
      } catch (error) {
        console.error('No se pudo cargar la informacion del cliente', error)
      }
    }

    loadClientDetails()
    return () => { active = false }
  }, [client])

  useEffect(() => {
    let active = true
    const loadLabels = async () => {
      try {
        const data = await api.get('/api/chats/labels')
        if (!active) return
        const loaded = data.labels || []
        setLabelOptions(loaded.length ? loaded : DEFAULT_TAGS)
      } catch {
        if (active) setLabelOptions(DEFAULT_TAGS)
      }
    }
    loadLabels()
    return () => { active = false }
  }, [])

  const saveDetails = async (patch) => {
    const previous = details
    const next = { ...details, ...patch }
    setLoadedDetails(next)
    setSaving(true)

    try {
      await api.put(`/api/chats/${client.id}/client`, {
        fullName: next.fullName,
        cuil: next.cuil,
        note: next.note,
      })
      return true
    } catch (error) {
      setLoadedDetails(previous)
      window.alert(error.message || 'No se pudo guardar la informacion del cliente')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (tag) => {
    const selectedTag = tag?.name ? tag : null
    if (!selectedTag) return

    const previousLabels = details.labels || []
    const isActive = previousLabels.some(label => normalizeLabel(label.name || label) === normalizeLabel(selectedTag.name))
    const nextLabels = isActive
      ? previousLabels.filter(label => normalizeLabel(label.name || label) !== normalizeLabel(selectedTag.name))
      : [...previousLabels, { name: selectedTag.name, color: selectedTag.color }]

    setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: nextLabels }))
    api.put(`/api/chats/${client.id}/client/labels`, { labels: nextLabels })
      .then((payload) => {
        if (payload.labels) setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: payload.labels }))
      })
      .catch((error) => {
        setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: previousLabels }))
        window.alert(error.message || 'No se pudieron guardar las etiquetas')
      })
  }

  const createAndAssignLabel = async () => {
    const name = newLabelName.trim()
    if (!name || creatingLabel) return
    setCreatingLabel(true)
    try {
    const payload = await api.post('/api/chats/labels', { name, color: newLabelColor })
      const label = payload.label || { name, color: newLabelColor }
      setLabelOptions(prev => {
        const without = prev.filter(item => normalizeLabel(item.name) !== normalizeLabel(label.name))
        return [...without, label].sort((a, b) => String(a.name).localeCompare(String(b.name)))
      })
      setNewLabelName('')
      if (!activeTags.has(normalizeLabel(label.name))) toggleTag(label)
    } catch (error) {
      window.alert(error.message || 'No se pudo crear la etiqueta')
    } finally {
      setCreatingLabel(false)
    }
  }

  const files = details.files || []
  const filteredFiles = fileFilter === 'all'
    ? files
    : files.filter(f => f.type === fileFilter)

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FILES_PER_PAGE))
  const effectiveFilePage = Math.min(filePage, totalPages)
  const pageFiles = filteredFiles.slice((effectiveFilePage - 1) * FILES_PER_PAGE, effectiveFilePage * FILES_PER_PAGE)
  const activeTags = new Set((details.labels || []).map(label => normalizeLabel(label.name || label)))

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
          {client.online ? 'En linea' : 'Desconectado'}
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
        {tab === 'info' && (
          <>
            <InfoCard>
              <InfoCardTitle>Datos de cuenta</InfoCardTitle>
              <FieldRow>
                <FieldLabel>Fecha de registro</FieldLabel>
                <FieldValue>{formatDateTime(details.registeredAt)}</FieldValue>
              </FieldRow>
              <EditableField
                label="CUIT / CUIL"
                value={details.cuil}
                normalize={value => String(value || '').replace(/\D/g, '').slice(0, 11)}
                validate={value => value && value.length !== 11 ? 'Debe tener exactamente 11 digitos o quedar vacio.' : ''}
                onChange={value => saveDetails({ cuil: value })}
              />
              <EditableField
                label="Nombre del titular"
                value={details.fullName}
                maxLength={50}
                validate={value => value.length > 50 ? 'Maximo 50 caracteres.' : ''}
                onChange={value => saveDetails({ fullName: value })}
              />
            </InfoCard>

            <InfoCard>
              <InfoCardTitle>Nota</InfoCardTitle>
              <EditableField
                label="Nota interna"
                value={details.note}
                maxLength={5000}
                onChange={value => saveDetails({ note: value })}
                multiline
              />
              {saving && <EditHint style={{ display: 'block', padding: '0 14px 10px' }}>Guardando...</EditHint>}
            </InfoCard>

            <InfoCard>
              <InfoCardTitle>Etiquetas</InfoCardTitle>
              <TagsSection>
                {labelOptions.map(tag => (
                  <ClientTag
                    key={tag.id}
                    type="button"
                    $active={activeTags.has(normalizeLabel(tag.name))}
                    $bg={colorAlpha(tag.color)}
                    $color={tag.color || '#2563eb'}
                    $border={colorAlpha(tag.color, '55')}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.name}
                  </ClientTag>
                ))}
              </TagsSection>
              <TagCreateRow>
                <TagInput
                  value={newLabelName}
                  maxLength={80}
                  placeholder="Nueva etiqueta"
                  onChange={event => setNewLabelName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') createAndAssignLabel()
                  }}
                />
                <ColorInput
                  type="color"
                  value={newLabelColor}
                  aria-label="Color de etiqueta"
                  onChange={event => setNewLabelColor(event.target.value)}
                />
                <TagCreateBtn
                  type="button"
                  disabled={!newLabelName.trim() || creatingLabel}
                  onClick={createAndAssignLabel}
                >
                  {creatingLabel ? '...' : 'Crear'}
                </TagCreateBtn>
              </TagCreateRow>
            </InfoCard>
          </>
        )}

        {tab === 'files' && (
          <>
            <FilterBar>
              <FilterBtn $active={fileFilter === 'all'} type="button" onClick={() => { setFileFilter('all'); setFilePage(1) }}>Todos</FilterBtn>
              <FilterBtn $active={fileFilter === 'image'} type="button" onClick={() => { setFileFilter('image'); setFilePage(1) }}>Imagenes</FilterBtn>
              <FilterBtn $active={fileFilter === 'pdf'} type="button" onClick={() => { setFileFilter('pdf'); setFilePage(1) }}>Docs</FilterBtn>
            </FilterBar>

            {pageFiles.length === 0 ? (
              <FieldValue $empty style={{ textAlign: 'center', padding: '20px 0' }}>
                Sin archivos
              </FieldValue>
            ) : (
              <FilesGrid>
                {pageFiles.map(file => (
                  <FileCard key={file.id} type="button" onClick={() => openFile(file)}>
                    <FileThumb $bg={THUMB_COLORS[Number(file.id || 0) % THUMB_COLORS.length]}>
                      {file.type === 'image'
                        ? file.url ? <img src={file.url} alt={file.name} /> : 'IMG'
                        : <DescriptionIcon style={{ fontSize: 32, color: 'rgba(255,255,255,0.55)' }} />
                      }
                    </FileThumb>
                    <FileInfo>
                      <FileName>{file.name}</FileName>
                      <FileDate>{formatDateTime(file.date)}</FileDate>
                    </FileInfo>
                  </FileCard>
                ))}
              </FilesGrid>
            )}

            {filteredFiles.length > FILES_PER_PAGE && (
              <PaginationRow>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p - 1)}
                  disabled={effectiveFilePage === 1}
                >
                  <ChevronLeftIcon style={{ fontSize: 18 }} />
                </PageBtn>
                <PageInfo>{effectiveFilePage} / {totalPages}</PageInfo>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p + 1)}
                  disabled={effectiveFilePage === totalPages}
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
