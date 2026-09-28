const API_BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  getDevices: () => request<any[]>('/api/devices'),
  getDevice: (id: string) => request<any>(`/api/devices/${id}`),
  createDevice: (data: any) => request<any>('/api/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id: string, data: any) => request<any>(`/api/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id: string) => request<any>(`/api/devices/${id}`, { method: 'DELETE' }),
  getStatus: (id: string) => request<any>(`/api/devices/${id}/status`),
  getStream: (id: string) => request<any>(`/api/devices/${id}/stream`),
  ptz: (id: string, action: string, speed?: number) => request<any>(`/api/devices/${id}/ptz`, { method: 'POST', body: JSON.stringify({ action, speed }) }),
  setLight: (id: string, on: boolean) => request<any>(`/api/devices/${id}/light`, { method: 'POST', body: JSON.stringify({ on }) }),
  setSiren: (id: string, on: boolean) => request<any>(`/api/devices/${id}/siren`, { method: 'POST', body: JSON.stringify({ on }) }),
  getPlaybackDays: (id: string, month: string) => request<{ month: string, days: string[] }>(`/api/devices/${id}/playback/days?month=${month}`),
  getPlayback: (id: string, date: string) => request<{ date: string, clips: any[] }>(`/api/devices/${id}/playback?date=${date}`),
  getEvents: (id: string, limit = 20) => request<any[]>(`/api/devices/${id}/events?limit=${limit}`),
  getStats: () => request<any>('/api/stats'),
  getHealth: () => request<any>('/api/health'),
}
