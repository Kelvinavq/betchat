import { createContext, useState } from 'react'

export const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [clientSession, setClientSession] = useState(null)
  const [clientAuthLoading, setClientAuthLoading] = useState(false)

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      setMessages,
      clientSession,
      setClientSession,
      clientAuthLoading,
      setClientAuthLoading,
    }}>
      {children}
    </ChatContext.Provider>
  )
}
