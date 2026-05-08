import styled, { keyframes, css } from 'styled-components'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`

const slideToast = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

/* ─────────────────────────────
   PAGE SHELL
───────────────────────────── */
export const PageWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: var(--app-height, 100dvh);
  overflow: hidden;
  background: #08080f;
  color: #e2e8f0;
`

export const PageHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
  gap: 12px;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

export const MenuBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
`

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

export const PageTitle = styled.h1`
  font-size: 17px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const PageSub = styled.p`
  font-size: 12px;
  color: #475569;
  margin: 0;
  white-space: nowrap;
  @media (max-width: 480px) { display: none; }
`

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

export const HeaderBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  ${({ $v }) => $v === 'ghost' && css`
    background: rgba(255,255,255,0.05);
    color: #94a3b8;
    border-color: rgba(255,255,255,0.07);
    &:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
  `}

  ${({ $v }) => $v === 'primary' && css`
    background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
    color: #fff;
    &:hover { background: linear-gradient(135deg, #16538d 0%, #1a5ef5 100%); }
    &:active { background: linear-gradient(135deg, #1a8aee 0%, #0840cc 100%); }
  `}

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    pointer-events: none;
  }

  @media (max-width: 560px) {
    padding: 0 10px;
    gap: 0;
    span { display: none; }
  }
`

/* ─────────────────────────────
   BUILDER LAYOUT
───────────────────────────── */
export const BuilderLayout = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

/* ─────────────────────────────
   FLOW PANEL  (left)
───────────────────────────── */
export const FlowPanel = styled.aside`
  width: 256px;
  min-width: 256px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
  background: rgba(0,0,0,0.18);

  @media (max-width: 767px) {
    display: ${({ $hidden }) => $hidden ? 'none' : 'flex'};
    width: 100%;
    min-width: 0;
    flex: none;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
`

export const FlowPanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
`

export const FlowPanelTitle = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #3d4f6a;
`

export const ScreenList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
`

export const ScreenCard = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.30)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.07)' : 'transparent'};
  cursor: pointer;
  text-align: left;
  transition: all 0.14s;

  &:hover {
    background: ${({ $active }) => $active ? 'rgba(30,133,255,0.09)' : 'rgba(255,255,255,0.04)'};
    border-color: ${({ $active }) => $active ? 'rgba(30,133,255,0.35)' : 'rgba(255,255,255,0.06)'};
  }
`

export const ScreenCardDot = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  background: ${({ $root }) => $root ? 'rgba(30,133,255,0.14)' : 'rgba(255,255,255,0.05)'};
  color: ${({ $root }) => $root ? '#1e85ff' : '#475569'};
`

export const ScreenCardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const ScreenCardName = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ $active }) => $active ? '#d4dce8' : '#64748b'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 5px;
`

export const RootBadge = styled.span`
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(30,133,255,0.14);
  color: #1e85ff;
  flex-shrink: 0;
`

export const ScreenCardMeta = styled.span`
  font-size: 11px;
  color: #2d3a4d;
`

export const AddScreenBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: calc(100% - 0px);
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(255,255,255,0.07);
  background: transparent;
  color: #334155;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.14s;
  margin-top: 4px;

  &:hover {
    border-color: rgba(30,133,255,0.28);
    color: #1e85ff;
    background: rgba(30,133,255,0.04);
  }
`

/* ─────────────────────────────
   EDITOR PANEL  (right)
───────────────────────────── */
export const EditorPanel = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;

  @media (max-width: 767px) {
    display: ${({ $hidden }) => $hidden ? 'none' : 'flex'};
    flex: 1;
  }
`

export const MobileBackBtn = styled.button`
  display: none;

  @media (max-width: 767px) {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border-radius: 7px;
    border: none;
    background: rgba(255,255,255,0.05);
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.14s;
    white-space: nowrap;
    flex-shrink: 0;
    svg { font-size: 15px; }
    &:hover { background: rgba(255,255,255,0.09); color: #94a3b8; }
  }
`

export const EditorPanelHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
`

export const ScreenNameInput = styled.input`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  background: transparent;
  border: none;
  outline: none;
  min-width: 0;
  padding: 3px 6px;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover { background: rgba(255,255,255,0.03); }
  &:focus { background: rgba(255,255,255,0.04); }
  &::placeholder { color: #334155; }
`

export const EditorActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #334155;
  cursor: pointer;
  transition: all 0.14s;
  flex-shrink: 0;

  &:hover {
    background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'};
    color: ${({ $danger }) => $danger ? '#f87171' : '#94a3b8'};
  }
`

export const EditorScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
`

export const SectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #2d3a4d;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.04);
  }
`

export const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 44px;
`

export const ItemCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid ${({ $dropTarget }) => $dropTarget ? 'rgba(30,133,255,0.42)' : 'rgba(255,255,255,0.055)'};
  background: ${({ $dragging, $dropTarget }) =>
    $dragging    ? 'rgba(30,133,255,0.07)' :
    $dropTarget  ? 'rgba(30,133,255,0.04)' :
    'rgba(255,255,255,0.025)'};
  opacity: ${({ $dragging }) => $dragging ? 0.45 : 1};
  cursor: grab;
  transition: border-color 0.13s, background 0.13s, opacity 0.13s, transform 0.13s;
  animation: ${fadeUp} 0.18s ease-out;
  transform: ${({ $dropTarget }) => $dropTarget ? 'translateY(-1px)' : 'none'};
  box-shadow: ${({ $dropTarget }) => $dropTarget ? '0 4px 16px rgba(30,133,255,0.12)' : 'none'};

  &:hover {
    border-color: ${({ $dropTarget }) => $dropTarget ? 'rgba(30,133,255,0.42)' : 'rgba(255,255,255,0.09)'};
    background: ${({ $dragging, $dropTarget }) =>
      $dragging    ? 'rgba(30,133,255,0.07)' :
      $dropTarget  ? 'rgba(30,133,255,0.04)' :
      'rgba(255,255,255,0.04)'};
  }
  &:active { cursor: grabbing; }
`

export const DragHandle = styled.div`
  display: flex;
  align-items: center;
  color: #1e2a3a;
  flex-shrink: 0;
  cursor: grab;
  padding: 2px;
  border-radius: 4px;
  transition: color 0.13s;
  ${ItemCard}:hover & { color: #2d3a4e; }
`

export const ItemTypeIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  ${({ $type, $isBack }) => {
    if ($isBack) return css`background: rgba(245,158,11,0.11); color: #f59e0b;`
    if ($type === 'message') return css`background: rgba(30,133,255,0.10); color: #3b9eff;`
    return css`background: rgba(16,185,129,0.10); color: #10b981;`
  }}
`

export const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const ItemTypeLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;

  ${({ $type, $isBack }) => {
    if ($isBack) return css`color: #b45309;`
    if ($type === 'message') return css`color: #2563c8;`
    return css`color: #0e9068;`
  }}
`

export const ItemText = styled.span`
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

export const ItemSubText = styled.span`
  font-size: 11px;
  color: #2d3a4d;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.13s;
  flex-shrink: 0;
  ${ItemCard}:hover & { opacity: 1; }
`

export const ItemActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #334155;
  cursor: pointer;
  transition: all 0.13s;

  &:hover {
    background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'};
    color: ${({ $danger }) => $danger ? '#f87171' : '#94a3b8'};
  }
`

export const AddItemsBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
`

export const AddItemBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px dashed ${({ $type }) =>
    $type === 'message' ? 'rgba(30,133,255,0.25)' : 'rgba(16,185,129,0.25)'};
  background: transparent;
  color: ${({ $type }) =>
    $type === 'message' ? 'rgba(30,133,255,0.65)' : 'rgba(16,185,129,0.65)'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s;

  &:hover {
    background: ${({ $type }) =>
      $type === 'message' ? 'rgba(30,133,255,0.06)' : 'rgba(16,185,129,0.06)'};
    border-style: solid;
    color: ${({ $type }) =>
      $type === 'message' ? '#1e85ff' : '#10b981'};
  }
`

export const EmptyEditor = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 40px;
`

export const EmptyEditorIcon = styled.div`
  font-size: 36px;
  opacity: 0.2;
`

export const EmptyEditorTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin: 0;
`

export const EmptyEditorSub = styled.p`
  font-size: 12px;
  color: #1e2a3a;
  margin: 0;
`

export const EmptyItemsHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px dashed rgba(255,255,255,0.05);
  border-radius: 10px;
  color: #2d3a4d;
  font-size: 12.5px;
  gap: 8px;
`

/* ─────────────────────────────
   MODALS
───────────────────────────── */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

export const ModalCard = styled.div`
  background: #0d0e1e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05);
  animation: ${scaleIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
`

export const ModalHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 20px 0;
  flex-shrink: 0;
  gap: 12px;
`

export const ModalTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 3px;
`

export const ModalSub = styled.p`
  font-size: 11.5px;
  color: #475569;
  margin: 0;
`

export const ModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: rgba(255,255,255,0.05);
  color: #475569;
  cursor: pointer;
  transition: all 0.14s;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.10); color: #94a3b8; }
`

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const FieldLabel = styled.label`
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
`

export const FieldHint = styled.p`
  font-size: 11px;
  color: #2d3a4d;
  margin: 0;
  line-height: 1.5;
`

export const FieldInput = styled.input`
  width: 100%;
  height: 38px;
  padding: 0 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &:focus { border-color: rgba(30,133,255,0.40); }
  &::placeholder { color: #253040; }
`

export const FieldTextarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13.5px;
  outline: none;
  resize: vertical;
  min-height: 96px;
  font-family: inherit;
  line-height: 1.55;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &:focus { border-color: rgba(30,133,255,0.40); }
  &::placeholder { color: #253040; }
`

export const FieldSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 0 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13.5px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.14s;
  box-sizing: border-box;
  &:focus { border-color: rgba(30,133,255,0.40); }
  option { background: #0d0e1e; color: #e2e8f0; }
`

export const FieldCheckRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  transition: background 0.13s, border-color 0.13s;
  &:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.09); }
`

export const FieldCheckbox = styled.input`
  width: 15px;
  height: 15px;
  margin-top: 1px;
  accent-color: #1e85ff;
  cursor: pointer;
  flex-shrink: 0;
`

export const FieldCheckInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const FieldCheckTitle = styled.span`
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
`

export const FieldCheckSub = styled.span`
  font-size: 11px;
  color: #334155;
`

export const ModalFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
`

export const FootLeft = styled.div`
  flex: 1;
`

export const ModalBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 15px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s;
  white-space: nowrap;

  ${({ $v }) => $v === 'ghost' && css`
    background: rgba(255,255,255,0.05);
    color: #64748b;
    &:hover { background: rgba(255,255,255,0.09); color: #94a3b8; }
  `}

  ${({ $v }) => $v === 'primary' && css`
    background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
    color: #fff;
    &:hover { background: linear-gradient(135deg, #16538d 0%, #1a5ef5 100%); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  `}

  ${({ $v }) => $v === 'danger' && css`
    background: rgba(239,68,68,0.09);
    color: #f87171;
    border: 1px solid rgba(239,68,68,0.18);
    &:hover { background: rgba(239,68,68,0.16); }
  `}
`

/* ─────────────────────────────
   PREVIEW MODAL
───────────────────────────── */
export const PreviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

export const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: ${scaleIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`

export const PreviewTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 360px;
`

export const PreviewLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #3d4f6a;
  letter-spacing: 0.05em;
`

export const PreviewControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const PreviewCtrlBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: #64748b;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.14s;
  &:hover { background: rgba(255,255,255,0.11); color: #94a3b8; }
`

export const PhoneFrame = styled.div`
  width: 360px;
  height: 600px;
  background: #080810;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 40px 80px rgba(0,0,0,0.70),
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 0 0 4px rgba(255,255,255,0.02);
`

export const PhoneChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.025);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
`

export const PhoneChatAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

export const PhoneChatInfo = styled.div`flex: 1; min-width: 0;`

export const PhoneChatName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
`

export const PhoneChatOnline = styled.div`
  font-size: 10.5px;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #10b981;
    display: inline-block;
  }
`

export const PhoneChatBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  &::-webkit-scrollbar { width: 0; }
`

const bubbleIn = keyframes`
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const BotBubble = styled.div`
  align-self: flex-start;
  max-width: 86%;
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px 14px 14px 3px;
  padding: 8px 12px;
  font-size: 12.5px;
  color: #d4dce8;
  line-height: 1.55;
  animation: ${bubbleIn} 0.22s ease-out;
  white-space: pre-wrap;
  word-break: break-word;
`

export const BotTyping = styled.div`
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px 14px 14px 3px;
  animation: ${bubbleIn} 0.2s ease-out;
`

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30% { transform: translateY(-4px); opacity: 1; }
`

export const TypingDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #475569;
  animation: ${dotBounce} 1s ease-in-out infinite;
  animation-delay: ${({ $i }) => $i * 0.15}s;
`

export const ButtonsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  animation: ${bubbleIn} 0.28s ease-out;
`

export const PreviewButton = styled.button`
  width: 100%;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid ${({ $isBack }) =>
    $isBack ? 'rgba(245,158,11,0.22)' : 'rgba(30,133,255,0.22)'};
  background: ${({ $isBack }) =>
    $isBack ? 'rgba(245,158,11,0.06)' : 'rgba(30,133,255,0.06)'};
  color: ${({ $isBack }) =>
    $isBack ? '#d97706' : '#60a5fa'};
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s;
  text-align: center;

  &:hover {
    background: ${({ $isBack }) =>
      $isBack ? 'rgba(245,158,11,0.13)' : 'rgba(30,133,255,0.13)'};
    border-color: ${({ $isBack }) =>
      $isBack ? 'rgba(245,158,11,0.38)' : 'rgba(30,133,255,0.38)'};
  }
`

export const ScreenBreadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #1a2535;
  padding: 3px 0;
  text-align: center;
  justify-content: center;
`

/* ─────────────────────────────
   SAVE TOAST
───────────────────────────── */
export const SaveToast = styled.div`
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${({ $type }) => $type === 'danger' ? 'rgba(239,68,68,0.13)' : 'rgba(16,185,129,0.12)'};
  border: 1px solid ${({ $type }) => $type === 'danger' ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.28)'};
  border-radius: 10px;
  color: ${({ $type }) => $type === 'danger' ? '#f87171' : '#10b981'};
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,0.40);
  animation: ${slideToast} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
`
