import { useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes, css } from 'styled-components'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'

const fadeIn = keyframes`
  from { opacity: 0 }
  to   { opacity: 1 }
`
const slideUp = keyframes`
  from { transform: translateY(10px) scale(0.97); opacity: 0 }
  to   { transform: translateY(0)     scale(1);    opacity: 1 }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.60);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 16px;
  animation: ${fadeIn} 0.16s ease;
`

const Card = styled.div`
  width: 340px;
  max-width: 100%;
  background: #0e0e22;
  border: 1px solid ${({ $danger }) => $danger ? 'rgba(239,68,68,0.24)' : 'rgba(40,140,255,0.20)'};
  border-radius: 20px;
  padding: 28px 24px 22px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.72);
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: ${slideUp} 0.20s cubic-bezier(0.22, 1, 0.36, 1);
`

const IconWrap = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;

  ${({ $variant }) => {
    if ($variant === 'danger')  return css`background: rgba(239,68,68,0.12); svg { color: #ef4444; }`
    if ($variant === 'error')   return css`background: rgba(239,68,68,0.12); svg { color: #ef4444; }`
    if ($variant === 'warning') return css`background: rgba(245,158,11,0.12); svg { color: #f59e0b; }`
    return css`background: rgba(30,133,255,0.12); svg { color: #60a5fa; }`
  }}

  svg { font-size: 26px; }
`

const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
`

const Message = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.52);
  line-height: 1.6;
  margin-bottom: 10px;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
`

const Btn = styled.button`
  flex: 1;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: background 0.16s, color 0.16s, transform 0.10s;

  &:active { transform: scale(0.97); }

  ${({ $primary, $variant }) => {
    if ($primary) {
      if ($variant === 'danger' || $variant === 'error') return css`
        background: #ef4444;
        color: #fff;
        &:hover { background: #dc2626; }
      `
      return css`
        background: rgba(30,133,255,0.90);
        color: #fff;
        &:hover { background: rgba(30,133,255,1); }
      `
    }
    return css`
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.65);
      border: 1px solid rgba(255,255,255,0.08);
      &:hover { background: rgba(255,255,255,0.11); color: #fff; }
    `
  }}
`

const ICONS = {
  danger:  DeleteOutlinedIcon,
  warning: WarningAmberOutlinedIcon,
  error:   ErrorOutlineIcon,
  info:    InfoOutlinedIcon,
}

const ConfirmDialogUI = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'warning',
  alertOnly    = false,
  onConfirm,
  onCancel,
}) => {
  const Icon = ICONS[variant] || ICONS.warning
  return (
    <Overlay onMouseDown={e => { if (e.target === e.currentTarget && !alertOnly) onCancel?.() }}>
      <Card $danger={variant === 'danger' || variant === 'error'}>
        <IconWrap $variant={variant}><Icon /></IconWrap>
        <Title>{title}</Title>
        {message && <Message>{message}</Message>}
        <Actions>
          {!alertOnly && (
            <Btn type="button" onClick={onCancel}>{cancelLabel}</Btn>
          )}
          <Btn type="button" $primary $variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </Actions>
      </Card>
    </Overlay>
  )
}

export const useConfirm = () => {
  const [state, setState] = useState(null)

  const show = (options) => new Promise((resolve) => {
    setState({ ...options, resolve })
  })

  const close = (result) => {
    state?.resolve(result)
    setState(null)
  }

  const confirm = (options) => show(options)

  const alert = (options) => show({ ...options, alertOnly: true, confirmLabel: options.confirmLabel || 'Entendido' })

  const dialogNode = state
    ? createPortal(
        <ConfirmDialogUI
          {...state}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />,
        document.body
      )
    : null

  return { confirm, alert, dialogNode }
}

export default ConfirmDialogUI
