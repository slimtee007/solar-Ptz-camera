export type Platform = 'ubox' | 'v380' | 'onvif' | 'rtsp' | 'generic'

export interface Device {
  id: string
  name: string
  platform: Platform
  uid: string | null
  ip: string | null
  rtspUrl: string | null
  location: string | null
  groupName: string | null
  config: any
  status?: DeviceStatus
  createdAt: string
}

export interface DeviceStatus {
  deviceId: string
  online: number | boolean
  battery: number
  charging: number | boolean
  solarVoltage?: number
  storageUsed?: number
  storageTotal?: number
  signal: number
  lastSeen: string
}

export interface RecordingClip {
  id: string
  startTime: string
  endTime: string
  type: 'continuous' | 'motion' | 'human' | 'pir'
  size: number
  thumbnail: string
  filePath?: string
}

export interface CameraEvent {
  id: string
  deviceId?: string
  deviceName?: string
  type: string
  timestamp: string
  thumbnail: string
  videoClip?: string
  metadata?: any
}
