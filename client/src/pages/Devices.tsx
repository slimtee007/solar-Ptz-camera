import { useEffect, useState } from 'react'
import { useDevices } from '../hooks/useDevices'
import { api } from '../services/api'
import { Plus, Trash2, Edit, Battery, Signal, Sun, MapPin } from 'lucide-react'

export function Devices() {
  const { devices, fetchDevices } = useDevices()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>({ name: '', platform: 'ubox', uid: '', ip: '', rtspUrl: '', location: '', groupName: 'default', username: 'admin', password: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => { fetchDevices() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateDevice(editingId, form)
      } else {
        await api.createDevice(form)
      }
      setShowAdd(false)
      setEditingId(null)
      setForm({ name: '', platform: 'ubox', uid: '', ip: '', rtspUrl: '', location: '', groupName: 'default', username: 'admin', password: '' })
      fetchDevices()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEdit = (dev: any) => {
    setForm({
      name: dev.name,
      platform: dev.platform,
      uid: dev.uid || '',
      ip: dev.ip || '',
      rtspUrl: dev.rtspUrl || '',
      location: dev.location || '',
      groupName: dev.groupName || 'default',
      username: dev.username || 'admin',
      password: dev.password || ''
    })
    setEditingId(dev.id)
    setShowAdd(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete device?')) return
    await api.deleteDevice(id)
    fetchDevices()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Add Ubox or V380 solar PTZ cameras • RTSP / ONVIF / P2P UID</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Camera
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-[11px] tracking-widest text-zinc-500">
              <tr>
                <th className="text-left p-3 font-bold">DEVICE</th>
                <th className="text-left p-3 font-bold">PLATFORM</th>
                <th className="text-left p-3 font-bold">UID / IP</th>
                <th className="text-left p-3 font-bold">STATUS</th>
                <th className="text-left p-3 font-bold">SOLAR</th>
                <th className="text-right p-3 font-bold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(dev => {
                const s = dev.status as any
                return (
                  <tr key={dev.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={`https://picsum.photos/seed/${dev.id}/80/60`} className="w-12 h-9 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium text-white">{dev.name}</p>
                          <p className="text-[11px] text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {dev.location} • {dev.groupName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${dev.platform === 'ubox' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : dev.platform === 'v380' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300'}`}>
                        {dev.platform.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-mono text-xs text-white">{dev.uid || '--'}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{dev.ip || dev.rtspUrl?.slice(0,30) || 'P2P'}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s?.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs">{s?.online ? 'Online' : 'Offline'}</span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 ml-2"><Signal className="w-3 h-3" /> {s?.signal ?? 0}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> {s?.battery ?? 0}%</span>
                        <span className="flex items-center gap-1 text-amber-400"><Sun className="w-3 h-3" /> {s?.solarVoltage ? `${s.solarVoltage.toFixed(1)}V` : '--'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(dev)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(dev.id)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Camera' : 'Add New Camera'}</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">DEVICE NAME</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Front Gate Solar PTZ" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white" />
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">PLATFORM</label>
                <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                  <option value="ubox">Ubox</option>
                  <option value="v380">V380 / V380 Pro</option>
                  <option value="onvif">ONVIF</option>
                  <option value="rtsp">RTSP Generic</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">GROUP</label>
                <input value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} placeholder="Perimeter" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">UID / DEVICE ID (P2P)</label>
                <input value={form.uid} onChange={e => setForm({...form, uid: e.target.value})} placeholder="UBOX-123456-ABCDE or V380-..." className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none" />
                <p className="text-[10px] text-zinc-600 mt-1">Found in Ubox/V380 app → Device Settings → Device Info</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">LOCAL IP (optional)</label>
                <input value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} placeholder="192.168.1.100" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none" />
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">LOCATION</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Front Gate" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">RTSP URL (if enabled)</label>
                <input value={form.rtspUrl} onChange={e => setForm({...form, rtspUrl: e.target.value})} placeholder="rtsp://admin:pass@192.168.1.100:554/live/ch0" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none" />
                <p className="text-[10px] text-zinc-600 mt-1">Enable RTSP in camera app first. Ubox: Settings → Local → RTSP. V380: usually rtsp://admin:888888@ip:554/live/ch1</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">USERNAME</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">PASSWORD</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-sm font-medium hover:bg-zinc-700">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200">{editingId ? 'Update' : 'Add Camera'}</button>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-200">
              <strong>How to get UID:</strong> Open Ubox or V380 app → Device Settings → Device Info → Device ID / UID. For RTSP, enable in settings. For 4G solar cameras without local IP, use UID only - portal will use P2P relay (requires gateway SDK in production).
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
