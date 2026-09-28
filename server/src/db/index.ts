import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/db.json');
const DATA_DIR = path.dirname(DB_PATH);

fs.mkdirSync(DATA_DIR, { recursive: true });

interface DeviceRow {
  id: string;
  name: string;
  platform: string;
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

interface StatusRow {
  deviceId: string;
  online: number;
  battery: number;
  charging: number;
  solarVoltage?: number | null;
  storageUsed?: number | null;
  storageTotal?: number | null;
  signal: number;
  lastSeen: string;
  [key: string]: any;
}

interface DbFile {
  devices: DeviceRow[];
  device_status: StatusRow[];
  recordings: any[];
  events: any[];
}

function load(): DbFile {
  if (!fs.existsSync(DB_PATH)) {
    return { devices: [], device_status: [], recordings: [], events: [] };
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { devices: [], device_status: [], recordings: [], events: [] };
  }
}

function save(data: DbFile) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let memory: DbFile = load();

// Shim to mimic better-sqlite3 API for minimal compatibility
export const db = {
  prepare: (sql: string) => {
    const lower = sql.toLowerCase().trim();
    
    return {
      get: (...args: any[]) => {
        if (lower.includes('select count(*) as c from devices')) {
          return { c: memory.devices.length };
        }
        if (lower.startsWith('select * from devices where id =')) {
          const id = args[0];
          return memory.devices.find(d => d.id === id);
        }
        if (lower.startsWith('select * from device_status where deviceid =')) {
          const id = args[0];
          return memory.device_status.find(s => s.deviceId === id);
        }
        if (lower.includes('sum(storageused)')) {
          const used = memory.device_status.reduce((a, b) => a + (b.storageUsed || 0), 0);
          const total = memory.device_status.reduce((a, b) => a + (b.storageTotal || 0), 0);
          return { used, total };
        }
        if (lower.includes('select distinct groupname from devices')) {
          // handled in all()
          return null;
        }
        // generic
        return undefined;
      },
      all: (..._args: any[]) => {
        if (lower.includes('select * from devices order by')) {
          return [...memory.devices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        if (lower.includes('select distinct groupname from devices')) {
          const groups = [...new Set(memory.devices.map(d => d.groupName).filter(Boolean))];
          return groups.map(g => ({ groupName: g }));
        }
        return [];
      },
      run: (params: any) => {
        // Handle object param or positional
        if (lower.startsWith('insert into devices')) {
          const row = params as DeviceRow;
          memory.devices.push(row as DeviceRow);
          save(memory);
          return;
        }
        if (lower.startsWith('insert into device_status')) {
          if (Array.isArray(params)) {
            // positional: (id, online, battery, charging, signal, lastSeen) - simplified
            // Actually we have two forms, handle object form
            const [id, online, battery, charging, signal, lastSeen] = params;
            memory.device_status.push({
              deviceId: id,
              online, battery, charging, signal, lastSeen,
              storageUsed: null, storageTotal: null, solarVoltage: null
            });
          } else {
            const p = params as any;
            // if deviceId present
            if (p.deviceId) {
              // check if exists, if not push
              const exists = memory.device_status.find(s => s.deviceId === p.deviceId);
              if (!exists) {
                memory.device_status.push({
                  deviceId: p.deviceId,
                  online: p.online ? 1 : 0,
                  battery: p.battery || 0,
                  charging: p.charging ? 1 : 0,
                  solarVoltage: p.solarVoltage || null,
                  storageUsed: p.storageUsed || null,
                  storageTotal: p.storageTotal || null,
                  signal: p.signal || 0,
                  lastSeen: p.lastSeen || new Date().toISOString()
                });
              }
            }
          }
          save(memory);
          return;
        }
        if (lower.startsWith('update devices set')) {
          const row = params as DeviceRow;
          const idx = memory.devices.findIndex(d => d.id === row.id);
          if (idx >= 0) memory.devices[idx] = row as DeviceRow;
          save(memory);
          return;
        }
        if (lower.startsWith('update device_status set')) {
          const p = params as any;
          const idx = memory.device_status.findIndex(s => s.deviceId === p.deviceId);
          if (idx >= 0) {
            memory.device_status[idx] = {
              ...memory.device_status[idx],
              online: p.online ? 1 : 0,
              battery: p.battery ?? memory.device_status[idx].battery,
              charging: p.charging ? 1 : 0,
              solarVoltage: p.solarVoltage ?? memory.device_status[idx].solarVoltage,
              storageUsed: p.storageUsed ?? memory.device_status[idx].storageUsed,
              storageTotal: p.storageTotal ?? memory.device_status[idx].storageTotal,
              signal: p.signal ?? memory.device_status[idx].signal,
              lastSeen: p.lastSeen || new Date().toISOString()
            };
          }
          save(memory);
          return;
        }
        if (lower.startsWith('delete from devices where id =')) {
          const id = Array.isArray(params) ? params[0] : params;
          memory.devices = memory.devices.filter(d => d.id !== id);
          save(memory);
          return;
        }
        if (lower.startsWith('delete from device_status where deviceid =')) {
          const id = Array.isArray(params) ? params[0] : params;
          memory.device_status = memory.device_status.filter(s => s.deviceId !== id);
          save(memory);
          return;
        }
        // Fallback for positional inserts
        if (lower.includes('insert into device_status') && Array.isArray(params)) {
          // handled above
          return;
        }
        console.warn('[DB shim] Unhandled run:', sql, params);
      }
    };
  },
  exec: (_sql: string) => {
    // no-op, tables are virtual
  },
  pragma: (_s: string) => {},
  transaction: (fn: () => void) => {
    return () => {
      fn();
      save(memory);
    };
  }
};

export function getDb() { return db; }

export function seedMockDevices() {
  if (memory.devices.length > 0) return;

  const now = new Date().toISOString();
  const devices: DeviceRow[] = [
    {
      id: 'dev_ubox_001',
      name: 'Front Gate - Solar PTZ',
      platform: 'ubox',
      uid: 'UBOX-123456-ABCDE',
      ip: '192.168.1.101',
      rtspUrl: 'rtsp://admin:123456@192.168.1.101:554/live/ch0',
      onvifPort: 80,
      username: 'admin',
      password: '123456',
      location: 'Front Gate',
      groupName: 'Perimeter',
      enabled: 1,
      config: JSON.stringify({ resolution: '1080p', batteryCapacity: '20000mAh' }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'dev_v380_001',
      name: 'Backyard - V380 Pro',
      platform: 'v380',
      uid: 'V380-987654-XYZ',
      ip: '192.168.1.102',
      rtspUrl: 'rtsp://admin:888888@192.168.1.102:554/live/ch1',
      onvifPort: 80,
      username: 'admin',
      password: '888888',
      location: 'Backyard',
      groupName: 'Garden',
      enabled: 1,
      config: JSON.stringify({ resolution: '2K', hasSpotlight: true }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'dev_v380_002',
      name: 'Farm Entrance - V380 Solar',
      platform: 'v380',
      uid: 'MV380-112233',
      ip: '10.0.0.15',
      rtspUrl: 'rtsp://admin:abcd1234@10.0.0.15:554/live/ch0',
      onvifPort: 80,
      username: 'admin',
      password: 'abcd1234',
      location: 'Farm Entrance',
      groupName: 'Farm',
      enabled: 1,
      config: JSON.stringify({ solar: true, battery: 78 }),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'dev_ubox_002',
      name: 'Warehouse - Ubox 4G',
      platform: 'ubox',
      uid: 'UBOX-777888-4G',
      ip: null,
      rtspUrl: null,
      onvifPort: 80,
      username: null,
      password: null,
      location: 'Warehouse Remote',
      groupName: 'Warehouse',
      enabled: 1,
      config: JSON.stringify({ network: '4G', sim: true }),
      createdAt: now,
      updatedAt: now
    }
  ];

  memory.devices = devices;
  memory.device_status = devices.map(d => ({
    deviceId: d.id,
    online: Math.random() > 0.2 ? 1 : 0,
    battery: Math.floor(20 + Math.random() * 80),
    charging: Math.random() > 0.5 ? 1 : 0,
    solarVoltage: 5 + Math.random() * 2,
    storageUsed: Math.floor(10000 + Math.random() * 50000),
    storageTotal: 128000,
    signal: Math.floor(40 + Math.random() * 60),
    lastSeen: now
  }));
  save(memory);
  console.log('[DB] Seeded 4 mock devices to', DB_PATH);
}

export function reloadDb() {
  memory = load();
}
