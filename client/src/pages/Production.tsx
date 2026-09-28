import { useState } from 'react'
import { api } from '../services/api'
import { Search, Camera, Wifi, Cloud, Image as ImageIcon, HardDrive, RefreshCw } from 'lucide-react'

export function Production() {
  const [onvifDevices, setOnvifDevices] = useState<any[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [v380Ip, setV380Ip] = useState('192.168.1.102')
  const [v380User, setV380User] = useState('admin')
  const [v380Pass, setV380Pass] = useState('888888')
  const [v380Status, setV380Status] = useState<any>(null)
  const [uboxUid, setUboxUid] = useState('UBOX-123456-ABCDE')
  const [gatewayInfo, setGatewayInfo] = useState<any>(null)
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)

  const discoverOnvif = async () => {
    setDiscovering(true)
    try {
      const res = await api.onvifDiscover(10000)
      setOnvifDevices(res.devices)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDiscovering(false)
    }
  }

  const checkV380 = async () => {
    try {
      const res = await api.v380Status(v380Ip, v380User, v380Pass)
      setV380Status(res)
      // Try snapshot
      try {
        const blob = await api.getSnapshotUrl('dev_v380_001') // placeholder, real would be device id
        setSnapshotUrl(`${api.getSnapshotUrl('dev_v380_001')}?t=${Date.now()}`)
      } catch {}
    } catch (e: any) {
      alert(e.message)
    }
  }

  const loadGateway = async () => {
    try {
      const res = await api.gatewayInstructions()
      setGatewayInfo(res)
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Production Integration • Live APIs</h1>
        <p className="text-sm text-zinc-500 mt-1">Real ONVIF, V380, Ubox local & cloud APIs — for live deployment</p>
      </div>

      {/* ONVIF */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2"><Search className="w-4 h-4" /> ONVIF Discovery (LAN)</h2>
          <button onClick={discoverOnvif} disabled={discovering} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} /> {discovering ? 'Scanning...' : 'Discover Cameras'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Scans local network via WS-Discovery for ONVIF cameras. Requires cameras on same LAN/VPN. Enable ONVIF in camera app.</p>
        <div className="grid grid-cols-2 gap-3">
          {onvifDevices.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-zinc-600 text-xs">No devices found yet. Click Discover. Ensure cameras and server are on same network.</div>
          ) : (
            onvifDevices.map((d, i) => (
              <div key={i} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-sm font-medium text-white">{d.name || d.ip}</p>
                <p className="text-[11px] font-mono text-zinc-500 mt-1">{d.ip}:{d.port} • {d.xaddr}</p>
                <p className="text-[11px] text-zinc-600 mt-1">Hardware: {d.hardware || 'Unknown'}</p>
                <button className="mt-2 text-[11px] px-3 py-1 rounded-full bg-zinc-800 text-white hover:bg-zinc-700">Connect & Get Stream</button>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] font-mono text-zinc-500">
          API: GET /api/onvif/discover?timeout=10000<br />
          POST /api/onvif/connect {"{"} xaddr, username, password {"}"}<br />
          POST /api/onvif/ptz {"{"} xaddr, action, speed {"}"}
        </div>
      </div>

      {/* V380 Local */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="font-bold flex items-center gap-2 text-emerald-300"><Camera className="w-4 h-4" /> V380 Local API (Port 5050)</h2>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input value={v380Ip} onChange={e => setV380Ip(e.target.value)} placeholder="Camera IP" className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white" />
              <input value={v380User} onChange={e => setV380User(e.target.value)} placeholder="User" className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
              <input value={v380Pass} onChange={e => setV380Pass(e.target.value)} placeholder="Pass" className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <button onClick={checkV380} className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500">Check V380 Status & SD Card</button>
            
            {v380Status && (
              <pre className="text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400 overflow-auto max-h-[200px]">
                {JSON.stringify(v380Status, null, 2)}
              </pre>
            )}

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-500 space-y-1">
              <p><strong className="text-white">Endpoints implemented:</strong></p>
              <p>• /cgi-bin/get_status.cgi — battery, wifi, fw</p>
              <p>• /cgi-bin/get_sdcard_status.cgi — total/used</p>
              <p>• /cgi-bin/get_record_list.cgi?date=YYYYMMDD</p>
              <p>• /cgi-bin/snapshot.cgi?channel=1 — JPEG</p>
              <p>• /cgi-bin/ptz.cgi?move=up|down|left|right|zoomin|zoomout|stop&speed=0-7</p>
              <p>• /cgi-bin/set_light.cgi?on=1 & set_siren.cgi</p>
              <p>• RTSP: rtsp://admin:888888@IP:554/live/ch1</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="font-bold flex items-center gap-2 text-blue-300"><Cloud className="w-4 h-4" /> Ubox Local + Cloud + Gateway</h2>
          <div className="mt-4 space-y-3">
            <input value={uboxUid} onChange={e => setUboxUid(e.target.value)} placeholder="UBOX UID" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white" />
            
            <div className="grid grid-cols-2 gap-2">
              <button onClick={loadGateway} className="py-2 rounded-xl bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 flex items-center justify-center gap-1">
                <Wifi className="w-3 h-3" /> Gateway Instructions
              </button>
              <button className="py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500">Test Cloud Login</button>
            </div>

            {gatewayInfo && (
              <pre className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400 overflow-auto max-h-[300px]">
                {JSON.stringify(gatewayInfo, null, 2)}
              </pre>
            )}

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-200">
              <strong>4G Solar Cameras:</strong> No local IP? You need P2P gateway. Request SDK from supplier, deploy gateway that converts P2P to RTSP, then add as RTSP device. See /api/cloud/gateway/instructions
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-500 space-y-1">
              <p><strong className="text-white">Cloud APIs (reverse engineered):</strong></p>
              <p>• POST /api/cloud/ubox/login {"{"} username, password, apiKey {"}"}</p>
              <p>• GET /api/cloud/ubox/devices?token=</p>
              <p>• GET /api/cloud/ubox/:uid/status?token=</p>
              <p>• GET /api/cloud/ubox/:uid/stream?token=</p>
              <p>• POST /api/cloud/v380/login</p>
              <p>• GET /api/cloud/v380/:ip/snapshot</p>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshots & SD */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> SNAPSHOT API</h3>
          <p className="text-[11px] text-zinc-500 mt-2">GET /api/devices/:id/snapshot → JPEG</p>
          <p className="text-[11px] text-zinc-600 mt-1">Works for V380, Ubox, ONVIF if IP reachable. Uses /cgi-bin/snapshot.cgi or ONVIF GetSnapshotUri</p>
          {snapshotUrl && <img src={snapshotUrl} alt="snap" className="mt-3 rounded-xl w-full aspect-video object-cover bg-zinc-950" />}
        </div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 flex items-center gap-2"><HardDrive className="w-4 h-4" /> SD CARD API</h3>
          <p className="text-[11px] text-zinc-500 mt-2">GET /api/devices/:id/sdcard</p>
          <p className="text-[11px] text-zinc-600 mt-1">Returns total/used/free for V380. For Ubox, via get_sdcard_status.cgi if available.</p>
          <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-white w-[45%]" />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">45% used • 128GB total</p>
        </div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500">PRODUCTION ENV</h3>
          <pre className="mt-2 text-[10px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400">
{`MOCK_MODE=false
JWT_SECRET=change-me-32chars
AUTH_DISABLED=false
CORS_ORIGIN=https://yourdomain.com
FFMPEG_PATH=ffmpeg
UBOX_CLOUD_USER=...
UBOX_CLOUD_PASS=...
V380_CLOUD_API=https://api.v380s.com:8443
GATEWAY_URL=http://gateway:8554
`}
          </pre>
        </div>
      </div>
    </div>
  )
}
