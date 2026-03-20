import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

let nextId = 1;
const photos = [];

app.get('/api/photos', (_req, res) => {
  res.json(photos);
});

app.post('/api/photos', (req, res) => {
  const { clientId, createdAt, width, height, type, location, dataUrl } = req.body || {};
  if (!dataUrl || !createdAt) {
    res.status(400).json({ error: 'Missing photo payload.' });
    return;
  }

  const record = {
    id: nextId++,
    clientId: clientId ?? null,
    createdAt,
    width: width ?? null,
    height: height ?? null,
    type: type ?? 'image/png',
    location: location ?? null,
    dataUrl
  };
  photos.push(record);
  broadcast({ type: 'photo-added', photo: record });
  res.json({ id: record.id });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Photo sync server listening on http://localhost:${PORT}`);
});
