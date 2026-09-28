import { create } from 'zustand'
import { Device, CameraEvent } from '../types'
import { api } from '../services/api'

interface DeviceStore {
  devices: Device[]
  selectedId: string | null
  events: CameraEvent[]
  stats: any
  loading: boolean
  fetchDevices: () => Promise<void>
  setSelected: (id: string | null) => void
  addEvent: (e: CameraEvent) => void
  fetchStats: () => Promise<void>
}

export const useDevices = create<DeviceStore>((set, get) => ({
  devices: [],
  selectedId: null,
  events: [],
  stats: null,
  loading: false,
  fetchDevices: async () => {
    set({ loading: true })
    try {
      const devices = await api.getDevices()
      set({ devices })
      if (!get().selectedId && devices.length > 0) {
        set({ selectedId: devices[0].id })
      }
    } finally {
      set({ loading: false })
    }
  },
  setSelected: (id) => set({ selectedId: id }),
  addEvent: (e) => set(state => ({ events: [e, ...state.events].slice(0, 50) })),
  fetchStats: async () => {
    const stats = await api.getStats()
    set({ stats })
  }
}))
