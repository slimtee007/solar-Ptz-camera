/**
 * ONVIF Production Service
 * Full ONVIF implementation for discovery, PTZ, snapshots, stream URI
 * Uses onvif library (Cam)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const onvifLib = require('onvif');
const Cam = onvifLib.Cam;
const Discovery = onvifLib.Discovery;

export interface OnvifDiscoveryResult {
  ip: string;
  port: number;
  name?: string;
  hardware?: string;
  xaddr: string;
}

export class OnvifService {
  // Discover ONVIF devices on local network (uses WS-Discovery)
  static async discover(timeoutMs: number = 10000): Promise<OnvifDiscoveryResult[]> {
    return new Promise((resolve) => {
      const devices: OnvifDiscoveryResult[] = [];
      let finished = false;

      try {
        if (Discovery && Discovery.probe) {
          Discovery.probe({ timeout: timeoutMs }, (err: any, cams: any[]) => {
            if (finished) return;
            finished = true;
            if (err) {
              console.warn('ONVIF discovery error:', err.message);
              resolve([]);
              return;
            }
            const results = (cams || []).map((cam: any) => ({
              ip: cam.address || cam.ip,
              port: cam.port || 80,
              name: cam.name,
              hardware: cam.hardware,
              xaddr: cam.xaddrs?.[0] || cam.xaddr
            }));
            resolve(results);
          });

          setTimeout(() => {
            if (!finished) {
              finished = true;
              resolve(devices);
            }
          }, timeoutMs + 1000);
        } else {
          console.warn('ONVIF Discovery not available');
          resolve([]);
        }
      } catch (e: any) {
        console.warn('ONVIF discovery failed:', e.message);
        resolve([]);
      }
    });
  }

  static async connect(xaddr: string, username?: string, password?: string): Promise<any> {
    // xaddr like http://192.168.1.100:80/onvif/device_service
    try {
      const url = new URL(xaddr);
      return await this.connectByHost(url.hostname, parseInt(url.port || '80'), username, password, url.pathname);
    } catch {
      // fallback
      return await this.connectByHost(xaddr, 80, username, password);
    }
  }

  static async connectByHost(hostname: string, port: number, username?: string, password?: string, path?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const cam = new Cam({
          hostname,
          port,
          username,
          password,
          path: path || '/onvif/device_service'
        }, (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(cam);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  static async getStreamUri(cam: any, profileToken?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      const opts: any = {};
      if (token) opts.profileToken = token;
      opts.protocol = 'RTSP';
      
      cam.getStreamUri(opts, (err: any, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        // stream can be { uri: ... } or { mediaUri: { uri } }
        const uri = stream?.uri || stream?.mediaUri?.uri || stream;
        resolve(typeof uri === 'string' ? uri : uri?.uri || '');
      });
    });
  }

  static async getSnapshotUri(cam: any, profileToken?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      const opts: any = {};
      if (token) opts.profileToken = token;
      
      cam.getSnapshotUri(opts, (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }
        const uri = result?.uri || result?.mediaUri?.uri || result;
        resolve(typeof uri === 'string' ? uri : uri?.uri || '');
      });
    });
  }

  static async ptzMove(cam: any, params: { x?: number, y?: number, zoom?: number, profileToken?: string }) {
    return new Promise((resolve, reject) => {
      const token = params.profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      const opts: any = {
        profileToken: token,
        velocity: {}
      };
      if (params.x !== undefined) opts.velocity.x = params.x;
      if (params.y !== undefined) opts.velocity.y = params.y;
      if (params.zoom !== undefined) opts.velocity.zoom = params.zoom;
      
      // Some cams use PanTilt and Zoom separately
      if (opts.velocity.x !== undefined || opts.velocity.y !== undefined) {
        opts.velocity = {
          ...opts.velocity,
          // Ensure proper structure
        };
      }

      cam.continuousMove(opts, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  static async ptzStop(cam: any, profileToken?: string) {
    return new Promise((resolve, reject) => {
      const token = profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      cam.stop({ profileToken: token, panTilt: true, zoom: true }, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  static async gotoPreset(cam: any, preset: string, profileToken?: string) {
    return new Promise((resolve, reject) => {
      const token = profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      cam.gotoPreset({ profileToken: token, preset }, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  static async getPresets(cam: any, profileToken?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const token = profileToken || cam.activeSource?.profileToken || cam.defaultProfile?.token;
      const opts: any = {};
      if (token) opts.profileToken = token;
      
      cam.getPresets(opts, (err: any, presets: any) => {
        if (err) reject(err);
        else {
          // presets is object keyed by token
          if (Array.isArray(presets)) resolve(presets);
          else if (presets && typeof presets === 'object') {
            resolve(Object.values(presets));
          } else resolve([]);
        }
      });
    });
  }

  static async getDeviceInfo(cam: any): Promise<any> {
    return new Promise((resolve, reject) => {
      cam.getDeviceInformation((err: any, info: any) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
  }
}
