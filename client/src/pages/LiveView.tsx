import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDevices } from '../hooks/useDevices'
import { LivePlayer } from '../components/LivePlayer'
import { CameraCard } from '../components/CameraCard'
import { PTZControl } from '../components/PTZControl'
import { LayoutGrid, Maximize2 } from 'lucide-react'

export function LiveView() {
  const { devices, fetchDevices, selectedId, setSelected } = useDevices()
  const [searchParams, setSearchParams] = useSearchParams()
  const [layout, setLayout] = useState<1|4|9>(1)
  const [fullscreenDevice, setFullscreenDevice] = useState<string | null>(null)

  useEffect(() => { fetchDevices() }, [])

  useEffect(() => {
    const devParam = searchParams.get('device')
    if (devParam) setSelected(devParam)
  }, [searchParams])

  const selectedDevice = devices.find(d => d.id === selectedId) || devices[0]
  const gridDevices = layout === 1 ? (selectedDevice ? [selectedDevice] : []) : devices.slice(0, layout)

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-sm tracking-wide">LIVE MONITORING</h1>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-full p-1">
            {[1,4,9].map(n => (
              <button
                key={n}
                onClick={() => setLayout(n as any)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${layout === n ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-mono">{devices.length} CAMS • {devices.filter(d => (d.status as any)?.online).length} LIVE</span>
          <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main player area */}
        <div className="flex-1 bg-black p-3 overflow-auto">
          {layout === 1 && selectedDevice ? (
            <div className="h-full flex flex-col gap-3">
              <LivePlayer device={selectedDevice} onFullscreen={() => setFullscreenDevice(selectedDevice.id)} />
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <span className="text-zinc-500">PLATFORM</span>
                  <p className="text-white font-bold mt-1">{selectedDevice.platform.toUpperCase()} • {selectedDevice.uid}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <span className="text-zinc-500">NETWORK</span>
                  <p className="text-white font-bold mt-1">{(selectedDevice.status as any)?.signal ?? 0}% • {selectedDevice.ip || 'P2P Relay'}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <span className="text-zinc-500">BATTERY</span>
                  <p className="text-white font-bold mt-1">{(selectedDevice.status as any)?.battery ?? 0}% • {(selectedDevice.status as any)?.charging ? 'Charging' : 'Discharging'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 h-full ${layout === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {gridDevices.map(dev => (
                <div key={dev.id} className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <LivePlayer device={dev} />
                </div>
              ))}
              {Array.from({ length: Math.max(0, layout - gridDevices.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                  No Camera
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[320px] border-l border-zinc-800 bg-[#111113] flex flex-col">
          {selectedDevice && layout === 1 && (
            <div className="p-3 border-b border-zinc-800">
              <PTZControl deviceId={selectedDevice.id} />
            </div>
          )}

          <div className="flex-1 overflow-auto p-3 space-y-3">
            <h3 className="text-[11px] font-bold tracking-widest text-zinc-500">CAMERAS • {devices.length}</h3>
            {devices.map(dev => (
              <div
                key={dev.id}
                onClick={() => {
                  setSelected(dev.id)
                  setSearchParams({ device: dev.id })
                  if (layout !== 1) setLayout(1)
                }}
                className="cursor-pointer"
              >
                <CameraCard device={dev} active={dev.id === selectedId} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreenDevice && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
            <span className="text-sm font-medium">{devices.find(d => d.id === fullscreenDevice)?.name}</span>
            <button onClick={() => setFullscreenDevice(null)} className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            {devices.find(d => d.id === fullscreenDevice) && (
              <LivePlayer device={devices.find(d => d.id === fullscreenDevice)!} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
