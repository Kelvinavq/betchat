import styled, { keyframes } from 'styled-components'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeIn} 0.25s ease;
`

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #f1f5f9);
  letter-spacing: -0.01em;
`

export const Sub = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
  line-height: 1.5;
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
`

export const Card = styled.div`
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.18s;

  &:hover {
    border-color: rgba(148,163,184,0.22);
  }
`

export const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

export const CardLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  flex: 1;
  min-width: 0;
`

export const IconBubble = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${p => p.$bg || 'rgba(var(--bc-admin-accent-rgb, 30,133,255), 0.12)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
  line-height: 1;
`

export const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

export const CardLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const CardDesc = styled.span`
  font-size: 11.5px;
  color: var(--text-muted, #94a3b8);
  line-height: 1.4;
`

export const Toggle = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: ${p => p.$on ? 'var(--bc-admin-accent, #1e85ff)' : 'rgba(255,255,255,0.12)'};
  position: relative;
  transition: background 0.2s;
  margin-top: 2px;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${p => p.$on ? '18px' : '3px'};
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
  }
`

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 74px;
  resize: vertical;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--text-primary, #f1f5f9);
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.18s;

  &:focus {
    border-color: rgba(var(--bc-admin-accent-rgb, 30,133,255), 0.65);
  }

  &::placeholder {
    color: var(--text-muted, #64748b);
  }

  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    resize: none;
  }
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
`

export const SaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 20px;
  height: 38px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.18s, opacity 0.18s;
  background: ${p => p.$saved ? 'rgba(16,185,129,0.18)' : 'var(--bc-admin-button-gradient, linear-gradient(135deg, #0a2e50 0%, #1e85ff 100%))'};
  color: ${p => p.$saved ? '#34d399' : '#fff'};

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  svg {
    font-size: 16px;
  }
`

export const StatusLine = styled.div`
  font-size: 12px;
  color: ${p => p.$error ? '#f87171' : '#94a3b8'};
`
