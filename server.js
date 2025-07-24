import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const port = process.env.PORT || 3000;

// Almacenamiento eficiente de conexiones
const rooms = new Map();
const userStates = new Map();

// Servir cliente web
app.use(express.static('public'));

wss.on('connection', (ws) => {
    ws.id = uuidv4();
    ws.roomId = 'comisaria-central';

    // Registro en sala
    if (!rooms.has(ws.roomId)) {
        rooms.set(ws.roomId, new Set());
    }
    rooms.get(ws.roomId).add(ws);
    
    // Notificar nueva conexión
    broadcastSystemMessage(`${ws.id.substring(0, 5)} conectado`, ws.roomId);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Manejo de audio
            if (message.type === 'audio' && userStates.get(ws.id) === 'transmitting') {
                broadcastAudio(ws.id, message.audio, ws.roomId);
            }
            
            // Control PTT
            if (message.type === 'ptt-state') {
                userStates.set(ws.id, message.state);
                if (message.state === 'transmitting') {
                    broadcastSystemMessage(`${ws.id.substring(0, 5)} transmitiendo`, ws.roomId);
                }
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    ws.on('close', () => {
        rooms.get(ws.roomId)?.delete(ws);
        userStates.delete(ws.id);
        broadcastSystemMessage(`${ws.id.substring(0, 5)} desconectado`, ws.roomId);
    });
});

function broadcastSystemMessage(text, roomId) {
    const message = JSON.stringify({
        type: 'system',
        text: text,
        timestamp: Date.now()
    });
    
    rooms.get(roomId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastAudio(userId, audioData, roomId) {
    const message = JSON.stringify({
        type: 'audio',
        userId: userId,
        audio: audioData,
        timestamp: Date.now()
    });
    
    rooms.get(roomId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.id !== userId) {
            client.send(message);
        }
    });
}

server.listen(port, () => {
    console.log(`Servidor activo en puerto ${port}`);
});
