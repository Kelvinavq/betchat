import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Página no encontrada</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  )
}

export default NotFoundPage
