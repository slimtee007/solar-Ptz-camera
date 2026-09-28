import { Router } from 'express';
import { z } from 'zod';
import { getAllDevices, getDeviceById, createDevice, updateDevice, deleteDevice, getDeviceStatus, getAdapterForDevice } from '../services/deviceManager.js';
import { startHlsStream } from '../services/rtsp/index.js';
import { db } from '../db/index.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(['ubox','v380','onvif','rtsp','generic']),
  uid: z.string().optional(),
  ip: z.string().optional(),
  rtspUrl: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  location: z.string().optional(),
  groupName: z.string().optional(),
  onvifPort: z.number().optional(),
  config: z.any().optional()
});

router.get('/', (req, res) => {
  const devices = getAllDevices();
  const enriched = devices.map(d => ({
    ...d,
    status: getDeviceStatus(d.id),
    config: d.config ? JSON.parse(d.config) : {}
  }));
  res.json(enriched);
});

router.post('/', (req, res) => {
  try {
    const parsed = createSchema.parse(req.body);
    const device = createDevice({
      ...parsed,
      config: parsed.config ? JSON.stringify(parsed.config) : null
    } as any);
    res.status(201).json(device);
  } catch (e: any) {
    res.status(400).json({ error: e.message, details: e.errors });
  }
});

router.get('/:id', (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  res.json({ ...dev, status: getDeviceStatus(dev.id), config: dev.config ? JSON.parse(dev.config) : {} });
});

router.put('/:id', (req, res) => {
  const dev = updateDevice(req.params.id, {
    ...req.body,
    config: req.body.config ? JSON.stringify(req.body.config) : req.body.config
  });
  if (!dev) return res.status(404).json({ error: 'Not found' });
  res.json(dev);
});

router.delete('/:id', (req, res) => {
  deleteDevice(req.params.id);
  res.json({ success: true });
});

router.get('/:id/status', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev);
    const status = await (adapter as any).getDeviceStatus();
    // Update DB
    const { updateDeviceStatus } = await import('../services/deviceManager.js');
    updateDeviceStatus(dev.id, status);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/stream', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev);
    const rtspUrl = await (adapter as any).getStreamUrl();
    
    if (process.env.MOCK_MODE === 'true') {
      // Return mock stream info - frontend will show placeholder
      return res.json({
        type: 'mock',
        hlsUrl: `/hls/${dev.id}/index.m3u8`,
        rtspUrl,
        webrtc: null,
        thumbnail: `https://picsum.photos/seed/${dev.id}/640/360`
      });
    }

    const hlsUrl = await startHlsStream(dev.id, rtspUrl);
    res.json({
      type: 'hls',
      hlsUrl,
      rtspUrl,
      thumbnail: null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/ptz', async (req, res) => {
  const { action, speed } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev);
    const ok = await (adapter as any).ptzControl(action, speed || 50);
    res.json({ success: ok, action });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/light', async (req, res) => {
  const { on } = req.body;
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  const adapter = getAdapterForDevice(dev) as any;
  if (adapter.setLight) {
    await adapter.setLight(on);
  }
  res.json({ success: true, light: on });
});

router.post('/:id/siren', async (req, res) => {
  const { on } = req.body;
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  const adapter = getAdapterForDevice(dev) as any;
  if (adapter.setSiren) {
    await adapter.setSiren(on);
  }
  res.json({ success: true, siren: on });
});

// Playback
router.get('/:id/playback/days', async (req, res) => {
  const { month } = req.query as { month?: string };
  if (!month) return res.status(400).json({ error: 'month query required YYYY-MM' });
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  const adapter = getAdapterForDevice(dev) as any;
  const days = await adapter.getPlaybackDays(month);
  res.json({ month, days });
});

router.get('/:id/playback', async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ error: 'date query required YYYY-MM-DD' });
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  const adapter = getAdapterForDevice(dev) as any;
  const clips = await adapter.getPlaybackForDate(date);
  
  // Also store in DB for history if needed
  // (optional)

  res.json({ date, clips });
});

router.get('/:id/events', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  const adapter = getAdapterForDevice(dev) as any;
  const events = await adapter.getEvents(limit);
  res.json(events);
});

// Snapshot - production
router.get('/:id/snapshot', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev) as any;
    if (adapter.getSnapshot) {
      const buffer = await adapter.getSnapshot();
      if (buffer) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(buffer);
      }
    }
    // Fallback: try to get snapshot via ONVIF or HTTP
    res.status(404).json({ error: 'Snapshot not available for this device', hint: 'Ensure camera IP is reachable and supports snapshot.cgi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/sdcard', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev) as any;
    if (adapter.getSdCardStatus) {
      const sd = await adapter.getSdCardStatus();
      return res.json(sd);
    }
    res.json({ used: 0, total: 0, status: 'unknown' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/reboot', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev) as any;
    if (adapter.reboot) {
      await adapter.reboot();
      return res.json({ success: true, message: 'Reboot command sent' });
    }
    res.status(400).json({ error: 'Reboot not supported for this platform' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/presets', async (req, res) => {
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev) as any;
    if (adapter.getPresets) {
      const presets = await adapter.getPresets();
      return res.json(presets);
    }
    res.json([]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/goto-preset', async (req, res) => {
  const { preset } = req.body;
  if (!preset) return res.status(400).json({ error: 'preset required' });
  const dev = getDeviceById(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  try {
    const adapter = getAdapterForDevice(dev) as any;
    const ok = await adapter.ptzControl(`preset${preset}`, 50);
    res.json({ success: ok, preset });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Groups
router.get('/groups/list', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT groupName FROM devices').all() as any[];
  res.json(rows.map(r => r.groupName));
});

export default router;
