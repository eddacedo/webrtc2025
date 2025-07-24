// server.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Servir cliente web
app.use(express.static('public'));
const server = app.listen(PORT, () => 
  console.log(`Server running on https://www.pulsadorauxiliorapidopnp.com.pe:${PORT}`));

// Configuración WebSocket
const wss = new WebSocket.Server({ server });
const rooms = new Map();

wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.roomId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'join') {
        // Unirse a sala
        ws.roomId = message.room;
        if (!rooms.has(ws.roomId)) {
          rooms.set(ws.roomId, new Set());
        }
        rooms.get(ws.roomId).add(ws.id);
        
        // Notificar a otros
        broadcast(ws.roomId, {
          type: 'system',
          user: 'Server',
          text: `Usuario ${ws.id.substring(0, 5)} se unió`
        }, ws);
      }
      
      if (message.type === 'audio' && ws.roomId) {
        // Retransmitir audio a todos en la sala (excepto emisor)
        broadcast(ws.roomId, {
          type: 'audio',
          userId: ws.id,
          audio: message.audio,
          timestamp: Date.now()
        }, ws);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws.id);
      broadcast(ws.roomId, {
        type: 'system',
        user: 'Server',
        text: `Usuario ${ws.id.substring(0, 5)} salió`
      });
    }
  });
});

function broadcast(roomId, message, excludeWs = null) {
  if (!rooms.has(roomId)) return;
  
  rooms.get(roomId).forEach(clientId => {
    wss.clients.forEach(client => {
      if (client.id === clientId && client.readyState === WebSocket.OPEN && client !== excludeWs) {
        client.send(JSON.stringify(message));
      }
    });
  });
}
