// server.js - NUEVA VERSIÓN
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" } // Simplificado para pruebas, puedes ajustarlo
});

let emisorSocketId = null; // Almacenaremos el ID del emisor aquí

io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);

  // 1. Un dispositivo se identifica como el EMISOR (la comisaría)
  socket.on('register-emisor', () => {
    console.log(`🎙️ Emisor registrado: ${socket.id}`);
    emisorSocketId = socket.id;
    // Notificar a todos los receptores que hay un nuevo emisor
    socket.broadcast.emit('emisor-congelado');
  });
  
  // 2. Un dispositivo se identifica como RECEPTOR (un efectivo)
  socket.on('register-receptor', () => {
    console.log(`🎧 Receptor registrado: ${socket.id}`);
    // Si ya hay un emisor, le decimos al nuevo receptor que inicie la conexión
    if (emisorSocketId) {
      io.to(emisorSocketId).emit('new-receptor', socket.id);
    }
  });

  // 3. El emisor envía una "oferta" a un receptor específico
  socket.on('offer', (payload) => {
    console.log(`Enviando oferta de ${socket.id} a ${payload.target}`);
    io.to(payload.target).emit('offer', payload);
  });

  // 4. El receptor envía una "respuesta" al emisor
  socket.on('answer', (payload) => {
    console.log(`Enviando respuesta de ${socket.id} a ${payload.target}`);
    io.to(payload.target).emit('answer', payload);
  });

  // 5. Se intercambian "candidatos ICE" para encontrar la ruta directa
  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', payload);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    if (socket.id === emisorSocketId) {
      emisorSocketId = null;
      console.log("El emisor se ha desconectado.");
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor de señalización WebRTC activo en puerto ${PORT}`);
});

