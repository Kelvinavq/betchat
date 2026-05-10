import { useEffect, useRef, useState } from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CloseIcon from '@mui/icons-material/Close'
import {
  Banner, BannerBell, BannerText, BannerTitle, BannerSub, BannerActivate, BannerDismiss,
  Overlay, Card, DragHandle, CloseBtn,
  BellWrap, ModalTitle, ModalSub,
  BenefitsList, BenefitItem, BenefitEmoji, BenefitText,
  ActivateBtn, SkipBtn, Note,
  SuccessWrap, SuccessEmoji, SuccessText, SuccessSub,
} from './PushPrompt.styles'

const DISMISSED_KEY = 'push_prompt_dismissed'

const BENEFITS = [
  { emoji: '🎁', text: 'Bonos exclusivos' },
  { emoji: '💰', text: 'Ofertas de recarga' },
  { emoji: '🏆', text: 'Resultados al instante' },
  { emoji: '🎉', text: 'Sorteos y regalos' },
  { emoji: '⚡', text: 'Alertas de tu cuenta' },
  { emoji: '🎰', text: 'Novedades del casino' },
]

export default function PushPrompt({ clientId, onActivate }) {
  const [visible, setVisible]     = useState(false)
  const [hiding, setHiding]       = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const activateRef               = useRef(false)

  useEffect(() => {
    if (!clientId) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const t = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(t)
  }, [clientId])

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const hideBanner = (dismiss = false) => {
    setHiding(true)
    if (dismiss) localStorage.setItem(DISMISSED_KEY, '1')
    setTimeout(() => { setVisible(false); setHiding(false) }, 400)
  }

  const handleDismiss = (e) => {
    e?.stopPropagation()
    hideBanner(true)
    setModalOpen(false)
  }

  const openModal = (e) => {
    e?.stopPropagation()
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handleActivate = async () => {
    if (activateRef.current) return
    activateRef.current = true
    setLoading(true)
    try {
      const granted = await onActivate()
      if (granted) {
        setSuccess(true)
        setTimeout(() => {
          closeModal()
          hideBanner(true)
        }, 1800)
      } else {
        handleDismiss()
      }
    } catch {
      handleDismiss()
    } finally {
      setLoading(false)
      activateRef.current = false
    }
  }

  if (!visible) return null

  return (
    <>
      {/* ── bottom banner ── */}
      <Banner $hiding={hiding}>
        <BannerBell>
          <NotificationsIcon style={{ fontSize: 18 }} />
        </BannerBell>

        <BannerText>
          <BannerTitle>¡No te pierdas bonos y regalos!</BannerTitle>
          <BannerSub>Activa las notificaciones push gratuitas</BannerSub>
        </BannerText>

        <BannerActivate type="button" onClick={openModal}>
          Activar
        </BannerActivate>

        <BannerDismiss type="button" onClick={handleDismiss} aria-label="Cerrar">
          <CloseIcon style={{ fontSize: 14 }} />
        </BannerDismiss>
      </Banner>

      {/* ── modal ── */}
      {modalOpen && (
        <Overlay onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <Card>
            <DragHandle />

            <CloseBtn type="button" onClick={closeModal} aria-label="Cerrar">
              <CloseIcon style={{ fontSize: 15 }} />
            </CloseBtn>

            {success ? (
              <SuccessWrap>
                <SuccessEmoji>🎉</SuccessEmoji>
                <SuccessText>¡Notificaciones activadas!</SuccessText>
                <SuccessSub>Estás suscrito a bonos y promociones exclusivas</SuccessSub>
              </SuccessWrap>
            ) : (
              <>
                <BellWrap>
                  <NotificationsIcon style={{ fontSize: 34 }} />
                </BellWrap>

                <ModalTitle>¡No te pierdas nada!</ModalTitle>
                <ModalSub>
                  Activa las notificaciones y entérate antes que nadie de todo lo que tenemos para vos:
                </ModalSub>

                <BenefitsList>
                  {BENEFITS.map(b => (
                    <BenefitItem key={b.emoji}>
                      <BenefitEmoji>{b.emoji}</BenefitEmoji>
                      <BenefitText>{b.text}</BenefitText>
                    </BenefitItem>
                  ))}
                </BenefitsList>

                <ActivateBtn type="button" onClick={handleActivate} disabled={loading}>
                  <NotificationsIcon style={{ fontSize: 18 }} />
                  {loading ? 'Activando...' : 'Activar notificaciones'}
                </ActivateBtn>

                <SkipBtn type="button" onClick={handleDismiss}>
                  Ahora no
                </SkipBtn>

                <Note>Podés desactivarlas cuando quieras desde tu navegador</Note>
              </>
            )}
          </Card>
        </Overlay>
      )}
    </>
  )
}
