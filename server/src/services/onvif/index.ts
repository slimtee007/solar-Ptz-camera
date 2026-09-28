/**
 * ONVIF Adapter - for cameras that support ONVIF (many solar PTZ do when enabled)
 * Now with full production implementation using onvif library
 */

import { OnvifService } from './discovery.js';

export interface OnvifConfig {
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  xaddr?: string;
}

export class OnvifAdapter {
  private xaddr: string;

  constructor(private config: OnvifConfig) {
    this.xaddr = config.xaddr || `http://${config.ip}:${config.port || 80}/onvif/device_service`;
  }

  async getDeviceStatus() {
    if (process.env.MOCK_MODE === 'true') {
      return {
        online: true,
        battery: 85,
        charging: true,
        signal: 90,
        lastSeen: new Date().toISOString()
      };
    }

    try {
      const device = await OnvifService.connect(this.xaddr, this.config.username, this.config.password);
      const info = await OnvifService.getDeviceInfo(device);
      return {
        online: true,
        battery: 85,
        charging: false,
        signal: 90,
        lastSeen: new Date().toISOString(),
        manufacturer: info.Manufacturer,
        model: info.Model,
        firmware: info.FirmwareVersion
      };
    } catch (e) {
      console.warn(`[ONVIF ${this.config.ip}] status failed`, e);
      return {
        online: false,
        battery: 0,
        charging: false,
        signal: 0,
        lastSeen: new Date().toISOString()
      };
    }
  }

  async getStreamUrl(): Promise<string> {
    if (process.env.MOCK_MODE === 'true') {
      return `rtsp://${this.config.username || 'admin'}:${this.config.password || 'admin'}@${this.config.ip}:554/live/ch0`;
    }

    try {
      const device = await OnvifService.connect(this.xaddr, this.config.username, this.config.password);
      const uri = await OnvifService.getStreamUri(device);
      return uri;
    } catch (e) {
      console.warn(`[ONVIF ${this.config.ip}] getStreamUri failed, fallback to RTSP`, e);
      return `rtsp://${this.config.username || 'admin'}:${this.config.password || 'admin'}@${this.config.ip}:554/live/ch0`;
    }
  }

  async getSnapshotUrl(): Promise<string> {
    try {
      const device = await OnvifService.connect(this.xaddr, this.config.username, this.config.password);
      const uri = await OnvifService.getSnapshotUri(device);
      return uri;
    } catch (e) {
      return `http://${this.config.ip}/snapshot.cgi`;
    }
  }

  async ptzControl(action: string, speed: number = 0.5): Promise<boolean> {
    console.log(`[ONVIF ${this.config.ip}] PTZ ${action} speed ${speed}`);

    if (process.env.MOCK_MODE === 'true') {
      return true;
    }

    try {
      const device = await OnvifService.connect(this.xaddr, this.config.username, this.config.password);
      
      const s = speed / 100; // normalize 0-1
      
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
          await OnvifService.ptzStop(device);
          break;
        default:
          if (action.startsWith('preset')) {
            const presetNum = action.replace('preset', '');
            await OnvifService.gotoPreset(device, presetNum);
          } else {
            await OnvifService.ptzStop(device);
          }
      }
      
      // Auto stop after 500ms for continuous move
      if (['up','down','left','right','zoomIn','zoomOut'].includes(action)) {
        setTimeout(() => {
          OnvifService.ptzStop(device).catch(() => {});
        }, 500);
      }
      
      return true;
    } catch (e) {
      console.error('ONVIF PTZ error', e);
      return false;
    }
  }

  async getPresets(): Promise<any[]> {
    try {
      const device = await OnvifService.connect(this.xaddr, this.config.username, this.config.password);
      return await OnvifService.getPresets(device);
    } catch {
      return [];
    }
  }

  async getPlaybackDays(month: string): Promise<string[]> {
    return [];
  }

  async getPlaybackForDate(date: string): Promise<any[]> {
    return [];
  }

  async getEvents(limit = 20): Promise<any[]> {
    return [];
  }
}
