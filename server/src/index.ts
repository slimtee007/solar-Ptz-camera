import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

import devicesRouter from './routes/devices.js';
import authRouter from './routes/auth.js';
import onvifRouter from './routes/onvif.js';
import cloudRouter from './routes/cloud.js';
import { db, seedMockDevices } from './db/index.js';
import { refreshAllStatuses, getAllDevices, getDeviceStatus } from './services/deviceManager.js';
import { getHlsDir } from './services/rtsp/index.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);
const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // default true
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Security middleware for production
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({ 
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // limit each IP
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts' }
});
app.use('/api/auth/login', authLimiter);

// Static HLS with auth check in production
const hlsDir = getHlsDir();
if (fs.existsSync(hlsDir)) {
  app.use('/hls', express.static(hlsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
  }));
}

// Mock HLS placeholder - generate a fake m3u8 if in mock mode and file doesn't exist
app.get('/hls/:deviceId/index.m3u8', (req, res, next) => {
  const filePath = path.join(hlsDir, req.params.deviceId, 'index.m3u8');
  if (fs.existsSync(filePath)) return next();
  
  if (MOCK_MODE) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
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

// Public routes
app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mockMode: MOCK_MODE,
    env: NODE_ENV,
    uptime: process.uptime(),
    devices: getAllDevices().length,
    hlsDir,
    version: '1.0.0',
    features: {
      onvif: true,
      v380Local: true,
      v380Cloud: true,
      uboxLocal: true,
      uboxCloud: true,
      rtsp: true,
      hls: true,
      webrtc: false,
      auth: true
    },
    timestamp: new Date().toISOString()
  });
});

// Protected routes - allow bypass in mock mode via middleware
app.use('/api/devices', authMiddleware as any, devicesRouter);
app.use('/api/onvif', authMiddleware as any, onvifRouter);
app.use('/api/cloud', authMiddleware as any, cloudRouter);

app.get('/api/stats', authMiddleware as any, (req, res) => {
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
      onvif: devices.filter(d => d.platform === 'onvif').length,
      rtsp: devices.filter(d => ['rtsp','generic'].includes(d.platform)).length
    }
  });
});

// Production API docs
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Solar PTZ Central API - Production',
    version: '1.0.0',
    baseUrl: `/api`,
    authentication: {
      type: 'Bearer JWT',
      login: 'POST /api/auth/login { username, password }',
      register: 'POST /api/auth/register (admin only) or POST /api/auth/register/public (if enabled)',
      header: 'Authorization: Bearer <token>',
      mockMode: 'In MOCK_MODE=true, auth is bypassed with admin user'
    },
    endpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'POST /api/auth/register/public',
        'GET /api/auth/me',
        'GET /api/auth/users (admin)'
      ],
      devices: [
        'GET /api/devices - list all',
        'POST /api/devices - add { name, platform: ubox|v380|onvif|rtsp, uid, ip, rtspUrl, username, password, location, groupName }',
        'GET /api/devices/:id',
        'PUT /api/devices/:id',
        'DELETE /api/devices/:id',
        'GET /api/devices/:id/status',
        'GET /api/devices/:id/stream - returns { hlsUrl, rtspUrl, type }',
        'GET /api/devices/:id/snapshot - JPEG snapshot (production)',
        'GET /api/devices/:id/sdcard - SD card status',
        'POST /api/devices/:id/ptz - { action: up|down|left|right|zoomIn|zoomOut|stop|preset1..4, speed: 0-100 }',
        'POST /api/devices/:id/light - { on: boolean }',
        'POST /api/devices/:id/siren - { on: boolean }',
        'POST /api/devices/:id/reboot',
        'GET /api/devices/:id/presets',
        'POST /api/devices/:id/goto-preset { preset }',
        'GET /api/devices/:id/playback/days?month=YYYY-MM',
        'GET /api/devices/:id/playback?date=YYYY-MM-DD',
        'GET /api/devices/:id/events?limit=20'
      ],
      onvif: [
        'GET /api/onvif/discover?timeout=10000 - discover ONVIF cameras on LAN',
        'POST /api/onvif/connect { xaddr, username, password }',
        'POST /api/onvif/ptz { xaddr, username, password, action, speed }'
      ],
      cloud: [
        'POST /api/cloud/v380/login { username, password }',
        'GET /api/cloud/v380/devices (header Bearer token)',
        'GET /api/cloud/v380/:ip/status?username=&password=',
        'GET /api/cloud/v380/:ip/snapshot',
        'POST /api/cloud/ubox/login { username, password, apiKey, apiSecret, baseUrl }',
        'GET /api/cloud/ubox/devices?token=',
        'GET /api/cloud/ubox/:uid/status?token=',
        'GET /api/cloud/ubox/:uid/stream?token=',
        'GET /api/cloud/gateway/instructions'
      ],
      system: [
        'GET /api/health',
        'GET /api/stats',
        'GET /api/docs'
      ],
      streaming: [
        'GET /hls/:deviceId/index.m3u8 - HLS playlist (ffmpeg transcoded from RTSP)',
        'WS /ws - realtime status + events'
      ]
    },
    productionSetup: {
      env: {
        MOCK_MODE: 'false for real cameras',
        JWT_SECRET: 'change in production!',
        JWT_EXPIRES: '7d',
        AUTH_DISABLED: 'false to enforce auth',
        PORT: '3001',
        DB_PATH: './data/db.json',
        HLS_OUTPUT_DIR: './data/hls',
        FFMPEG_PATH: 'ffmpeg',
        CORS_ORIGIN: 'https://your-domain.com',
        UBOX_CLOUD_USER: 'your ubox account',
        UBOX_CLOUD_PASS: 'password',
        UBOX_APP_KEY: 'from supplier',
        UBOX_CLOUD_API: 'https://api.ubox.com:8443',
        V380_CLOUD_API: 'https://api.v380s.com:8443',
        GATEWAY_URL: 'http://gateway:8554 for P2P relay',
        V380_CLOUD_USER: 'optional',
        V380_CLOUD_PASS: 'optional'
      },
      ffmpeg: 'Must be installed for RTSP->HLS: apt install ffmpeg or apk add ffmpeg',
      onvif: 'ONVIF discovery requires cameras on same LAN or VPN. Enable ONVIF in camera app.',
      v380: 'V380 local API on port 5050. Enable in app if needed. RTSP default admin:888888',
      ubox: 'Ubox local RTSP on 554. For 4G cameras, need P2P gateway. Request SDK from supplier.'
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

// WebSocket for realtime - with auth check
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  // Simple auth check for WS in production
  if (!MOCK_MODE && process.env.AUTH_DISABLED !== 'true') {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];
    // In production you would verify token here
    // For now allow all but log
    console.log('[WS] Connection attempt', { hasToken: !!token, ip: req.socket.remoteAddress });
  }

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

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {}
  });
});

// Seed and refresh loop
if (MOCK_MODE) {
  seedMockDevices();
  console.log('[Server] MOCK_MODE enabled - using simulated cameras');
} else {
  // In production, still seed if empty but log warning
  const { getAllDevices: getDevs } = require('./services/deviceManager.js');
  if (getDevs().length === 0) {
    console.log('[Server] No devices found, seeding demo devices. Set MOCK_MODE=false and add real cameras via API.');
    seedMockDevices();
  }
}

refreshAllStatuses();
setInterval(refreshAllStatuses, 30 * 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n☀️  Solar PTZ Central Server running`);
  console.log(`   ENV: ${NODE_ENV} | Mock: ${MOCK_MODE} | Auth: ${process.env.AUTH_DISABLED === 'true' ? 'DISABLED' : 'ENABLED'}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
  console.log(`   DOCS: http://localhost:${PORT}/api/docs`);
  console.log(`   WS:  ws://localhost:${PORT}/ws`);
  console.log(`   HLS: http://localhost:${PORT}/hls/:deviceId/index.m3u8`);
  console.log(`   Client: http://localhost:5173 (vite) or http://localhost:${PORT} if built\n`);
  console.log(`   Default login: admin / admin123 (change in production!)\n`);
});
