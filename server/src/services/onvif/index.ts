/**
 * ONVIF Adapter - for cameras that support ONVIF (many solar PTZ do when enabled)
 */

export interface OnvifConfig {
  ip: string;
  port?: number;
  username?: string;
  password?: string;
}

export class OnvifAdapter {
  constructor(private config: OnvifConfig) {}

  async getDeviceStatus() {
    return {
      online: true,
      battery: 85,
      charging: true,
      signal: 90,
      lastSeen: new Date().toISOString()
    };
  }

  async getStreamUrl(): Promise<string> {
    // ONVIF discovery would give RTSP URL
    // For now return configured or generic
    return `rtsp://${this.config.username || 'admin'}:${this.config.password || 'admin'}@${this.config.ip}:554/live/ch0`;
  }

  async ptzControl(action: string, speed: number = 0.5): Promise<boolean> {
    console.log(`[ONVIF ${this.config.ip}] PTZ ${action}`);
    try {
      // Real ONVIF implementation:
      // const { OnvifDevice } = require('onvif');
      // const device = new OnvifDevice({ xaddr: `http://${ip}:${port}/onvif/device_service`, user, pass })
      // await device.init()
      // await device.ptzMove(...)
      return true;
    } catch (e) {
      console.error('ONVIF PTZ error', e);
      return false;
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
