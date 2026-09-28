const API_BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('solar_ptz_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers
  })
  if (res.status === 401) {
    // Clear token and redirect to login if not already
    localStorage.removeItem('solar_ptz_token')
    if (!window.location.pathname.includes('/login')) {
      // window.location.href = '/login'
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  // Handle blob responses (snapshots)
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('image/')) {
    return (await res.blob()) as any
  }
  return res.json()
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error('Failed')
  return await res.blob()
}

export const api = {
  // Auth
  login: (username: string, password: string) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data: any) => request<any>('/api/auth/register/public', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/api/auth/me'),
  getUsers: () => request<any[]>('/api/auth/users'),

  // Devices
  getDevices: () => request<any[]>('/api/devices'),
  getDevice: (id: string) => request<any>(`/api/devices/${id}`),
  createDevice: (data: any) => request<any>('/api/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id: string, data: any) => request<any>(`/api/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id: string) => request<any>(`/api/devices/${id}`, { method: 'DELETE' }),
  getStatus: (id: string) => request<any>(`/api/devices/${id}/status`),
  getStream: (id: string) => request<any>(`/api/devices/${id}/stream`),
  getSnapshot: (id: string) => requestBlob(`/api/devices/${id}/snapshot`),
  getSnapshotUrl: (id: string) => `${API_BASE}/api/devices/${id}/snapshot`,
  getSdCard: (id: string) => request<any>(`/api/devices/${id}/sdcard`),
  reboot: (id: string) => request<any>(`/api/devices/${id}/reboot`, { method: 'POST' }),
  getPresets: (id: string) => request<any>(`/api/devices/${id}/presets`),
  gotoPreset: (id: string, preset: string) => request<any>(`/api/devices/${id}/goto-preset`, { method: 'POST', body: JSON.stringify({ preset }) }),
  ptz: (id: string, action: string, speed?: number) => request<any>(`/api/devices/${id}/ptz`, { method: 'POST', body: JSON.stringify({ action, speed }) }),
  setLight: (id: string, on: boolean) => request<any>(`/api/devices/${id}/light`, { method: 'POST', body: JSON.stringify({ on }) }),
  setSiren: (id: string, on: boolean) => request<any>(`/api/devices/${id}/siren`, { method: 'POST', body: JSON.stringify({ on }) }),
  getPlaybackDays: (id: string, month: string) => request<{ month: string, days: string[] }>(`/api/devices/${id}/playback/days?month=${month}`),
  getPlayback: (id: string, date: string) => request<{ date: string, clips: any[] }>(`/api/devices/${id}/playback?date=${date}`),
  getEvents: (id: string, limit = 20) => request<any[]>(`/api/devices/${id}/events?limit=${limit}`),

  // ONVIF
  onvifDiscover: (timeout = 10000) => request<{ count: number, devices: any[] }>(`/api/onvif/discover?timeout=${timeout}`),
  onvifConnect: (data: any) => request<any>('/api/onvif/connect', { method: 'POST', body: JSON.stringify(data) }),
  onvifPtz: (data: any) => request<any>('/api/onvif/ptz', { method: 'POST', body: JSON.stringify(data) }),

  // Cloud
  v380Login: (username: string, password: string) => request<any>('/api/cloud/v380/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  v380Devices: (token: string) => request<any>(`/api/cloud/v380/devices?token=${token}`),
  v380Status: (ip: string, username?: string, password?: string) => request<any>(`/api/cloud/v380/${ip}/status?username=${username||''}&password=${password||''}`),
  v380Snapshot: (ip: string) => requestBlob(`/api/cloud/v380/${ip}/snapshot`),

  uboxLogin: (data: any) => request<any>('/api/cloud/ubox/login', { method: 'POST', body: JSON.stringify(data) }),
  uboxDevices: (token: string) => request<any>(`/api/cloud/ubox/devices?token=${token}`),
  uboxStatus: (uid: string, token: string) => request<any>(`/api/cloud/ubox/${uid}/status?token=${token}`),
  uboxStream: (uid: string, token: string) => request<any>(`/api/cloud/ubox/${uid}/stream?token=${token}`),
  gatewayInstructions: () => request<any>('/api/cloud/gateway/instructions'),

  getStats: () => request<any>('/api/stats'),
  getHealth: () => request<any>('/api/health'),
  getDocs: () => request<any>('/api/docs'),
}
