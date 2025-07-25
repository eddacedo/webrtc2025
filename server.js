const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" } // Simplificado para pruebas, restringir en producción
});

let emisorSocketId = null;

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  socket.on('register-emisor', () => {
    console.log(`🎙️ Emisor registrado: ${socket.id}`);
    emisorSocketId = socket.id;
    socket.broadcast.emit('emisor-congelado');
    console.log('Notificando a receptores sobre nuevo emisor');
  });

  socket.on('register-receptor', () => {
    console.log(`🎧 Receptor registrado: ${socket.id}`);
    if (emisorSocketId) {
      console.log(`Notificando al emisor ${emisorSocketId} sobre nuevo receptor ${socket.id}`);
      io.to(emisorSocketId).emit('new-receptor', socket.id);
    } else {
      console.log('No hay emisor conectado para el receptor', socket.id);
    }
  });

  socket.on('offer', (payload) => {
    console.log(`📤 Oferta recibida de ${socket.id} para ${payload.target}:`, JSON.stringify(payload.offer, null, 2));
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    console.log(`📥 Respuesta recibida de ${socket.id} para ${payload.target}:`, JSON.stringify(payload.answer, null, 2));
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    console.log(`❄️ Candidato ICE recibido de ${socket.id} para ${payload.target}:`, JSON.stringify(payload.candidate, null, 2));
    io.to(payload.target).emit('ice-candidate', payload);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    if (socket.id === emisorSocketId) {
      emisorSocketId = null;
      console.log('El emisor se ha desconectado. Notificando a receptores.');
      socket.broadcast.emit('emisor-congelado');
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor de señalización WebRTC activo en puerto ${PORT}`);
});
