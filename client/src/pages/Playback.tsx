import { useEffect } from 'react'
import { useDevices } from '../hooks/useDevices'
import { PlaybackTimeline } from '../components/PlaybackTimeline'
import { CameraCard } from '../components/CameraCard'

export function Playback() {
  const { devices, fetchDevices, selectedId, setSelected } = useDevices()

  useEffect(() => { fetchDevices() }, [])

  const selected = devices.find(d => d.id === selectedId) || devices[0]

  return (
    <div className="h-screen flex">
      <div className="w-[300px] border-r border-zinc-800 bg-[#111113] p-3 overflow-auto space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-zinc-500">SELECT CAMERA FOR PLAYBACK</h2>
        {devices.map(dev => (
          <div key={dev.id} onClick={() => setSelected(dev.id)} className="cursor-pointer">
            <CameraCard device={dev} active={dev.id === selected?.id} />
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6 bg-[#0a0a0b]">
        {selected ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold">Playback Review • {selected.name}</h1>
                <p className="text-xs text-zinc-500 mt-1">{selected.platform.toUpperCase()} • {selected.uid} • SD Card Recordings & Cloud</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[11px] px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">Calendar • Timeline • Clip Review</span>
              </div>
            </div>

            <PlaybackTimeline deviceId={selected.id} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Select a camera to review playback</div>
        )}
      </div>
    </div>
  )
}
