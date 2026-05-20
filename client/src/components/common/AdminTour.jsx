import { useState, useCallback } from 'react'
import { Joyride, STATUS } from 'react-joyride'
import styled, { keyframes, css } from 'styled-components'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import CloseIcon from '@mui/icons-material/Close'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { useTour } from '../../context/TourContext'
import { SECTION_TOURS, ALL_SECTIONS } from '../../tours/tourSteps'

/* ── animations ── */
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
`

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(30, 133, 255, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(30, 133, 255, 0); }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`

/* ── floating button ── */
const FloatBtn = styled.button`
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(30, 133, 255, 0.35);
  background: rgba(16, 24, 44, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(30, 133, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  transition: transform 0.18s, background 0.18s, border-color 0.18s, color 0.18s;
  animation: ${pulse} 3s ease-in-out 2s 3;

  svg { font-size: 20px; }

  &:hover {
    transform: scale(1.12);
    background: rgba(30, 133, 255, 0.18);
    border-color: rgba(30, 133, 255, 0.7);
    color: #1e85ff;
  }

  &:active {
    transform: scale(0.95);
  }
`

const FloatTooltip = styled.span`
  position: absolute;
  bottom: 52px;
  right: 0;
  background: rgba(22, 22, 42, 0.96);
  border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.82);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 7px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.15s, transform 0.15s;

  ${FloatBtn}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`

/* ── modal overlay ── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

const Modal = styled.div`
  background: #13131f;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55);
  animation: ${fadeIn} 0.22s cubic-bezier(0.16,1,0.3,1) both;
  overflow: hidden;
`

const ModalHead = styled.div`
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: flex-start;
  gap: 14px;
`

const HeadIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(30, 133, 255, 0.12);
  border: 1px solid rgba(30, 133, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e85ff;
  flex-shrink: 0;
  svg { font-size: 22px; }
`

const HeadText = styled.div`
  flex: 1;
  min-width: 0;
`

const ModalTitle = styled.h2`
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 3px;
  letter-spacing: -0.01em;
`

const ModalSub = styled.p`
  font-size: 13px;
  color: rgba(255,255,255,0.46);
  margin: 0;
`

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  svg { font-size: 18px; }

  &:hover {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
  }
`

const ModalBody = styled.div`
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`

const SectionBtn = styled.button`
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
  animation: ${slideUp} 0.3s both;
  animation-delay: ${({ $i }) => $i * 0.035}s;

  &:hover {
    background: rgba(30, 133, 255, 0.08);
    border-color: rgba(30, 133, 255, 0.28);
    transform: translateX(2px);
  }

  &:active {
    transform: translateX(0) scale(0.99);
  }

  ${({ $active }) => $active && css`
    background: rgba(30, 133, 255, 0.1);
    border-color: rgba(30, 133, 255, 0.35);
  `}
`

const SectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const SectionLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  margin-bottom: 2px;
`

const SectionDesc = styled.div`
  font-size: 12px;
  color: rgba(255,255,255,0.4);
`

const SectionMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
`

const StepsBadge = styled.span`
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 2px 8px;
  white-space: nowrap;
`

const DoneBadge = styled.span`
  font-size: 11px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border-radius: 20px;
  padding: 2px 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  svg { font-size: 12px; }
`

const PlayIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(30, 133, 255, 0.12);
  color: #1e85ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { font-size: 16px; }
`

const ModalFooter = styled.div`
  padding: 14px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.28);
`

/* ── Joyride custom tooltip ── */
const TooltipOuter = styled.div`
  background: #1c2845;
  border: 1.5px solid rgba(30, 133, 255, 0.45);
  border-radius: 14px;
  padding: 0;
  width: min(340px, calc(100vw - 32px));
  min-width: 0;
  box-shadow: 0 12px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(30,133,255,0.12), 0 0 24px rgba(30,133,255,0.08);
  overflow: hidden;
`

const TooltipHeader = styled.div`
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(30,133,255,0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const TooltipTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.01em;
`

const TooltipCloseBtn = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
  svg { font-size: 15px; }

  &:hover {
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.75);
  }
`

const TooltipBody = styled.div`
  padding: 12px 18px;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255,255,255,0.7);
  white-space: pre-line;
`

const TooltipFooter = styled.div`
  padding: 10px 18px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const TooltipProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const ProgressDot = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? '#4da3ff' : 'rgba(30,133,255,0.25)'};
  transition: background 0.2s, transform 0.2s;
  transform: ${({ $active }) => $active ? 'scale(1.25)' : 'scale(1)'};
`

const TooltipActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const TBtn = styled.button`
  border: none;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 13px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;

  ${({ $variant }) => $variant === 'primary' ? css`
    background: #1e85ff;
    color: #fff;
    &:hover { background: #3b94ff; }
    &:active { opacity: 0.85; }
  ` : $variant === 'back' ? css`
    background: rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.6);
    &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); }
  ` : css`
    background: transparent;
    color: rgba(255,255,255,0.3);
    font-size: 12px;
    padding: 6px 8px;
    &:hover { color: rgba(255,255,255,0.55); }
  `}
`

/* ── custom tooltip component for Joyride ── */
const TourTooltip = ({ continuous, index, size, step, backProps, closeProps, primaryProps, skipProps, isLastStep, tooltipProps }) => (
  <TooltipOuter {...tooltipProps}>
    <TooltipHeader>
      <TooltipTitle>{step.title}</TooltipTitle>
      <TooltipCloseBtn {...closeProps}><CloseIcon /></TooltipCloseBtn>
    </TooltipHeader>

    <TooltipBody>{step.content}</TooltipBody>

    <TooltipFooter>
      <TooltipProgress>
        {Array.from({ length: size }).map((_, i) => (
          <ProgressDot key={i} $active={i === index} />
        ))}
      </TooltipProgress>

      <TooltipActions>
        {index > 0 && (
          <TBtn $variant="back" {...backProps}>← Atrás</TBtn>
        )}
        {index === 0 && (
          <TBtn $variant="skip" {...skipProps}>Saltar</TBtn>
        )}
        <TBtn $variant="primary" {...primaryProps}>
          {isLastStep ? 'Finalizar ✓' : 'Siguiente →'}
        </TBtn>
      </TooltipActions>
    </TooltipFooter>
  </TooltipOuter>
)

/* ── locale ── */
const LOCALE = {
  back: '← Atrás',
  close: 'Cerrar',
  last: 'Finalizar',
  next: 'Siguiente',
  open: 'Abrir',
  skip: 'Saltar',
}

/* ── main component ── */
const AdminTour = ({ currentSection }) => {
  const { running, activeSection, tourKey, startTour, stopTour } = useTour()
  const [showModal, setShowModal] = useState(false)
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bc_tour_completed') || '{}') } catch { return {} }
  })

  const rawSteps = activeSection ? (SECTION_TOURS[activeSection]?.steps ?? []) : []
  const steps = rawSteps.filter(step => {
    if (!step.target || step.target === 'body') return true
    try { return Boolean(document.querySelector(step.target)) } catch { return false }
  })

  const markCompleted = useCallback((section) => {
    setCompleted(prev => {
      const next = { ...prev, [section]: true }
      localStorage.setItem('bc_tour_completed', JSON.stringify(next))
      return next
    })
  }, [])

  const handleJoyrideCallback = useCallback((data) => {
    const { status } = data
    if (status === STATUS.FINISHED) {
      markCompleted(activeSection)
      stopTour()
    } else if (status === STATUS.SKIPPED) {
      stopTour()
    }
  }, [activeSection, markCompleted, stopTour])

  const handleOpen = () => setShowModal(true)

  const handleStart = (sectionId) => {
    setShowModal(false)
    setTimeout(() => startTour(sectionId), 120)
  }

  return (
    <>
      {/* floating button */}
      <FloatBtn onClick={handleOpen} aria-label="Abrir tutorial interactivo" title="">
        <SchoolOutlinedIcon />
        <FloatTooltip>Tutorial</FloatTooltip>
      </FloatBtn>

      {/* section selector modal */}
      {showModal && (
        <Overlay onClick={() => setShowModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHead>
              <HeadIcon><SchoolOutlinedIcon /></HeadIcon>
              <HeadText>
                <ModalTitle>Tutorial interactivo</ModalTitle>
                <ModalSub>Selecciona la sección que quieres aprender</ModalSub>
              </HeadText>
              <CloseBtn onClick={() => setShowModal(false)}><CloseIcon /></CloseBtn>
            </ModalHead>

            <ModalBody>
              {ALL_SECTIONS.map(({ id, label, description }, i) => {
                const stepCount = SECTION_TOURS[id]?.steps?.length ?? 0
                const isDone = completed[id]
                const isCurrent = currentSection === id || (currentSection === 'chat-activos' && id === 'chat') || (currentSection === 'chat-archivados' && id === 'chat')
                return (
                  <SectionBtn
                    key={id}
                    $i={i}
                    $active={isCurrent}
                    onClick={() => handleStart(id)}
                  >
                    <SectionInfo>
                      <SectionLabel>{label}</SectionLabel>
                      <SectionDesc>{description}</SectionDesc>
                    </SectionInfo>
                    <SectionMeta>
                      <StepsBadge>{stepCount} pasos</StepsBadge>
                      {isDone && (
                        <DoneBadge>
                          <CheckCircleOutlinedIcon />
                          Completado
                        </DoneBadge>
                      )}
                    </SectionMeta>
                    <PlayIcon><PlayArrowIcon /></PlayIcon>
                  </SectionBtn>
                )
              })}
            </ModalBody>

            <ModalFooter>
              Puedes repetir el tutorial cuantas veces quieras
            </ModalFooter>
          </Modal>
        </Overlay>
      )}

      {/* joyride tour engine — uncontrolled, tourKey forces remount on every new start */}
      <Joyride
        key={tourKey}
        steps={steps}
        run={running}
        continuous
        showSkipButton
        scrollToFirstStep
        disableOverlayClose={false}
        spotlightClicks={false}
        tooltipComponent={TourTooltip}
        floaterProps={{
          disableAnimation: false,
          styles: {
            floater: { maxWidth: 'calc(100vw - 32px)' },
          },
        }}
        locale={LOCALE}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            arrowColor: '#1c2845',
            overlayColor: 'rgba(0, 0, 0, 0.55)',
            spotlightShadow: '0 0 0 3px rgba(30, 133, 255, 0.55)',
            zIndex: 10000,
          },
          spotlight: {
            borderRadius: 10,
          },
          overlay: {
            mixBlendMode: 'normal',
          },
        }}
      />
    </>
  )
}

export default AdminTour
