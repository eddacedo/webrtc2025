require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redis = require('redis');

// Configuración de Express
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    redis: client.isOpen ? 'connected' : 'disconnected'
  });
});

// Crear servidor HTTP
const server = http.createServer(app);

// Configuración de Socket.IO optimizada para móviles
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 120000
  }
});

// Conexión a Redis (configuración completa)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    tls: true,
    rejectUnauthorized: false,
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 200, 5000)
  }
});

// Manejo de eventos Redis
redisClient.on('connect', () => console.log('✅ Conectado a Redis'));
redisClient.on('error', (err) => console.error('Redis error:', err));

// Conectar a Redis al iniciar
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Error conectando a Redis:', err);
  }
})();

// Estado del canal PTT
let currentSpeaker = null;
const activeSockets = new Set();

// Lógica principal de Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Nuevo usuario conectado: ${socket.id}`);
  activeSockets.add(socket.id);

  // Registrar conexión en Redis
  redisClient.hSet('active_sockets', socket.id, new Date().toISOString());

  // Enviar ID al cliente
  socket.emit('your_id', socket.id);

  // Manejar PTT
  socket.on('ptt_start', async () => {
    if (!currentSpeaker) {
      currentSpeaker = socket.id;
      await redisClient.set('current_speaker', socket.id);
      socket.emit('ptt_granted');
      socket.broadcast.emit('speaker_changed', socket.id);
    } else {
      socket.emit('ptt_denied');
    }
  });

  socket.on('ptt_end', async () => {
    if (currentSpeaker === socket.id) {
      currentSpeaker = null;
      await redisClient.del('current_speaker');
      socket.broadcast.emit('speaker_changed', null);
    }
  });

  // Señalización WebRTC
  socket.on('webrtc_offer', (data) => {
    socket.to(data.to).emit('webrtc_offer', {
      from: socket.id,
      sdp: data.sdp
    });
  });

  socket.on('webrtc_answer', (data) => {
    socket.to(data.to).emit('webrtc_answer', {
      from: socket.id,
      sdp: data.sdp
    });
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.to).emit('ice_candidate', data.candidate);
  });

  // Desconexión
  socket.on('disconnect', async () => {
    console.log(`⚠️ Usuario desconectado: ${socket.id}`);
    activeSockets.delete(socket.id);
    await redisClient.hDel('active_sockets', socket.id);
    
    if (currentSpeaker === socket.id) {
      currentSpeaker = null;
      await redisClient.del('current_speaker');
      io.emit('speaker_changed', null);
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
