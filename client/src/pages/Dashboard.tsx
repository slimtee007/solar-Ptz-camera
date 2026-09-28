import { useEffect, useState } from 'react'
import { useDevices } from '../hooks/useDevices'
import { CameraCard } from '../components/CameraCard'
import { Battery, Signal, HardDrive, Cpu, AlertTriangle, Sun, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export function Dashboard() {
  const { devices, fetchDevices, fetchStats, stats } = useDevices()
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    fetchDevices()
    fetchStats()
    const iv = setInterval(() => { fetchDevices(); fetchStats() }, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (devices.length > 0) {
      Promise.all(devices.slice(0,2).map(d => api.getEvents(d.id, 3).catch(() => [])))
        .then(results => setEvents(results.flat().sort((a:any,b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,6)))
    }
  }, [devices])

  const online = devices.filter(d => (d.status as any)?.online)
  const lowBattery = devices.filter(d => (d.status as any)?.battery < 25)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solar PTZ Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Unified monitoring for Ubox and V380 solar cameras • {devices.length} devices • {online.length} online</p>
        </div>
        <div className="flex gap-2">
          <Link to="/live" className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200">Live Grid</Link>
          <Link to="/devices" className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium hover:bg-zinc-800">Manage Devices</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] tracking-widest text-zinc-500 font-bold">TOTAL DEVICES</span>
            <Cpu className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-2xl font-bold">{stats?.totalDevices ?? devices.length}</div>
          <div className="flex gap-2 mt-2 text-[11px]">
            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{stats?.platforms?.ubox ?? 0} UBOX</span>
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">{stats?.platforms?.v380 ?? 0} V380</span>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] tracking-widest text-zinc-500 font-bold">ONLINE STATUS</span>
            <Signal className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">{stats?.onlineDevices ?? online.length} <span className="text-sm font-normal text-zinc-500">/ {devices.length}</span></div>
          <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${devices.length ? (online.length/devices.length)*100 : 0}%` }} />
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] tracking-widest text-zinc-500 font-bold">SOLAR & BATTERY</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {devices.length ? Math.round(devices.reduce((a,d) => a + ((d.status as any)?.battery || 0),0)/devices.length) : 0}% <span className="text-xs font-normal text-zinc-500">avg</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <Zap className="w-3 h-3" /> {devices.filter(d => (d.status as any)?.charging).length} charging via solar
          </div>
          {lowBattery.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-red-400">
              <AlertTriangle className="w-3 h-3" /> {lowBattery.length} low battery
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] tracking-widest text-zinc-500 font-bold">STORAGE</span>
            <HardDrive className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-2xl font-bold">{stats ? `${Math.floor((stats.storageUsed||0)/1000)}GB` : '--'} <span className="text-xs font-normal text-zinc-500">/ {stats ? `${Math.floor((stats.storageTotal||0)/1000)}GB` : ''}</span></div>
          <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${stats ? (stats.storageUsed/stats.storageTotal)*100 : 30}%` }} />
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-zinc-400">CAMERA GRID • ALL PLATFORMS</h2>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Ubox</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> V380</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map(dev => (
            <Link key={dev.id} to={`/live?device=${dev.id}`}>
              <CameraCard device={dev} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-3">RECENT EVENTS • MOTION / HUMAN / PIR</h3>
          <div className="grid grid-cols-3 gap-3">
            {events.map((ev, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <div className="aspect-video relative">
                  <img src={ev.thumbnail} alt="event" className="w-full h-full object-cover" />
                  <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-1 rounded-full ${ev.type === 'human' ? 'bg-red-500 text-white' : ev.type === 'motion' ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-white'}`}>{ev.type.toUpperCase()}</span>
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-medium text-white truncate">{ev.deviceName || 'Camera'}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{new Date(ev.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-3">BATTERY HEALTH</h3>
          <div className="space-y-3">
            {devices.slice(0,5).map(dev => {
              const s = dev.status as any
              return (
                <div key={dev.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s?.battery < 25 ? 'bg-red-500/20 text-red-400' : s?.battery < 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      <Battery className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white leading-none">{dev.name.slice(0,18)}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{dev.platform.toUpperCase()} • {s?.charging ? 'Charging' : 'Discharging'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white">{s?.battery ?? 0}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
