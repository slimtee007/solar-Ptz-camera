import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Device } from '../types'
import { api } from '../services/api'
import { Maximize2, Volume2, VolumeX, Circle, Loader2 } from 'lucide-react'

export function LivePlayer({ device, onFullscreen }: { device: Device, onFullscreen?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [streamInfo, setStreamInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    let hls: Hls | null = null
    let mounted = true

    async function loadStream() {
      setLoading(true)
      setError(null)
      try {
        const info = await api.getStream(device.id)
        if (!mounted) return
        setStreamInfo(info)

        // In mock mode, we don't have real HLS, show placeholder
        if (info.type === 'mock') {
          setLoading(false)
          return
        }

        const video = videoRef.current
        if (!video) return

        const hlsUrl = info.hlsUrl.startsWith('/') ? info.hlsUrl : `/hls/${device.id}/index.m3u8`
        
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: true })
          hls.loadSource(hlsUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {})
            setLoading(false)
          })
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              setError(`HLS error: ${data.type}`)
              setLoading(false)
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl
          video.addEventListener('loadedmetadata', () => {
            video.play().catch(() => {})
            setLoading(false)
          })
        } else {
          setError('HLS not supported in this browser')
          setLoading(false)
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message)
          setLoading(false)
        }
      }
    }

    loadStream()

    return () => {
      mounted = false
      if (hls) hls.destroy()
    }
  }, [device.id])

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video group">
      {/* Video or Mock Placeholder */}
      {streamInfo?.type === 'mock' ? (
        <div className="w-full h-full relative">
          <img src={`https://picsum.photos/seed/${device.id}live/1280/720`} alt="live" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Mock overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/70 backdrop-blur rounded-2xl px-6 py-4 border border-white/10 text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Circle className="w-6 h-6 text-white animate-pulse fill-white" />
              </div>
              <p className="text-sm font-medium text-white">MOCK LIVE - {device.name}</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px]">Enable RTSP in camera app and set MOCK_MODE=false to see real stream. HLS transcoding via FFmpeg.</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-2">{streamInfo.rtspUrl || 'rtsp://...'}</p>
            </div>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          muted={muted}
          playsInline
          controls={false}
        />
      )}

      {/* Loading */}
      {loading && streamInfo?.type !== 'mock' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="text-xs text-zinc-400">Connecting to {device.platform.toUpperCase()}...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-red-400">Stream Error</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
            <p className="text-[11px] text-zinc-600 mt-3 font-mono">{streamInfo?.rtspUrl}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </div>
          <span className="text-[11px] text-white/80 font-mono">{device.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onFullscreen} className="w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top info */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1 border border-white/10">
          <span className="text-[10px] font-mono text-white/70">{new Date().toLocaleString()}</span>
        </div>
        <div className="bg-black/60 backdrop-blur rounded-full px-2.5 py-1 border border-white/10">
          <span className="text-[10px] font-bold text-white tracking-wider">{device.platform.toUpperCase()} • {device.uid?.slice(0,8)}</span>
        </div>
      </div>
    </div>
  )
}
