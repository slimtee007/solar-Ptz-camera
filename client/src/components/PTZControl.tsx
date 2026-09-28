import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Home, Lightbulb, Siren, Scan } from 'lucide-react'
import { api } from '../services/api'

export function PTZControl({ deviceId }: { deviceId: string }) {
  const [active, setActive] = useState<string | null>(null)
  const [speed, setSpeed] = useState(50)
  const [light, setLight] = useState(false)
  const [siren, setSiren] = useState(false)

  const send = async (action: string) => {
    setActive(action)
    try {
      await api.ptz(deviceId, action, speed)
    } catch (e) {
      console.error(e)
    }
    setTimeout(() => setActive(null), 200)
  }

  const stop = async () => {
    try {
      await api.ptz(deviceId, 'stop')
    } catch {}
    setActive(null)
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold tracking-widest text-zinc-400">PTZ CONTROL</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">SPEED</span>
          <input type="range" min={10} max={100} value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-20 accent-white h-1" />
          <span className="text-[11px] font-mono text-white w-6">{speed}</span>
        </div>
      </div>

      {/* D-Pad */}
      <div className="flex justify-center">
        <div className="relative w-[180px] h-[180px]">
          <div className="absolute inset-0 rounded-full bg-zinc-950 border border-zinc-800" />
          
          <button
            onMouseDown={() => send('up')}
            onMouseUp={stop}
            onTouchStart={() => send('up')}
            onTouchEnd={stop}
            className={`absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-zinc-900 border flex items-center justify-center transition-all ${active === 'up' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          
          <button
            onMouseDown={() => send('left')}
            onMouseUp={stop}
            onTouchStart={() => send('left')}
            onTouchEnd={stop}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-zinc-900 border flex items-center justify-center transition-all ${active === 'left' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => send('home')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onMouseDown={() => send('right')}
            onMouseUp={stop}
            onTouchStart={() => send('right')}
            onTouchEnd={stop}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-zinc-900 border flex items-center justify-center transition-all ${active === 'right' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onMouseDown={() => send('down')}
            onMouseUp={stop}
            onTouchStart={() => send('down')}
            onTouchEnd={stop}
            className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-zinc-900 border flex items-center justify-center transition-all ${active === 'down' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Zoom & Presets */}
      <div className="grid grid-cols-2 gap-2">
        <button onMouseDown={() => send('zoomIn')} onMouseUp={stop} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-medium transition-all ${active === 'zoomIn' ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'}`}>
          <ZoomIn className="w-4 h-4" /> ZOOM IN
        </button>
        <button onMouseDown={() => send('zoomOut')} onMouseUp={stop} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-medium transition-all ${active === 'zoomOut' ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'}`}>
          <ZoomOut className="w-4 h-4" /> ZOOM OUT
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(n => (
          <button key={n} onClick={() => send(`preset${n}`)} className="py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-white hover:border-zinc-700">
            P{n}
          </button>
        ))}
      </div>

      <div className="pt-3 border-t border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const newState = !light
              setLight(newState)
              try { await api.setLight(deviceId, newState) } catch {}
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all ${light ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Lightbulb className="w-4 h-4" /> {light ? 'LIGHT ON' : 'LIGHT OFF'}
          </button>
          <button
            onClick={async () => {
              const newState = !siren
              setSiren(newState)
              try { await api.setSiren(deviceId, newState) } catch {}
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all ${siren ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Siren className="w-4 h-4" /> SIREN
          </button>
        </div>
        <button onClick={() => send('cruise')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-white">
          <Scan className="w-4 h-4" /> AUTO CRUISE / PATROL
        </button>
      </div>
    </div>
  )
}
