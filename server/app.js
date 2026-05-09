import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Importar configuración y BD
import { config, validateConfig, getCorsOrigins } from './config/config.js';
import { initializePool, closePool } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commandRoutes from './routes/commandRoutes.js';
import modalRoutes from './routes/modalRoutes.js';
import bankAccountRoutes from './routes/bankAccountRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import clientsRoutes from './routes/clientsRoutes.js';
import clientAuthRoutes from './routes/clientAuthRoutes.js';
import botBuilderRoutes from './routes/botBuilderRoutes.js';
import clientBotRoutes from './routes/clientBotRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import clientChatRoutes from './routes/clientChatRoutes.js';
import autoMessagesRoutes from './routes/autoMessagesRoutes.js';
import { setupChatSockets } from './socket/chatSocket.js';

// Variables globales
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  maxHttpBufferSize: 16 * 1024 * 1024,
  cors: {
    origin: getCorsOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ============================================================
//  MIDDLEWARES GLOBALES
// ============================================================

// Seguridad HTTP y CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.disable('x-powered-by');
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (normalizedPath.includes('/audios/') && normalizedPath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    }
  },
}));

// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/client/auth', clientAuthRoutes);
app.use('/api/client/bot', clientBotRoutes);
app.use('/api/client/chats', clientChatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/modals', modalRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/bot-builder', botBuilderRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/settings/auto-messages', autoMessagesRoutes);

// Middleware para logging de requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
//  RUTAS DE SALUD
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: config.mode,
    database: {
      host: config.db.host,
      database: config.db.database,
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'alive',
    server: 'BetChat API',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
//  SOCKET.IO EVENTOS BÁSICOS
// ============================================================

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Error en socket ${socket.id}:`, error);
  });
});

// ============================================================
//  MANEJO DE ERRORES GLOBAL
// ============================================================

app.use((err, req, res, next) => {
  const status = Number(err.status || err.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (safeStatus >= 500) console.error('Error no manejado:', err);
  else console.warn('Error controlado:', err.message);

  const publicMessage = safeStatus < 500
    ? err.message
    : (err.expose ? err.message : 'Error interno del servidor');

  res.status(safeStatus).json({
    error: publicMessage,
    message: config.isProduction && safeStatus >= 500 ? 'Error' : err.message,
    code: err.code,
    requestId: req.id,
  });
});

setupChatSockets(io);

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
  });
});

// ============================================================
//  INICIALIZACIÓN
// ============================================================

async function startServer() {
  try {
    // Validar configuración
    validateConfig();

    // Conectar a BD
    await initializePool();

    // Iniciar servidor
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🎯 BetChat Backend iniciado         ║
║   📡 Servidor: http://localhost:${PORT}   ║
║   🔌 Modo: ${config.mode.toUpperCase()}              ║
║   🗄️  BD: ${config.db.database}${' '.repeat(20 - config.db.database.length)} ║
╚════════════════════════════════════════╝
      `);
    });

    // Manejo de señales para cierre graceful
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('✗ Error al iniciar servidor:', error.message);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('\n⏹️  Apagando servidor gracefully...');
  
  try {
    // Cerrar Socket.IO
    io.close();
    
    // Cerrar pool de BD
    await closePool();
    
    // Cerrar servidor HTTP
    httpServer.close(() => {
      console.log('✓ Servidor cerrado correctamente');
      process.exit(0);
    });

    // Timeout de seguridad
    setTimeout(() => {
      console.error('✗ Timeout de cierre, forzando salida');
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('✗ Error durante shutdown:', error);
    process.exit(1);
  }
}

// Inicia el servidor
startServer();

export { app, httpServer, io };
