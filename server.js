// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://www.pulsadorauxiliorapidopnp.com.pe/walkipolicial/", // Cambia esto a tu dominio en producción
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');

  socket.on('audio', (data) => {
    socket.broadcast.emit('audio', data);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Servidor WebSocket activo en puerto ${PORT}`);
});

