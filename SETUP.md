# 🚀 Setup del Backend BetChat

## ✅ Lo que hemos configurado

### 1. **Archivos Creados**

```
server/
├── .env                  # Variables de entorno (dev/prod)
├── .gitignore           # Ignora archivos sensibles
├── app.js               # Servidor Express + Socket.io
├── package.json         # Dependencias actualizadas
├── nodemon.json         # Config de auto-reload
├── README.md            # Documentación del proyecto
├── setup-db.ps1         # Script para crear BD (Windows)
├── setup-db.sh          # Script para crear BD (Linux/Mac)
└── config/
    ├── config.js        # Configuración centralizada
    └── database.js      # Pool de conexiones con reintentos
```

### 2. **Dependencias Instaladas**

```json
{
  "express": "5.2.1",           // Framework web
  "cors": "2.8.6",              // Control de CORS
  "dotenv": "17.4.2",           // Variables de entorno
  "socket.io": "4.8.3",         // Comunicación en tiempo real
  "mysql2": "3.11.3",           // Driver MySQL
  "bcryptjs": "2.4.3",          // Hash de contraseñas
  "jsonwebtoken": "9.0.2",      // JWT para autenticación
  "nodemon": "3.1.14"           // Auto-reload en desarrollo
}
```

### 3. **Características Implementadas**

✅ **Conexión a BD Robusta**
- Pool de conexiones MySQL
- Reintentos automáticos (5 intentos, 3s de delay)
- Keep-alive para conexiones de larga duración
- Transacciones con rollback automático

✅ **CORS Flexible**
- Múltiples orígenes desde `.env`
- Credenciales habilitadas
- Headers: Content-Type, Authorization

✅ **Configuración Dinámica**
- Modo `development` vs `production`
- BD separada por entorno
- Variables de entorno validadas al iniciar

✅ **Servidor Express**
- Middlewares globales
- Manejo de errores centralizado
- Health checks (`/health`, `/api/health`)
- Socket.IO integrado

✅ **Desarrollo Ágil**
- Nodemon con auto-reload
- Configuración centralizada
- Logging de requests
- Graceful shutdown

---

## 📋 Próximos Pasos

### **Paso 1: Crear la Base de Datos**

**Windows (PowerShell):**
```powershell
cd C:\laragon\www\betchat\server
.\setup-db.ps1
```

**Linux/Mac (Bash):**
```bash
cd /path/to/betchat/server
bash setup-db.sh
```

**Manual (cualquier SO):**
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS betchat_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root betchat_dev < ../database/schema.sql
```

### **Paso 2: Iniciar el Servidor**

```bash
cd server
npm run dev
```

Deberías ver:
```
╔════════════════════════════════════════╗
║   🎯 BetChat Backend iniciado         ║
║   📡 Servidor: http://localhost:5000   ║
║   🔌 Modo: DEVELOPMENT                ║
║   🗄️  BD: betchat_dev                 ║
╚════════════════════════════════════════╝
```

### **Paso 3: Verificar la Conexión**

```bash
curl http://localhost:5000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-05-06T02:55:00.000Z",
  "mode": "development",
  "database": {
    "host": "localhost",
    "database": "betchat_dev"
  }
}
```

---

## 🔧 Configuración de Variables de Entorno

### `.env` - Estructura

```env
# Modo (development/production)
MODE=development

# BD - Desarrollo
DB_HOST_DEV=localhost
DB_PORT_DEV=3306
DB_NAME_DEV=betchat_dev
DB_USER_DEV=root
DB_PASSWORD_DEV=

# BD - Producción
DB_HOST_PROD=your-prod-db-host.com
DB_PORT_PROD=3306
DB_NAME_PROD=betchat_prod
DB_USER_PROD=your_db_user
DB_PASSWORD_PROD=your_secure_password

# CORS - Múltiples orígenes (sin espacios)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

# Puerto del servidor
PORT=5000
```

### **Cambiar entre Desarrollo y Producción**

```env
# Desarrollo
MODE=development
NODE_ENV=development

# Producción
MODE=production
NODE_ENV=production
```

El servidor automáticamente cargará:
- `betchat_dev` → desarrollo
- `betchat_prod` → producción

---

## 🎯 Scripts Disponibles

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start

# (Próximamente) Tests
npm test
```

---

## 📊 Estructura de la Conexión a BD

### Ejemplo: Query Simple
```javascript
import { query } from './config/database.js';

const { rows, error } = await query(
  'SELECT * FROM users WHERE id = ?',
  [1]
);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Usuarios:', rows);
}
```

### Ejemplo: Transacción
```javascript
import { transaction } from './config/database.js';

await transaction(async (connection) => {
  // Ambas queries se ejecutan juntas
  await connection.execute('INSERT INTO users ...');
  await connection.execute('UPDATE chats ...');
  
  // Si hay error, todo se revierte automáticamente
});
```

---

## 🔐 Seguridad

✅ Variables sensibles en `.env` (no versionadas)
✅ CORS configurado
✅ Body limit (50MB)
✅ JWT ready
✅ Bcrypt ready
✅ Graceful shutdown
✅ Validación de configuración

---

## 🆘 Troubleshooting

### Error: "Unknown database 'betchat_dev'"
**Solución:** Ejecuta `setup-db.ps1` (Windows) o `setup-db.sh` (Linux/Mac)

### Error: "connect ECONNREFUSED"
**Solución:** Verifica que MySQL esté corriendo. En Laragon, abre Laragon y inicia MySQL.

### Error: "Port 5000 already in use"
**Solución:** Cambia el puerto en `.env`:
```env
PORT=5001
```

### Reintentos de BD infinitos
**Nota:** Es normal en desarrollo si MySQL no está disponible. El servidor seguirá intentando conectarse cada 3 segundos.

---

## 📝 Notas Finales

- El `.env` no se subirá a git (`.gitignore`)
- Nodemon vigila cambios automáticamente
- Socket.IO está listo para eventos de chat
- Graceful shutdown con Ctrl+C
- Logging completo de requests y errores

---

## 🚀 Próximas Fases

1. **Rutas y Controladores** - Auth, Users, Chats, etc.
2. **Middlewares** - Autenticación JWT, validación
3. **Socket.IO Events** - Mensajes en tiempo real
4. **Validaciones** - Schemas y reglas de negocio
5. **Tests** - Unitarios e integración
6. **Documentación API** - Swagger/OpenAPI

¡Listo para empezar! 🎉
