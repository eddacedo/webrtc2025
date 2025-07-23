// server.js - Versión optimizada para 20 usuarios
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redis = require('redis');
const { OpusEncoder } = require('@discordjs/opus');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Configuración de Redis (usar Redis Cloud gratuito)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  tls: {}
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todos los orígenes
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Variables de estado
const activeSockets = new Set();
let currentSpeaker = null;
const audioProcessors = new Map();

// Inicializar encoder Opus
const encoder = new OpusEncoder(16000, 1);

// Endpoint de estado
app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    connections: activeSockets.size,
    currentSpeaker: currentSpeaker || 'none'
  });
});

io.on('connection', (socket) => {
  console.log(`✅ Usuario conectado: ${socket.id}`);
  activeSockets.add(socket.id);
  
  // Enviar ID al cliente
  socket.emit('yourId', socket.id);
  
  // Informar a otros sobre el nuevo usuario
  socket.broadcast.emit('newClient', socket.id);
  
  // Manejar PTT
  socket.on('requestPTT', () => {
    if (!currentSpeaker) {
      currentSpeaker = socket.id;
      io.emit('pttGranted', socket.id);
      
      // Auto-liberación después de 30 segundos
      setTimeout(() => {
        if (currentSpeaker === socket.id) {
          currentSpeaker = null;
          io.emit('pttReleased');
        }
      }, 30000);
    } else {
      socket.emit('pttDenied', 'Canal ocupado');
    }
  });
  
  socket.on('releasePTT', () => {
    if (currentSpeaker === socket.id) {
      currentSpeaker = null;
      io.emit('pttReleased');
    }
  });
  
  // Manejar audio comprimido
  socket.on('audioData', (data) => {
    if (currentSpeaker === socket.id) {
      // Transmitir a todos excepto al emisor
      socket.broadcast.emit('audioData', {
        speakerId: socket.id,
        audio: data.audio,
        timestamp: Date.now()
      });
    }
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log(`🔴 Usuario desconectado: ${socket.id}`);
    activeSockets.delete(socket.id);
    
    if (currentSpeaker === socket.id) {
      currentSpeaker = null;
      io.emit('pttReleased');
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  redisClient.connect().then(() => {
    console.log('✅ Conectado a Redis');
  });
});
