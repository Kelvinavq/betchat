# BetChat Backend

Backend de BetChat construido con Node.js, Express y MySQL.

## 📋 Requisitos

- Node.js 18+
- MySQL 8.0+
- npm o yarn

## 🚀 Instalación

### 1. Variables de Entorno

El archivo `.env` ya está creado. Configura tus variables:

```bash
# Modo de ejecución
MODE=development  # o 'production'

# Base de datos - Desarrollo
DB_HOST_DEV=localhost
DB_PORT_DEV=3306
DB_NAME_DEV=betchat_dev
DB_USER_DEV=root
DB_PASSWORD_DEV=

# Base de datos - Producción
DB_HOST_PROD=your-prod-db-host.com
DB_USER_PROD=your_db_user
DB_PASSWORD_PROD=your_secure_password

# Puerto del servidor
PORT=5000

# CORS - Múltiples orígenes permitidos (sin espacios)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h
```

### 2. Crear la Base de Datos

```bash
mysql -u root -p < ../database/schema.sql
```

### 3. Instalar Dependencias

```bash
npm install
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo con nodemon (auto-reload)
npm run dev

# Producción
npm start

# Testing (próximamente)
npm test
```

## 📁 Estructura del Proyecto

```
server/
├── app.js                 # Entrada principal, configuración Express
├── config/
│   ├── config.js         # Configuración centralizada
│   └── database.js       # Conexión a BD con reintentos
├── controllers/          # Lógica de negocio (próximamente)
├── routes/               # Rutas de la API (próximamente)
├── middlewares/          # Middlewares personalizados (próximamente)
├── utils/                # Funciones utilitarias (próximamente)
├── .env                  # Variables de entorno
├── package.json
└── nodemon.json         # Configuración de nodemon
```

## 🔌 Conexión a BD - Características

✅ **Pool de conexiones** con configuración flexible
✅ **Reintentos automáticos** (5 intentos con delay de 3s)
✅ **Keep-alive** para conexiones de larga duración
✅ **Transacciones** para operaciones múltiples
✅ **Manejo robusto de errores**

### Ejemplo de uso:

```javascript
import { query, transaction } from './config/database.js';

// Query simple
const { rows, error } = await query('SELECT * FROM users WHERE id = ?', [1]);

// Transacción
await transaction(async (connection) => {
  const [result1] = await connection.execute('INSERT INTO users ...');
  const [result2] = await connection.execute('UPDATE ...');
  // Commit automático si todo va bien
  // Rollback automático si hay error
});
```

## 🔐 CORS - Configuración

El CORS está configurado para permitir múltiples orígenes desde `.env`:

```javascript
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

Características:
- ✅ Múltiples orígenes soportados
- ✅ Credenciales habilitadas (cookies, autenticación)
- ✅ Métodos: GET, POST, PUT, DELETE, PATCH, OPTIONS
- ✅ Headers: Content-Type, Authorization
- ✅ Cache de 24 horas

## 🎯 Endpoints Básicos

### Health Checks

```bash
# Health check simple
GET /health

# Health check API
GET /api/health
```

## 🔌 Socket.IO

El servidor incluye Socket.IO para comunicación en tiempo real:

```javascript
import { io } from './app.js';

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});
```

## ⚙️ Configuración por Modo

### Desarrollo (`MODE=development`)
- Base de datos: `betchat_dev` (local)
- Logging detallado
- Nodemon con auto-reload

### Producción (`MODE=production`)
- Base de datos: `betchat_prod` (servidor remoto)
- Validaciones estrictas
- Errores ocultados en respuestas

Cambiar entre modos:

```bash
# En .env
MODE=development  # para desarrollo
MODE=production   # para producción
```

## 🚨 Manejo de Errores

El servidor incluye:
- Validación de configuración al iniciar
- Middleware de error global
- Respuestas JSON coherentes
- Logging de requests

## 🛑 Apagado Graceful

El servidor maneja:
- `SIGTERM` y `SIGINT` (Ctrl+C)
- Cierre de Socket.IO
- Liberación del pool de BD
- Timeout de seguridad (10s)

## 📊 Logging

Las salidas en consola incluyen:
- Conexión a BD (con reintentos)
- Requests HTTP
- Eventos de Socket.IO
- Errores con contexto

## 🔐 Seguridad

- ✅ CORS configurado
- ✅ Body limit (50MB)
- ✅ JWT ready (en middlewares)
- ✅ Bcrypt ready (para passwords)
- ✅ Variables sensibles en .env

## 🚧 Próximos Pasos

- [ ] Crear controladoras
- [ ] Crear rutas (auth, users, chats, etc.)
- [ ] Implementar middlewares de auth
- [ ] Agregar validaciones
- [ ] Tests unitarios
- [ ] Documentación API (Swagger)

## 📝 Notas

- El `.env` es local, nunca se subirá a git
- MySQL 8.0+ con charset utf8mb4
- Node.js Modules (ES6 imports)
- Pool de conexiones optimizado para bots de chat
