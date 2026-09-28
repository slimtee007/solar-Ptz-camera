/**
 * Ubox Production Cloud + Local API
 * 
 * Ubox is more closed than V380. Known integration methods:
 * 
 * 1. Local RTSP (if enabled in app):
 *    rtsp://admin:password@IP:554/live/ch0
 *    rtsp://admin:password@IP:554/live/ch1
 *    rtsp://admin:password@IP:554/ucast/11 (some firmware)
 * 
 * 2. Local CGI (some models):
 *    http://IP:80/cgi-bin/get_status.cgi
 *    http://IP:80/cgi-bin/ptz.cgi?move=up
 * 
 * 3. Cloud P2P (requires native SDK for production):
 *    The Ubox app uses P2P via ubox.com servers. The SDK is C library.
 *    For production web portal, you have 2 options:
 *    a) Deploy a gateway service that uses the P2P SDK (Node addon or Go service) and re-exposes RTSP/WebRTC
 *    b) Use cloud API if camera supports cloud RTSP relay (some 4G models do)
 * 
 *    Reverse engineered cloud endpoints (community):
 *    - POST https://api.ubox.com:8443/api/v1/user/login
 *    - GET  https://api.ubox.com:8443/api/v1/device/list
 *    - GET  https://api.ubox.com:8443/api/v1/device/{uid}/status
 *    - POST https://api.ubox.com:8443/api/v1/device/{uid}/ptz
 *    - GET  https://api.ubox.com:8443/api/v1/device/{uid}/stream/token
 * 
 * 4. MQTT (some Ubox solar cams use MQTT for status):
 *    - Battery, solar, PIR events via MQTT broker
 */

import axios from 'axios';

export interface UboxCloudConfig {
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}

export interface UboxLocalConfig {
  ip: string;
  username?: string;
  password?: string;
  port?: number;
}

export class UboxCloudAPI {
  private baseUrl: string;

  constructor(private config: UboxCloudConfig) {
    this.baseUrl = config.baseUrl || process.env.UBOX_CLOUD_API || 'https://api.ubox.com:8443';
  }

  async login(): Promise<{ token: string, userId: string }> {
    const { username, password } = this.config;
    if (!username || !password) {
      throw new Error('Ubox cloud username/password required');
    }

    try {
      // Try multiple known endpoints
      const endpoints = [
        `${this.baseUrl}/api/v1/user/login`,
        `${this.baseUrl}/app/user/login`,
        `https://api.ubox.com/api/user/login`
      ];

      let lastError: any;
      for (const url of endpoints) {
        try {
          const res = await axios.post(url, {
            username,
            password,
            app_id: this.config.apiKey || process.env.UBOX_APP_KEY,
            app_secret: this.config.apiSecret || process.env.UBOX_APP_SECRET,
            platform: 'web',
            version: '1.0'
          }, { timeout: 10000 });

          if (res.data.token || res.data.access_token || res.data.data?.token) {
            return {
              token: res.data.token || res.data.access_token || res.data.data.token,
              userId: res.data.user_id || res.data.uid || res.data.data?.user_id || username
            };
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      throw lastError || new Error('All Ubox login endpoints failed');
    } catch (e: any) {
      throw new Error(`Ubox cloud login failed: ${e.message}. Check UBOX_CLOUD_API, username, password, and enable cloud access.`);
    }
  }

  async getDevices(token: string): Promise<any[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/device/list`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Token': token },
        timeout: 10000
      });
      return res.data.devices || res.data.list || res.data.data || [];
    } catch (e: any) {
      // Fallback endpoint
      try {
        const res2 = await axios.get(`${this.baseUrl}/app/device/list`, {
          headers: { Authorization: token },
          timeout: 10000
        });
        return res2.data.devices || res2.data.list || [];
      } catch {
        throw new Error(`Ubox device list failed: ${e.message}`);
      }
    }
  }

  async getDeviceStatus(token: string, uid: string): Promise<any> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/device/${uid}/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return res.data;
    } catch (e: any) {
      throw new Error(`Ubox status failed for ${uid}: ${e.message}`);
    }
  }

  async getStreamToken(token: string, uid: string): Promise<{ url: string, token: string }> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/device/${uid}/stream/token`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return {
        url: res.data.url || res.data.stream_url || `p2p://ubox/${uid}`,
        token: res.data.stream_token || res.data.token
      };
    } catch (e: any) {
      // Return P2P placeholder that gateway can handle
      return {
        url: `p2p://ubox/${uid}`,
        token: ''
      };
    }
  }

  async ptzControl(token: string, uid: string, action: string, speed: number = 50): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/api/v1/device/${uid}/ptz`, {
        action,
        speed
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return true;
    } catch (e) {
      console.warn(`Ubox PTZ via cloud failed for ${uid}, will try local`, e);
      return false;
    }
  }
}

export class UboxLocalAPI {
  private baseUrl: string;

  constructor(private config: UboxLocalConfig) {
    const port = config.port || 80;
    this.baseUrl = `http://${config.ip}:${port}`;
  }

  async getStatus(): Promise<any> {
    try {
      const res = await axios.get(`${this.baseUrl}/cgi-bin/get_status.cgi`, {
        timeout: 5000,
        auth: this.config.username && this.config.password ? {
          username: this.config.username,
          password: this.config.password
        } : undefined
      });
      // Parse similar to V380
      const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      return { raw: text, online: true };
    } catch (e: any) {
      // Try alternative endpoint
      try {
        const res2 = await axios.get(`${this.baseUrl}/status.cgi`, { timeout: 5000 });
        return { raw: res2.data, online: true };
      } catch {
        throw new Error(`Ubox local status failed for ${this.config.ip}: ${e.message}`);
      }
    }
  }

  async ptz(action: string, speed: number = 50): Promise<boolean> {
    const map: Record<string, string> = {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
      zoomIn: 'zoomin',
      zoomOut: 'zoomout',
      stop: 'stop'
    };
    const move = map[action] || 'stop';
    
    const endpoints = [
      `/cgi-bin/ptz.cgi?move=${move}&speed=${Math.floor(speed/20)}`,
      `/ptz.cgi?move=${move}`,
      `/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=${move}&-speed=${Math.floor(speed/20)}`
    ];

    for (const ep of endpoints) {
      try {
        await axios.get(`${this.baseUrl}${ep}`, {
          timeout: 3000,
          auth: this.config.username && this.config.password ? {
            username: this.config.username,
            password: this.config.password
          } : undefined
        });
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  async snapshot(): Promise<Buffer> {
    const urls = [
      `${this.baseUrl}/snapshot.cgi`,
      `${this.baseUrl}/cgi-bin/snapshot.cgi`,
      `${this.baseUrl}/tmpfs/auto.jpg`
    ];
    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 5000,
          auth: this.config.username && this.config.password ? {
            username: this.config.username,
            password: this.config.password
          } : undefined
        });
        return Buffer.from(res.data);
      } catch {
        continue;
      }
    }
    throw new Error('Snapshot failed - no endpoint responded');
  }

  async getRtspUrl(): Promise<string> {
    const user = this.config.username || 'admin';
    const pass = this.config.password || '123456';
    const ip = this.config.ip;
    
    // Common Ubox RTSP patterns
    const candidates = [
      `rtsp://${user}:${pass}@${ip}:554/live/ch0`,
      `rtsp://${user}:${pass}@${ip}:554/live/ch1`,
      `rtsp://${user}:${pass}@${ip}:554/ucast/11`,
      `rtsp://${user}:${pass}@${ip}:554/ucast/12`,
      `rtsp://${user}:${pass}@${ip}:554/live/0`,
      `rtsp://${user}:${pass}@${ip}:8554/live/ch0`
    ];
    
    // In production, you would test each URL with ffmpeg probe
    // For now return first candidate
    return candidates[0];
  }
}

// Gateway helper - for production P2P to RTSP bridge
export class UboxGateway {
  static getGatewayInstructions(): string {
    return `
Ubox P2P Gateway Setup (Production for 4G Solar Cameras):

1. The Ubox P2P SDK is a C library provided by Ubox vendor. You need to request it from your camera supplier.

2. Deploy a gateway service (Go or Node with native addon):
   - Go example: https://github.com/ (search ubox p2p gateway)
   - The gateway logs in with UID and re-exposes RTSP on local port

3. Example gateway docker-compose:
   services:
     ubox-gateway:
       image: your-ubox-gateway:latest
       environment:
         - UBOX_UID=UBOX-123456-ABCDE
         - UBOX_USERNAME=admin
         - UBOX_PASSWORD=123456
         - RTSP_PORT=8554
       ports:
         - "8554:8554"

4. Then in Solar PTZ Central, add device with:
   - platform: rtsp
   - rtspUrl: rtsp://gateway-ip:8554/ubox-123456

5. Alternative: Use WebRTC gateway for lower latency

This portal will automatically detect p2p:// URLs and attempt to proxy via gateway if GATEWAY_URL env is set.
`;
  }
}
