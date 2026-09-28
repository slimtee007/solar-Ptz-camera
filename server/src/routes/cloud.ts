import { Router } from 'express';
import { z } from 'zod';
import { V380CloudAPI } from '../services/v380/cloud.js';
import { UboxCloudAPI } from '../services/ubox/cloud.js';

const router = Router();

// V380 Cloud
const v380LoginSchema = z.object({
  username: z.string(),
  password: z.string()
});

router.post('/v380/login', async (req, res) => {
  try {
    const { username, password } = v380LoginSchema.parse(req.body);
    const result = await V380CloudAPI.cloudLogin(username, password);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message, hint: 'Check V380 cloud credentials. Capture app traffic if endpoint changed. See server/src/services/v380/cloud.ts' });
  }
});

router.get('/v380/devices', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token required (Bearer or ?token=)' });
  try {
    const devices = await V380CloudAPI.cloudGetDevices(token);
    res.json({ count: devices.length, devices });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/v380/:ip/status', async (req, res) => {
  const { ip } = req.params;
  const { username, password } = req.query as any;
  try {
    const api = new V380CloudAPI({ ip, username, password });
    const status = await api.getStatus();
    const sd = await api.getSdCardStatus().catch(() => null);
    res.json({ status, sdCard: sd });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/v380/:ip/snapshot', async (req, res) => {
  const { ip } = req.params;
  const { username, password } = req.query as any;
  try {
    const api = new V380CloudAPI({ ip, username, password });
    const buffer = await api.snapshot();
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Ubox Cloud
const uboxLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  baseUrl: z.string().optional()
});

router.post('/ubox/login', async (req, res) => {
  try {
    const data = uboxLoginSchema.parse(req.body);
    const api = new UboxCloudAPI({
      username: data.username,
      password: data.password,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      baseUrl: data.baseUrl
    });
    const result = await api.login();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message, hint: 'Ubox cloud is reverse engineered. Endpoints may change. See server/src/services/ubox/cloud.ts' });
  }
});

router.get('/ubox/devices', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token required' });
  const baseUrl = req.query.baseUrl as string;
  try {
    const api = new UboxCloudAPI({ baseUrl });
    const devices = await api.getDevices(token);
    res.json({ count: devices.length, devices });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ubox/:uid/status', async (req, res) => {
  const { uid } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token required' });
  const baseUrl = req.query.baseUrl as string;
  try {
    const api = new UboxCloudAPI({ baseUrl });
    const status = await api.getDeviceStatus(token, uid);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ubox/:uid/stream', async (req, res) => {
  const { uid } = req.params;
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const api = new UboxCloudAPI({});
    const stream = await api.getStreamToken(token, uid);
    res.json(stream);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/gateway/instructions', (req, res) => {
  res.json({
    message: 'For 4G solar cameras without local RTSP, you need a P2P gateway',
    ubox: {
      description: 'Ubox P2P gateway converts P2P to RTSP',
      instructions: `
1. Request Ubox P2P SDK from your camera supplier
2. Deploy gateway: docker run -e UBOX_UID=YOUR_UID -p 8554:8554 your-gateway
3. Add device in portal as RTSP: rtsp://gateway-ip:8554/uid
4. Or set GATEWAY_URL env to auto-convert p2p:// URLs
`,
      env: {
        GATEWAY_URL: 'http://your-gateway:8554',
        UBOX_CLOUD_USER: 'your ubox account',
        UBOX_CLOUD_PASS: 'password'
      }
    },
    v380: {
      description: 'V380 gateway similar, but V380 often has direct RTSP',
      rtsp: 'rtsp://admin:888888@CAMERA_IP:554/live/ch1',
      cloud: 'Use /api/cloud/v380/login to get cloud devices'
    }
  });
});

export default router;
