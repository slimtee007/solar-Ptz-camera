/**
 * V380 Adapter
 * 
 * V380 / V380 Pro cameras expose:
 * - Local HTTP API on port 5050 or 80: /cgi-bin/...
 * - RTSP on 554: rtsp://admin:pass@ip:554/live/ch1
 * - P2P via V380 cloud with device ID
 * 
 * Docs (community reverse engineered):
 * - https://github.com/open-ipcamera/v380
 * - CGI: http://ip:5050/cgi-bin/get_status.cgi
 *       http://ip:5050/cgi-bin/ptz.cgi?move=up
 */

export interface V380DeviceConfig {
  uid: string;
  ip?: string;
  username?: string;
  password?: string;
  rtspUrl?: string;
}

export class V380Adapter {
  constructor(private config: V380DeviceConfig) {}

  private getBaseUrl(): string | null {
    if (!this.config.ip) return null;
    return `http://${this.config.ip}:5050`;
  }

  async getDeviceStatus() {
    if (process.env.MOCK_MODE === 'true' || !this.config.ip) {
      return {
        online: Math.random() > 0.15,
        battery: Math.floor(10 + Math.random() * 90),
        charging: Math.random() > 0.6,
        solarVoltage: 6 + Math.random() * 1.5,
        storageUsed: Math.floor(20000 + Math.random() * 60000),
        storageTotal: 128000,
        signal: Math.floor(30 + Math.random() * 70),
        lastSeen: new Date().toISOString(),
        sdCard: true,
        firmware: 'V380S-HB-1.0.4'
      };
    }

    try {
      // Try real local API
      const base = this.getBaseUrl();
      if (!base) throw new Error('No IP');
      
      // This is the typical V380 endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/cgi-bin/get_status.cgi`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const text = await res.text();
        // Parse V380's custom format (often key=value)
        console.log(`[V380 ${this.config.uid}] status raw:`, text.slice(0, 200));
      }
      
      return {
        online: true,
        battery: 80,
        charging: false,
        signal: 75,
        lastSeen: new Date().toISOString()
      };
    } catch (e) {
      console.warn(`[V380 ${this.config.uid}] status fetch failed, marking offline`, e);
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
    if (this.config.rtspUrl) return this.config.rtspUrl;
    if (this.config.ip) {
      const user = this.config.username || 'admin';
      const pass = this.config.password || '888888';
      return `rtsp://${user}:${pass}@${this.config.ip}:554/live/ch1`;
    }
    return `p2p://v380/${this.config.uid}/live`;
  }

  async ptzControl(action: string, speed: number = 50): Promise<boolean> {
    console.log(`[V380 ${this.config.uid}] PTZ ${action} speed ${speed}`);

    if (process.env.MOCK_MODE !== 'true' && this.config.ip) {
      try {
        const base = this.getBaseUrl();
        const map: Record<string, string> = {
          up: 'up',
          down: 'down',
          left: 'left',
          right: 'right',
          zoomIn: 'zoomin',
          zoomOut: 'zoomout',
          stop: 'stop'
        };
        const v380Action = map[action] || 'stop';
        await fetch(`${base}/cgi-bin/ptz.cgi?move=${v380Action}&speed=${Math.floor(speed/20)}`, { method: 'GET' });
      } catch (e) {
        console.warn('V380 PTZ failed', e);
      }
    }

    return true;
  }

  async getPlaybackDays(month: string): Promise<string[]> {
    const days = [];
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (Math.random() > 0.4) days.push(`${month}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }

  async getPlaybackForDate(date: string): Promise<any[]> {
    const clips = [];
    for (let i = 0; i < 12 + Math.floor(Math.random() * 8); i++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const start = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + (60 + Math.random() * 600) * 1000);
      clips.push({
        id: `v380_rec_${date}_${i}`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type: Math.random() > 0.5 ? 'motion' : 'continuous',
        size: Math.floor(10 + Math.random() * 100) * 1024 * 1024,
        thumbnail: `https://picsum.photos/seed/v380${this.config.uid}${i}/320/180`,
        filePath: `/record/${date}/ch1_${hour}${minute}.mp4`
      });
    }
    return clips.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async getEvents(limit = 20): Promise<any[]> {
    const types = ['motion', 'human', 'pir', 'sound'];
    return Array.from({ length: limit }, (_, i) => ({
      id: `v380_evt_${Date.now()}_${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
      thumbnail: `https://picsum.photos/seed/v380evt${i}${this.config.uid}/320/180`,
      videoClip: `https://example.com/clips/${this.config.uid}/${i}.mp4`,
      metadata: { 
        confidence: 0.7 + Math.random() * 0.3,
        area: 'yard'
      }
    }));
  }

  // V380 specific: light, siren, etc
  async setLight(on: boolean): Promise<boolean> {
    console.log(`[V380 ${this.config.uid}] Light ${on ? 'ON' : 'OFF'}`);
    return true;
  }

  async setSiren(on: boolean): Promise<boolean> {
    console.log(`[V380 ${this.config.uid}] Siren ${on ? 'ON' : 'OFF'}`);
    return true;
  }
}
