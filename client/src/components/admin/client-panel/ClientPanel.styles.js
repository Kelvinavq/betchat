import styled, { css, keyframes } from 'styled-components'
import { gradients, colors } from '../../../styles/theme'

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`

export const Wrap = styled.div`
  width: ${({ $width, $fullWidth }) => $fullWidth ? '100%' : $width ? `${$width}px` : '320px'};
  min-width: ${({ $width, $fullWidth }) => $fullWidth ? 0 : $width ? `${$width}px` : '320px'};
  height: var(--app-height, 100dvh);
  background: #0a0a16;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  animation: ${fadeIn} 0.22s ease both;
`

/* ── panel header (avatar + username + close) ── */
export const PanelHeader = styled.div`
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  position: relative;
`

export const CloseBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  svg { font-size: 16px; }
  &:hover { color: rgba(255,255,255,0.80); background: rgba(255,255,255,0.06); }
`

export const PanelAvatar = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  border: 2px solid rgba(40, 140, 255, 0.35);
  box-shadow: 0 0 24px rgba(30, 133, 255, 0.20);
`

export const PanelOnlineDot = styled.span`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.20)'};
  border: 2px solid #0a0a16;
`

export const PanelUsername = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
`

export const PanelStatus = styled.span`
  font-size: 12px;
  color: ${({ $online }) => $online ? '#22c55e' : 'rgba(255,255,255,0.30)'};
`

/* ── tabs ── */
export const TabBar = styled.div`
  display: flex;
  padding: 10px 12px 0;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`

export const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: none;
  border-radius: 10px 10px 0 0;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  border-bottom: 2px solid ${({ $active }) => $active ? colors.primaryLight : 'transparent'};
  color: ${({ $active }) => $active ? '#ffffff' : 'rgba(255,255,255,0.38)'};
  letter-spacing: 0.03em;
  svg { font-size: 15px; }
  &:hover { color: rgba(255,255,255,0.72); background: rgba(255,255,255,0.04); }
`

/* ── scroll area ── */
export const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
`

/* ── info cards ── */
export const InfoCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
`

export const InfoCardTitle = styled.div`
  padding: 10px 14px 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.30);
`

export const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  cursor: ${({ $editable }) => $editable ? 'pointer' : 'default'};
  border-radius: 0;
  transition: background 0.15s;
  &:hover { background: ${({ $editable }) => $editable ? 'rgba(255,255,255,0.03)' : 'none'}; }
`

export const FieldLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
`

export const FieldValue = styled.span`
  font-size: 13px;
  color: ${({ $empty }) => $empty ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.82)'};
  font-style: ${({ $empty }) => $empty ? 'italic' : 'normal'};
`

export const FieldInput = styled.input`
  width: 100%;
  padding: 4px 8px;
  background: rgba(30, 133, 255, 0.08);
  border: 1px solid rgba(30, 133, 255, 0.30);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  margin-top: 2px;
  &:focus { border-color: ${colors.primaryLight}; }
`

export const FieldTextarea = styled.textarea`
  width: 100%;
  padding: 6px 8px;
  background: rgba(30, 133, 255, 0.08);
  border: 1px solid rgba(30, 133, 255, 0.30);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: none;
  line-height: 1.5;
  margin-top: 2px;
  &:focus { border-color: ${colors.primaryLight}; }
`

export const EditHint = styled.span`
  font-size: 10px;
  color: rgba(30, 133, 255, 0.50);
  margin-top: 1px;
`

/* ── client tags ── */
export const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px 10px;
`

export const ClientTag = styled.button`
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  border: 1px solid;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  border-color: ${({ $border }) => $border};
  opacity: ${({ $active }) => $active ? 1 : 0.35};
  &:hover { opacity: ${({ $active }) => $active ? 0.82 : 0.60}; }
`

export const AddTagBtn = styled.button`
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px dashed rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.35);
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.65); }
`

/* ── files tab ── */
export const FilterBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
`

export const FilterBtn = styled.button`
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  ${({ $active }) => $active ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.45);
  `}
  &:hover { opacity: 0.82; }
`

export const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

export const FileCard = styled.button`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(30,133,255,0.30); background: rgba(30,133,255,0.06); }
`

export const FileThumb = styled.div`
  height: 72px;
  background: ${({ $bg }) => $bg || 'rgba(30,133,255,0.10)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: rgba(255,255,255,0.50);
  font-weight: 700;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`

export const FileInfo = styled.div`
  padding: 6px 8px;
`

export const FileName = styled.p`
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const FileDate = styled.p`
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  margin-top: 1px;
`

export const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
`

export const PageBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  ${({ $active }) => $active ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.45);
  `}
  &:disabled { opacity: 0.30; cursor: default; }
  &:hover:not(:disabled):not([data-active]) { background: rgba(255,255,255,0.09); }
`

export const PageInfo = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
`

/* ── viewer (lightbox) ── */
export const ViewerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.90);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${fadeIn} 0.22s ease both;
`

export const ViewerContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 90vw;
  max-height: 90vh;
`

export const ViewerFileName = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
  text-align: center;
`

export const ViewerImg = styled.img`
  max-width: 90vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 20px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.06);
`

export const ViewerEmbed = styled.iframe`
  width: min(500px, 88vw);
  height: min(620px, 68vh);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
`

export const ViewerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const ViewerBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
  ${({ $download }) => $download ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
  ` : css`
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.68);
  `}
  svg { font-size: 17px; }
  &:hover { opacity: 0.80; }
`
