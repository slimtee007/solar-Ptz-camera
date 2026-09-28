import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

import devicesRouter from './routes/devices.js';
import { db, seedMockDevices } from './db/index.js';
import { refreshAllStatuses, getAllDevices, getDeviceStatus } from './services/deviceManager.js';
import { getHlsDir } from './services/rtsp/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);
const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // default true

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Static HLS
const hlsDir = getHlsDir();
if (fs.existsSync(hlsDir)) {
  app.use('/hls', express.static(hlsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
    }
  }));
}

// Mock HLS placeholder - generate a fake m3u8 if in mock mode and file doesn't exist
app.get('/hls/:deviceId/index.m3u8', (req, res, next) => {
  const filePath = path.join(hlsDir, req.params.deviceId, 'index.m3u8');
  if (fs.existsSync(filePath)) return next();
  
  if (MOCK_MODE) {
    // Return a mock HLS that points to a demo video or empty
    // For demo, we just return a simple playlist that will fail gracefully and frontend will show placeholder
    // Alternatively return a redirect to a sample video
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    return res.send(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
# Mock - no real stream in demo mode
#EXT-X-ENDLIST
`);
  }
  next();
});

app.use('/api/devices', devicesRouter);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mockMode: MOCK_MODE,
    uptime: process.uptime(),
    devices: getAllDevices().length,
    hlsDir,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stats', (req, res) => {
  const devices = getAllDevices();
  const online = devices.filter(d => {
    const s = getDeviceStatus(d.id) as any;
    return s?.online;
  }).length;

  const totalStorage = db.prepare('SELECT SUM(storageUsed) as used, SUM(storageTotal) as total FROM device_status').get() as any;

  res.json({
    totalDevices: devices.length,
    onlineDevices: online,
    offlineDevices: devices.length - online,
    storageUsed: totalStorage.used || 0,
    storageTotal: totalStorage.total || 0,
    platforms: {
      ubox: devices.filter(d => d.platform === 'ubox').length,
      v380: devices.filter(d => d.platform === 'v380').length,
      rtsp: devices.filter(d => ['rtsp','onvif','generic'].includes(d.platform)).length
    }
  });
});

// Serve client in production
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/hls')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = createServer(app);

// WebSocket for realtime
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  ws.send(JSON.stringify({ type: 'welcome', mockMode: MOCK_MODE, timestamp: new Date().toISOString() }));

  const interval = setInterval(() => {
    const devices = getAllDevices().map(d => ({
      id: d.id,
      status: getDeviceStatus(d.id)
    }));
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'status_update', devices, timestamp: new Date().toISOString() }));
    }
  }, 5000);

  // Simulate motion events in mock mode
  let eventInterval: any;
  if (MOCK_MODE) {
    eventInterval = setInterval(() => {
      if (Math.random() > 0.7 && ws.readyState === 1) {
        const all = getAllDevices();
        const dev = all[Math.floor(Math.random() * all.length)];
        ws.send(JSON.stringify({
          type: 'new_event',
          event: {
            id: `evt_${Date.now()}`,
            deviceId: dev.id,
            deviceName: dev.name,
            type: ['motion','human','pir'][Math.floor(Math.random()*3)],
            timestamp: new Date().toISOString(),
            thumbnail: `https://picsum.photos/seed/${Date.now()}/320/180`
          }
        }));
      }
    }, 10000);
  }

  ws.on('close', () => {
    clearInterval(interval);
    if (eventInterval) clearInterval(eventInterval);
    console.log('[WS] Client disconnected');
  });
});

// Seed and refresh loop
if (MOCK_MODE) {
  seedMockDevices();
  console.log('[Server] MOCK_MODE enabled - using simulated cameras');
}

refreshAllStatuses();
setInterval(refreshAllStatuses, 30 * 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n☀️  Solar PTZ Central Server running`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
  console.log(`   WS:  ws://localhost:${PORT}/ws`);
  console.log(`   HLS: http://localhost:${PORT}/hls/:deviceId/index.m3u8`);
  console.log(`   Mock Mode: ${MOCK_MODE}`);
  console.log(`   Client: http://localhost:5173 (vite) or http://localhost:${PORT} if built\n`);
});
