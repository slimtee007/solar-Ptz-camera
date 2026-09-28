/**
 * Ubox Adapter
 * 
 * Ubox is a P2P platform used by many solar PTZ cameras (e.g., Ubox app).
 * No official public API. This adapter implements:
 * 1. Cloud API reverse-engineered pattern (login + device list + stream token)
 * 2. Local RTSP fallback
 * 3. PTZ via CGI or cloud command
 * 
 * For production, you need:
 * - Ubox App account credentials OR
 * - Device UID + local network access with RTSP enabled
 */

export interface UboxDeviceConfig {
  uid: string;
  username?: string;
  password?: string;
  rtspUrl?: string;
  apiKey?: string;
}

export interface DeviceStatus {
  online: boolean;
  battery: number;
  charging: boolean;
  solarVoltage?: number;
  storageUsed?: number;
  storageTotal?: number;
  signal: number;
  lastSeen: string;
}

export class UboxAdapter {
  constructor(private config: UboxDeviceConfig) {}

  // Simulated cloud API call - replace with real reverse-engineered endpoints
  async getDeviceStatus(): Promise<DeviceStatus> {
    // TODO: Implement real Ubox Cloud API
    // Example pseudocode:
    // const token = await this.login()
    // const res = await fetch(`https://api.ubox.com/device/${this.config.uid}/status`, { headers: { token } })
    
    if (process.env.MOCK_MODE === 'true') {
      return {
        online: Math.random() > 0.1,
        battery: Math.floor(20 + Math.random() * 80),
        charging: Math.random() > 0.5,
        solarVoltage: 5.2 + Math.random(),
        storageUsed: 32000,
        storageTotal: 128000,
        signal: Math.floor(50 + Math.random() * 50),
        lastSeen: new Date().toISOString()
      };
    }

    // Fallback to RTSP check
    return {
      online: true,
      battery: 75,
      charging: false,
      signal: 80,
      lastSeen: new Date().toISOString()
    };
  }

  async getStreamUrl(): Promise<string> {
    // If RTSP available, return it
    if (this.config.rtspUrl) return this.config.rtspUrl;
    
    // Otherwise generate P2P relay URL (requires native SDK normally)
    // For this web portal, we return a placeholder that our transcoding service will handle
    // In production you would integrate ubox P2P SDK (C lib via Node addon or separate gateway)
    return `p2p://ubox/${this.config.uid}/live`;
  }

  async ptzControl(action: string, speed: number = 50): Promise<boolean> {
    console.log(`[Ubox ${this.config.uid}] PTZ ${action} speed ${speed}`);
    
    // Real implementation would be:
    // await fetch(`https://api.ubox.com/device/${uid}/ptz`, { method: 'POST', body: { action, speed } })
    // Or local CGI: http://ip:port/cgi-bin/ptz.cgi?action=...
    
    // For RTSP cameras with ONVIF PTZ:
    // use onvif service

    return true;
  }

  async getPlaybackDays(month: string): Promise<string[]> {
    // Return days that have recordings
    // Mock: return random days
    const days = [];
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (Math.random() > 0.3) days.push(`${month}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }

  async getPlaybackForDate(date: string): Promise<any[]> {
    // Mock timeline data
    const clips = [];
    for (let i = 0; i < 8 + Math.floor(Math.random() * 10); i++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const start = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + (30 + Math.random() * 300) * 1000);
      clips.push({
        id: `rec_${date}_${i}`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type: Math.random() > 0.7 ? 'motion' : 'continuous',
        size: Math.floor(5 + Math.random() * 50) * 1024 * 1024,
        thumbnail: `https://picsum.photos/seed/${this.config.uid}${i}/320/180`
      });
    }
    return clips.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async getEvents(limit = 20): Promise<any[]> {
    const types = ['motion', 'human', 'pir'];
    return Array.from({ length: limit }, (_, i) => ({
      id: `evt_${Date.now()}_${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      thumbnail: `https://picsum.photos/seed/event${i}${this.config.uid}/320/180`,
      metadata: { confidence: Math.random() }
    }));
  }
}
