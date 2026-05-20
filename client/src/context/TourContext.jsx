import { createContext, useContext, useState, useCallback } from 'react'

const TourContext = createContext(null)

export const TourProvider = ({ children }) => {
  const [running, setRunning] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [tourKey, setTourKey] = useState(0)

  const startTour = useCallback((section) => {
    setActiveSection(section)
    setRunning(true)
    setTourKey(k => k + 1)
  }, [])

  const stopTour = useCallback(() => {
    setRunning(false)
    setActiveSection(null)
  }, [])

  return (
    <TourContext.Provider value={{ running, activeSection, tourKey, startTour, stopTour }}>
      {children}
    </TourContext.Provider>
  )
}

export const useTour = () => useContext(TourContext)
