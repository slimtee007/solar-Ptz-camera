import { useEffect, useState } from 'react'
import { useDevices } from '../hooks/useDevices'
import { api } from '../services/api'
import { Plus, Trash2, Edit, Battery, Signal, Sun, MapPin, AlertTriangle, Wifi, CheckCircle } from 'lucide-react'

export function Devices() {
  const { devices, fetchDevices } = useDevices()
  const [showAdd, setShowAdd] = useState(false)
  const [serverOnline, setServerOnline] = useState<boolean | null>(null)
  const [form, setForm] = useState<any>({ 
    name: '', 
    platform: 'ubox', 
    uid: '', 
    ip: '', 
    rtspUrl: '', 
    location: '', 
    groupName: 'default', 
    username: 'admin', 
    password: '',
    cloudUsername: '',
    cloudPassword: ''
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => { 
    // Try auto-login first if no token
    const ensureAuth = async () => {
      if (!localStorage.getItem('solar_ptz_token')) {
        try {
          const res = await api.login('admin', 'admin123')
          localStorage.setItem('solar_ptz_token', res.token)
        } catch {}
      }
      fetchDevices().catch(() => setServerOnline(false))
      api.getHealth().then(() => setServerOnline(true)).catch(() => setServerOnline(false))
    }
    ensureAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Validate: username should NOT be email for local auth
      if (form.username.includes('@')) {
        if (!confirm('Username looks like an email. For camera local login, use "admin" not your Ubox/V380 app email. Your app email should go in Production APIs > Cloud Login. Continue anyway?')) {
          return
        }
      }

      const payload = {
        name: form.name,
        platform: form.platform,
        uid: form.uid,
        ip: form.ip || undefined,
        rtspUrl: form.rtspUrl || undefined,
        location: form.location,
        groupName: form.groupName,
        username: form.username,
        password: form.password,
        config: JSON.stringify({
          cloudUsername: form.cloudUsername || undefined,
          cloudPassword: form.cloudPassword || undefined
        })
      }

      if (editingId) {
        await api.updateDevice(editingId, payload)
      } else {
        await api.createDevice(payload)
      }
      setShowAdd(false)
      setEditingId(null)
      setForm({ name: '', platform: 'ubox', uid: '', ip: '', rtspUrl: '', location: '', groupName: 'default', username: 'admin', password: '', cloudUsername: '', cloudPassword: '' })
      fetchDevices()
    } catch (err: any) {
      alert(`Failed to add camera: ${err.message}\n\nTip: Make sure API server is running on port 3001. Run: npm run dev --workspace=server`)
    }
  }

  const handleEdit = (dev: any) => {
    const cfg = dev.config ? (typeof dev.config === 'string' ? JSON.parse(dev.config) : dev.config) : {}
    setForm({
      name: dev.name,
      platform: dev.platform,
      uid: dev.uid || '',
      ip: dev.ip || '',
      rtspUrl: dev.rtspUrl || '',
      location: dev.location || '',
      groupName: dev.groupName || 'default',
      username: dev.username || 'admin',
      password: dev.password || '',
      cloudUsername: cfg.cloudUsername || '',
      cloudPassword: cfg.cloudPassword || ''
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
      {/* Server status banner */}
      {serverOnline === false && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm text-red-300">API Server Offline - ECONNREFUSED</h3>
            <p className="text-xs text-red-200/70 mt-1">Vite proxy cannot reach http://localhost:3001. This is why you see AggregateError [ECONNREFUSED] in your terminal.</p>
            <div className="mt-3 rounded-xl bg-black/30 p-3 text-[11px] font-mono text-zinc-300">
              <p className="font-bold text-white mb-1">Fix - Run both servers:</p>
              <p># Terminal 1 - API Server (port 3001):</p>
              <p className="text-emerald-400">npm run dev --workspace=server</p>
              <p className="mt-2"># Terminal 2 - Client (port 5173):</p>
              <p className="text-emerald-400">npm run dev --workspace=client</p>
              <p className="mt-2"># Or both at once from root:</p>
              <p className="text-emerald-400">npm run dev</p>
              <p className="mt-2"># Check if running:</p>
              <p className="text-zinc-400">curl http://localhost:3001/api/health</p>
              <p>netstat -ano | findstr :3001  (Windows)</p>
            </div>
          </div>
        </div>
      )}

      {serverOnline === true && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4" /> API Server Online (3001) • Ready to add cameras
        </div>
      )}

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
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-600 text-xs">
                    {serverOnline === false ? 'Server offline - cannot load devices' : 'No devices yet. Click Add Camera.'}
                  </td>
                </tr>
              ) : devices.map(dev => {
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

      {/* Add/Edit Modal - Improved */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4 overflow-auto">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 my-8 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Camera' : 'Add New Camera'}</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">DEVICE NAME *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Front Gate Solar PTZ" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white" />
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">PLATFORM *</label>
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
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">UID / DEVICE ID (P2P) *</label>
                <input value={form.uid} onChange={e => setForm({...form, uid: e.target.value})} required placeholder="EU5HHJSOUDZUU2U1FIGFA or UBOX-123456" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-white" />
                <p className="text-[10px] text-zinc-500 mt-1">From your screenshot: <span className="font-mono text-white">EU5HHJSOUDZUU2U1FIGFA</span> is correct! Found in Ubox/V380 app → Device Settings → Device Info</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">LOCAL IP (optional)</label>
                <input value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} placeholder="192.168.1.100" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none" />
                <p className="text-[10px] text-zinc-600 mt-1">Only if camera on same WiFi as server. Leave empty for 4G remote.</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">LOCATION</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Front Gate" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">RTSP URL (if enabled - optional)</label>
                <input value={form.rtspUrl} onChange={e => setForm({...form, rtspUrl: e.target.value})} placeholder="rtsp://admin:123456@192.168.1.100:554/live/ch0" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none" />
                <p className="text-[10px] text-zinc-500 mt-1">Enable in camera app first. Ubox: Settings → Local → RTSP. V380: usually <span className="font-mono">rtsp://admin:888888@ip:554/live/ch1</span></p>
              </div>

              <div className="col-span-2 border-t border-zinc-800 pt-3 mt-1">
                <p className="text-[11px] font-bold tracking-widest text-zinc-400 mb-2 flex items-center gap-2"><Wifi className="w-3 h-3" /> CAMERA LOCAL LOGIN (NOT app email!)</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">CAMERA USERNAME</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="admin" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
                <p className="text-[10px] text-amber-400 mt-1">⚠️ Use "admin" not email! From screenshot you used email - wrong. Camera login is admin/123456 or admin/888888</p>
              </div>
              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">CAMERA PASSWORD</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="123456 or 888888" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
                <p className="text-[10px] text-zinc-600 mt-1">Default V380: 888888, Ubox: 123456 or admin</p>
              </div>

              <div className="col-span-2 border-t border-zinc-800 pt-3 mt-1">
                <p className="text-[11px] font-bold tracking-widest text-zinc-400 mb-2">CLOUD ACCOUNT (optional - for P2P remote)</p>
              </div>

              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">UBOX/V380 APP EMAIL</label>
                <input value={form.cloudUsername} onChange={e => setForm({...form, cloudUsername: e.target.value})} placeholder="ishaqt...@gmail.com" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
                <p className="text-[10px] text-zinc-500 mt-1">Your app login - from screenshot: ishaqtesleem@gmail.com goes HERE, not in camera username!</p>
              </div>
              <div>
                <label className="text-[11px] tracking-widest text-zinc-500 font-bold">APP PASSWORD</label>
                <input type="password" value={form.cloudPassword} onChange={e => setForm({...form, cloudPassword: e.target.value})} placeholder="App password" className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-sm font-medium hover:bg-zinc-700">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200">{editingId ? 'Update' : 'Add Camera'}</button>
            </div>

            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-200">
              <strong className="text-blue-100">Your Screenshot Fix:</strong><br/>
              • UID <span className="font-mono text-white">EU5HHJSOUDZUU2U1FIGFA</span> ✅ Correct<br/>
              • Local IP 192.168.1.100 - only if camera actually at that IP and same WiFi as PC<br/>
              • RTSP URL - leave empty for now if not sure, or use <span className="font-mono">rtsp://admin:888888@192.168.1.100:554/live/ch1</span> for V380<br/>
              • Username: Change from <span className="font-mono">ishaqtesleem@gmail.com</span> ❌ to <span className="font-mono text-white">admin</span> ✅<br/>
              • Password: Camera password (888888 or 123456) not app password<br/>
              • App Email/Password: Put your Ubox app credentials in Cloud section for P2P remote access
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
