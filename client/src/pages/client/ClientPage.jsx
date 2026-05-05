import ChatBubble from '../../components/chat/ChatBubble'

const ClientPage = () => {
  return (
    <div className="client-page" style={{background: "#000"}}>
      <iframe
        className="slots-iframe"
        src="about:blank"
        title="Slot Games"
        allowFullScreen
      />
      <ChatBubble />
    </div>
  )
}

export default ClientPage
