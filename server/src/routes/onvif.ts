import { Router } from 'express';
import { OnvifService } from '../services/onvif/discovery.js';

const router = Router();

// Discover ONVIF devices on local network
router.get('/discover', async (req, res) => {
  const timeout = parseInt(req.query.timeout as string) || 10000;
  try {
    const devices = await OnvifService.discover(timeout);
    res.json({ count: devices.length, devices });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get device info
router.post('/connect', async (req, res) => {
  const { xaddr, username, password } = req.body;
  if (!xaddr) return res.status(400).json({ error: 'xaddr required' });
  try {
    const device = await OnvifService.connect(xaddr, username, password);
    const info = await OnvifService.getDeviceInfo(device);
    const streamUri = await OnvifService.getStreamUri(device).catch(() => null);
    const snapshotUri = await OnvifService.getSnapshotUri(device).catch(() => null);
    const presets = await OnvifService.getPresets(device).catch(() => []);
    
    res.json({
      info,
      streamUri,
      snapshotUri,
      presets,
      xaddr
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PTZ via ONVIF directly
router.post('/ptz', async (req, res) => {
  const { xaddr, username, password, action, speed, preset } = req.body;
  if (!xaddr) return res.status(400).json({ error: 'xaddr required' });
  
  try {
    const device = await OnvifService.connect(xaddr, username, password);
    
    if (action === 'preset' && preset) {
      await OnvifService.gotoPreset(device, preset);
    } else {
      const s = (speed || 50) / 100;
      switch (action) {
        case 'up':
          await OnvifService.ptzMove(device, { y: s });
          break;
        case 'down':
          await OnvifService.ptzMove(device, { y: -s });
          break;
        case 'left':
          await OnvifService.ptzMove(device, { x: -s });
          break;
        case 'right':
          await OnvifService.ptzMove(device, { x: s });
          break;
        case 'zoomIn':
          await OnvifService.ptzMove(device, { zoom: s });
          break;
        case 'zoomOut':
          await OnvifService.ptzMove(device, { zoom: -s });
          break;
        case 'stop':
        default:
          await OnvifService.ptzStop(device);
          break;
      }
      
      if (['up','down','left','right','zoomIn','zoomOut'].includes(action)) {
        setTimeout(() => {
          OnvifService.ptzStop(device).catch(() => {});
        }, 500);
      }
    }
    
    res.json({ success: true, action });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
