const express = require('express');
const cors = require('cors');
const { AccessToken, RoomServiceClient } = require('@livekit/server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LIVEKIT_URL = process.env.walki-3icqhz3t.livekit.cloud; // ejemplo: 'https://your.livekit.instance'
const API_KEY = process.env.APIHpK7LNhRszcL;
const API_SECRET = process.env.VLEYlX8rWQ8m3WS4SPOkLaobbp6fVlbReB8fzf5g0vfG;

// Seguridad mínima: verifica una API_KEY_APP propia si quieres.
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''; // opcional, para proteger endpoint

if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
  console.error('Faltan variables de entorno LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET');
  process.exit(1);
}

// Endpoint para generar token (para un nombre de usuario y room)
app.post('/token', (req, res) => {
  // opcional: comprueba ADMIN_SECRET en header para que no cualquiera pida tokens
  if (ADMIN_SECRET) {
    const h = req.headers['x-admin-secret'] || '';
    if (h !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { identity, room } = req.body || {};
  if (!identity || !room) return res.status(400).json({ error: 'identity and room required' });

  // Crea token LiveKit
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: identity,
  });
  // permisos: join + publish
  at.addGrant({ roomJoin: true });
  at.addGrant({ room: room });

  const token = at.toJwt();
  res.json({ token, url: LIVEKIT_URL });
});

app.get('/', (req, res) => res.send('LiveKit token server'));

app.listen(PORT, () => {
  console.log(`Token server on port ${PORT}`);
});
