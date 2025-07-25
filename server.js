// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://www.pulsadorauxiliorapidopnp.com.pe",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('✅ Cliente conectado con ID:', socket.id);
  console.log('📊 Total de clientes conectados:', io.engine.clientsCount);
  
  socket.on('audio', (data) => {
    console.log('🎵 Audio recibido de', socket.id, '- Tamaño:', data?.length || 'undefined');
    console.log('📤 Retransmitiendo a otros clientes...');
    
    // Ver cuántos clientes van a recibir el audio
    const otherClientsCount = socket.broadcast.emit('audio', data);
    console.log('📨 Audio enviado a', io.engine.clientsCount - 1, 'otros clientes');
  });
  
  socket.on('test', (data) => {
    console.log('🧪 Test recibido de', socket.id, ':', data);
    socket.broadcast.emit('test', data);
    console.log('🧪 Test retransmitido');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    console.log('📊 Clientes restantes:', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});


