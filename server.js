const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://www.pulsadorauxiliorapidopnp.com.pe",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  },
  allowEIO3: true // Para compatibilidad
});

// También configurar CORS para Express (por si acaso)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.pulsadorauxiliorapidopnp.com.pe');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  socket.on('audio', (data) => {
    console.log('🎵 Audio recibido, tamaño:', data?.length);
    socket.broadcast.emit('audio', data);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});

