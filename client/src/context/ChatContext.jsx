import { createContext, useState } from 'react'

export const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  )
}
