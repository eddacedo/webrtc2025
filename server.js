const express = require('express');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Configuración robusta de Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL, // Usa la variable de entorno
  socket: {
    tls: true, // Habilita TLS
    rejectUnauthorized: false, // Necesario para Redis Cloud
    connectTimeout: 10000, // 10 segundos de timeout
    reconnectStrategy: (retries) => {
      console.log(`Reintentando conexión (intento ${retries})`);
      return Math.min(retries * 200, 5000); // Espera hasta 5 segundos
    }
  }
});

// 2. Manejo de eventos
redisClient.on('connect', () => console.log('✅ Conectado a Redis Cloud'));
redisClient.on('error', (err) => console.error('Redis error:', err.message));
redisClient.on('ready', () => console.log('⚡ Redis listo'));

// 3. Conectar al iniciar
(async () => {
  try {
    await redisClient.connect();
    await redisClient.ping(); // Test de conexión
    console.log('🔑 Autenticación exitosa en Redis');
  } catch (err) {
    console.error('❌ Error conectando a Redis:', err.message);
  }
})();

// 4. Endpoint de prueba
app.get('/health', async (req, res) => {
  try {
    const ping = await redisClient.ping();
    res.json({
      status: 'OK',
      redis: ping === 'PONG' ? 'connected' : 'error'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
