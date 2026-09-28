import { useEffect, useState } from 'react'
import { api } from '../services/api'

export function Settings() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings & Integration Guide</h1>
        <p className="text-sm text-zinc-500 mt-1">How to connect real Ubox and V380 solar PTZ cameras to this central portal</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h3 className="font-bold text-sm mb-3">System Status</h3>
          <pre className="text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-auto text-zinc-400">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h3 className="font-bold text-sm mb-3">Environment</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">MOCK_MODE</span><span className="font-mono text-white">{health?.mockMode ? 'true (demo)' : 'false (real)'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">API Base</span><span className="font-mono text-white">/api</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">HLS Output</span><span className="font-mono text-white">{health?.hlsDir || './data/hls'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">WS</span><span className="font-mono text-white">/ws</span></div>
          </div>
          <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-200">
            Set <code className="bg-black/30 px-1 rounded">MOCK_MODE=false</code> in server/.env and restart to use real cameras. Requires FFmpeg installed for RTSP→HLS.
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
        <h2 className="font-bold">Integration Guide</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-blue-300">Ubox Solar PTZ</h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-400">
              <li>Install Ubox App and add camera normally</li>
              <li>Go to Device Settings → Device Info → copy UID (e.g., UBOX-XXXX)</li>
              <li>Enable RTSP: Settings → Local Settings / Advanced → RTSP ON. Note port 554, user/pass</li>
              <li>Common RTSP: <code className="bg-zinc-800 px-1 rounded font-mono">rtsp://admin:123456@IP:554/live/ch0</code></li>
              <li>In this portal → Devices → Add Camera → Platform: Ubox → paste UID + RTSP URL</li>
              <li>If camera is 4G remote (no local IP), use UID only. For production, you need a gateway that bridges Ubox P2P SDK (C lib) to RTSP. We provide adapter stub in <code className="bg-zinc-800 px-1 rounded">server/src/services/ubox</code></li>
            </ol>
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-500">
              <strong className="text-white">Reverse-engineered API:</strong> Some community projects have documented Ubox cloud endpoints. You can extend <code>UboxAdapter</code> to call <code>https://api.ubox.com</code> with app credentials. Check GitHub: ubox P2P.
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-emerald-300">V380 / V380 Pro Solar PTZ</h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-400">
              <li>Install V380 Pro App and add camera</li>
              <li>Device Info → Device ID. Also note local IP if on same WiFi</li>
              <li>V380 exposes HTTP CGI on port 5050: <code className="bg-zinc-800 px-1 rounded font-mono">http://IP:5050/cgi-bin/get_status.cgi</code></li>
              <li>RTSP: <code className="bg-zinc-800 px-1 rounded font-mono">rtsp://admin:888888@IP:554/live/ch1</code> (default pass 888888 or 123456)</li>
              <li>PTZ via CGI: <code className="bg-zinc-800 px-1 rounded font-mono">/cgi-bin/ptz.cgi?move=up</code></li>
              <li>In portal → Add Camera → Platform V380 → fill UID, IP, RTSP</li>
              <li>For 4G cameras, port forward or use P2P. Community lib: <code>open-ipcamera/v380</code> on GitHub</li>
            </ol>
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[11px] text-zinc-500">
              <strong className="text-white">Tip:</strong> Many V380 solar cams support ONVIF after enabling in app. Then you can use ONVIF adapter for PTZ and RTSP discovery.
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-sm font-bold mb-3">Recommended Production Architecture</h3>
          <pre className="text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-400 overflow-auto">
{`[Solar PTZ Cameras] --P2P--> [P2P Gateway / NVR Box with Ubox+V380 SDK] --RTSP--> [This Central Server: FFmpeg -> HLS] --WebSocket+HLS--> [Dashboard]

- For local WiFi cameras: Direct RTSP/ONVIF (simplest)
- For remote 4G solar cameras: 
   Option A: Use vendor cloud RTSP relay if available
   Option B: Deploy small gateway (Raspberry Pi / VPS) running P2P SDK that re-exposes RTSP
   Option C: Flash camera firmware to support RTSP (some models allow)

This portal already handles:
✓ Device registry (Ubox/V380/RTSP/ONVIF)
✓ RTSP -> HLS transcoding (ffmpeg)
✓ PTZ via adapter pattern
✓ Playback timeline (SD card via RTSP playback URL or cloud)
✓ Solar health (battery, charging, signal)
✓ Events / motion alerts via WS
`}
          </pre>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-sm font-bold mb-2">.env Example</h3>
          <pre className="text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-400">
{`PORT=3001
DB_PATH=./data/db.sqlite
MOCK_MODE=false
FFMPEG_PATH=ffmpeg
HLS_OUTPUT_DIR=./data/hls
ENABLE_TRANSCODING=true

# Optional - if you have reverse engineered credentials
UBOX_APP_KEY=
UBOX_APP_SECRET=
V380_API_URL=
`}
          </pre>
        </div>
      </div>
    </div>
  )
}
