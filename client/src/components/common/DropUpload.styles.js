import styled, { keyframes, css } from 'styled-components'
import { gradients, colors } from '../../styles/theme'

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`

const ripple = keyframes`
  0%   { transform: scale(0.82); opacity: 0; }
  40%  { opacity: 1; }
  100% { transform: scale(1.40); opacity: 0; }
`

const floatIcon = keyframes`
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
`

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 32px rgba(30, 133, 255, 0.32); }
  50%       { box-shadow: 0 0 58px rgba(30, 133, 255, 0.60); }
`

const badgePop = keyframes`
  from { opacity: 0; transform: scale(0.75) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`

/* ── overlay (IS the drop zone — dashed border via ::before) ── */
export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 25;
  background: ${({ $dragging }) =>
    $dragging ? 'rgba(6, 10, 26, 0.98)' : 'rgba(6, 6, 16, 0.96)'};
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 20px;
  animation: ${slideUp} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: background 0.22s;

  /* dashed border inset — hidden in preview mode */
  &::before {
    content: '';
    position: absolute;
    inset: 12px;
    border-radius: 20px;
    pointer-events: none;
    transition: border-color 0.22s;
    border: 2px dashed ${({ $dragging, $hasPreview }) =>
      $hasPreview  ? 'transparent' :
      $dragging    ? 'rgba(30, 133, 255, 0.70)' :
                     'rgba(30, 133, 255, 0.26)'};
  }
`

/* kept for legacy — not rendered by current DropUpload */
export const DropZone = styled.div``

/* ── rings + icon ── */
export const RingsWrap = styled.div`
  position: relative;
  width: 158px;
  height: 158px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export const Ring = styled.span`
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(30, 133, 255, ${({ $alpha }) => $alpha ?? 0.18});
  width:  ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  animation: ${ripple} ${({ $dur }) => $dur ?? '3s'} ease-out infinite;
  animation-delay: ${({ $delay }) => $delay ?? '0s'};
`

export const IconCircle = styled.div`
  position: relative;
  z-index: 1;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: ${gradients.btn};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${floatIcon} 3s ease-in-out infinite, ${glowPulse} 3s ease-in-out infinite;

  svg {
    color: #ffffff;
    font-size: 28px;
    transition: transform 0.2s;
  }

  ${({ $dragging }) => $dragging && css`
    animation: ${glowPulse} 0.8s ease-in-out infinite;
    svg { transform: scale(1.15); }
  `}
`

/* ── text ── */
export const DropTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ $dragging }) => $dragging ? colors.primaryLighter : '#ffffff'};
  text-align: center;
  transition: color 0.2s;
  margin: 0;
`

export const DropSubtitle = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.32);
  text-align: center;
  line-height: 1.5;
  margin: 0;
  max-width: 260px;
`

export const BrowseBtn = styled.button`
  padding: 7px 18px;
  border-radius: 20px;
  background: rgba(30, 133, 255, 0.12);
  border: 1px solid rgba(30, 133, 255, 0.28);
  color: ${colors.primaryLighter};
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  &:hover { background: rgba(30, 133, 255, 0.22); border-color: rgba(30, 133, 255, 0.45); }
`

export const ErrorMsg = styled.p`
  font-size: 12px;
  color: #f87171;
  text-align: center;
  margin: 0;
`

/* ── preview ── */
export const TypeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  animation: ${badgePop} 0.22s ease both;
  flex-shrink: 0;

  ${({ $type }) => $type === 'image' ? css`
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.28);
    color: #4ade80;
  ` : css`
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.28);
    color: #60a5fa;
  `}

  svg { font-size: 13px; }
`

export const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.60);
`

export const PdfCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 36px;
  background: rgba(30, 133, 255, 0.07);
  border: 1px solid rgba(30, 133, 255, 0.18);
  border-radius: 18px;
  text-align: center;

  svg { font-size: 2.8rem; color: ${colors.primaryLighter}; }

  span {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
    word-break: break-all;
    max-width: 220px;
  }

  small {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.28);
    display: block;
  }
`

export const PreviewActions = styled.div`
  display: flex;
  gap: 10px;
  flex-shrink: 0;
`

export const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  ${({ $primary }) => $primary ? css`
    background: ${gradients.btn};
    border: none;
    color: #ffffff;
    box-shadow: 0 4px 18px rgba(13, 79, 232, 0.42);
  ` : css`
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.60);
  `}

  svg { font-size: 16px; }
  &:hover { opacity: 0.82; }
  &:active { transform: scale(0.97); }
`

export const CloseBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  svg { font-size: 18px; }
  &:hover { background: rgba(255, 255, 255, 0.13); color: rgba(255, 255, 255, 0.90); }
`
