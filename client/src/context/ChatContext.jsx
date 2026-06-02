import { createContext, useEffect, useState } from 'react'

export const ChatContext = createContext(null)

const IFRAME_LOGIN_STORAGE_KEY = 'betchat_iframe_login_data'

function readIframeLoginData() {
  try {
    const raw = sessionStorage.getItem(IFRAME_LOGIN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const username = String(parsed?.username || '').trim()
    const password = String(parsed?.password || '')
    if (!username && !password) return null
    return { username, password }
  } catch {
    return null
  }
}

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [clientSession, setClientSession] = useState(null)
  const [clientAuthLoading, setClientAuthLoading] = useState(false)
  const [iframeLoginData, setIframeLoginData] = useState(() => readIframeLoginData())

  useEffect(() => {
    try {
      if (iframeLoginData?.username || iframeLoginData?.password) {
        sessionStorage.setItem(IFRAME_LOGIN_STORAGE_KEY, JSON.stringify(iframeLoginData))
      } else {
        sessionStorage.removeItem(IFRAME_LOGIN_STORAGE_KEY)
      }
    } catch {
      // ignore storage failures
    }
  }, [iframeLoginData])

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
      iframeLoginData,
      setIframeLoginData,
    }}>
      {children}
    </ChatContext.Provider>
  )
}
