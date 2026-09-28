import { db } from '../db/index.js';
import { UboxAdapter } from './ubox/index.js';
import { V380Adapter } from './v380/index.js';
import { OnvifAdapter } from './onvif/index.js';

export type Platform = 'ubox' | 'v380' | 'onvif' | 'rtsp' | 'generic';

export interface DeviceRow {
  id: string;
  name: string;
  platform: Platform;
  uid: string | null;
  ip: string | null;
  rtspUrl: string | null;
  onvifPort: number | null;
  username: string | null;
  password: string | null;
  location: string | null;
  groupName: string | null;
  enabled: number;
  config: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getAllDevices(): DeviceRow[] {
  return db.prepare('SELECT * FROM devices ORDER BY createdAt DESC').all() as DeviceRow[];
}

export function getDeviceById(id: string): DeviceRow | undefined {
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | undefined;
}

export function createDevice(data: Partial<DeviceRow> & { name: string; platform: Platform }): DeviceRow {
  const id = data.id || `dev_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    name: data.name,
    platform: data.platform,
    uid: data.uid || null,
    ip: data.ip || null,
    rtspUrl: data.rtspUrl || null,
    onvifPort: data.onvifPort || 80,
    username: data.username || null,
    password: data.password || null,
    location: data.location || null,
    groupName: data.groupName || 'default',
    enabled: 1,
    config: data.config || null,
    createdAt: now,
    updatedAt: now
  };
  db.prepare(`INSERT INTO devices (id, name, platform, uid, ip, rtspUrl, onvifPort, username, password, location, groupName, enabled, config, createdAt, updatedAt)
  VALUES (@id, @name, @platform, @uid, @ip, @rtspUrl, @onvifPort, @username, @password, @location, @groupName, @enabled, @config, @createdAt, @updatedAt)`).run(row);

  db.prepare(`INSERT INTO device_status (deviceId, online, battery, charging, signal, lastSeen) VALUES (@deviceId, @online, @battery, @charging, @signal, @lastSeen)`).run({
    deviceId: id,
    online: 0,
    battery: 0,
    charging: 0,
    signal: 0,
    lastSeen: now
  });

  return row as DeviceRow;
}

export function updateDevice(id: string, data: Partial<DeviceRow>): DeviceRow | undefined {
  const existing = getDeviceById(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`UPDATE devices SET name=@name, platform=@platform, uid=@uid, ip=@ip, rtspUrl=@rtspUrl, onvifPort=@onvifPort, username=@username, password=@password, location=@location, groupName=@groupName, enabled=@enabled, config=@config, updatedAt=@updatedAt WHERE id=@id`).run(updated);
  return updated;
}

export function deleteDevice(id: string) {
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  db.prepare('DELETE FROM device_status WHERE deviceId = ?').run(id);
}

export function getDeviceStatus(deviceId: string) {
  return db.prepare('SELECT * FROM device_status WHERE deviceId = ?').get(deviceId);
}

export function updateDeviceStatus(deviceId: string, status: any) {
  const existing = getDeviceStatus(deviceId);
  if (!existing) {
    db.prepare(`INSERT INTO device_status (deviceId, online, battery, charging, solarVoltage, storageUsed, storageTotal, signal, lastSeen)
    VALUES (@deviceId, @online, @battery, @charging, @solarVoltage, @storageUsed, @storageTotal, @signal, @lastSeen)`).run({
      deviceId,
      online: status.online ? 1 : 0,
      battery: status.battery || 0,
      charging: status.charging ? 1 : 0,
      solarVoltage: status.solarVoltage || null,
      storageUsed: status.storageUsed || null,
      storageTotal: status.storageTotal || null,
      signal: status.signal || 0,
      lastSeen: status.lastSeen || new Date().toISOString()
    });
  } else {
    db.prepare(`UPDATE device_status SET online=@online, battery=@battery, charging=@charging, solarVoltage=@solarVoltage, storageUsed=@storageUsed, storageTotal=@storageTotal, signal=@signal, lastSeen=@lastSeen WHERE deviceId=@deviceId`).run({
      deviceId,
      online: status.online ? 1 : 0,
      battery: status.battery ?? (existing as any).battery,
      charging: status.charging ? 1 : 0,
      solarVoltage: status.solarVoltage ?? (existing as any).solarVoltage,
      storageUsed: status.storageUsed ?? (existing as any).storageUsed,
      storageTotal: status.storageTotal ?? (existing as any).storageTotal,
      signal: status.signal ?? (existing as any).signal,
      lastSeen: status.lastSeen || new Date().toISOString()
    });
  }
}

// Adapter factory
export function getAdapterForDevice(device: DeviceRow) {
  const common = {
    uid: device.uid || device.id,
    ip: device.ip || undefined,
    username: device.username || undefined,
    password: device.password || undefined,
    rtspUrl: device.rtspUrl || undefined
  };

  switch (device.platform) {
    case 'ubox':
      return new UboxAdapter(common);
    case 'v380':
      return new V380Adapter(common);
    case 'onvif':
      return new OnvifAdapter({ ip: device.ip || '', port: device.onvifPort || 80, username: device.username || undefined, password: device.password || undefined });
    case 'rtsp':
    case 'generic':
    default:
      // For generic RTSP, reuse V380 adapter logic but without V380 specifics
      return new V380Adapter(common);
  }
}

export async function refreshAllStatuses() {
  const devices = getAllDevices();
  for (const dev of devices) {
    try {
      const adapter = getAdapterForDevice(dev);
      const status = await (adapter as any).getDeviceStatus();
      updateDeviceStatus(dev.id, status);
    } catch (e) {
      console.warn(`Failed to refresh status for ${dev.id}`, e);
    }
  }
}
