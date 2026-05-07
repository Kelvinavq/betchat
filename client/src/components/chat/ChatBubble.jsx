import { useContext } from 'react'
import styled, { css, keyframes } from 'styled-components'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ChatWindow from './ChatWindow'
import { ChatContext } from '../../context/ChatContext'
import { shadows } from '../../styles/theme'
import '../../css/chat.css'

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.6) rotate(-20deg); }
  to   { opacity: 1; transform: scale(1)   rotate(0deg); }
`

const Bubble = styled.button`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;

  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 0 16px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
  cursor: pointer;

  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%));
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.22);
  box-shadow: ${shadows.glassBubble};

  transition: width 0.4s, border-radius 0.4s, background 0.3s;

  ${({ $isOpen }) => !$isOpen && css`
    &:hover {
      width: 136px;
      border-radius: 30px;
      background: var(--bc-client-button-gradient, linear-gradient(135deg, #16538d 0%, #1a5ef5 100%));
    }
  `}

  &:active {
    background: var(--bc-client-button-gradient, linear-gradient(135deg, #1a8aee 0%, #0840cc 100%));
    transform: scale(0.97);
  }
`

const BubbleIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: ${popIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;

  svg { color: #ffffff; font-size: 1.4rem; }
`

const BubbleText = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s 0.08s;

  ${Bubble}:hover & {
    max-width: 80px;
    opacity: 1;
  }
`

const ChatBubble = () => {
  const { isOpen, setIsOpen } = useContext(ChatContext)

  return (
    <>
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      <Bubble
        $isOpen={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        <BubbleIcon key={isOpen ? 'close' : 'chat'}>
          {isOpen ? <CloseIcon /> : <ChatOutlinedIcon />}
        </BubbleIcon>
        {!isOpen && <BubbleText>Chatear</BubbleText>}
      </Bubble>
    </>
  )
}

export default ChatBubble
