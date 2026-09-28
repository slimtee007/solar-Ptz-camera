import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Device } from '../types'
import { api } from '../services/api'
import { Maximize2, Volume2, VolumeX, Circle, Loader2, Wifi, Settings } from 'lucide-react'

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

        // In mock or p2p mode, show helpful placeholder
        if (info.type === 'mock' || info.rtspUrl?.startsWith('p2p://')) {
          setLoading(false)
          if (info.rtspUrl?.startsWith('p2p://')) {
            setError(`HLS error: networkError`)
          }
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

  const isP2P = streamInfo?.rtspUrl?.startsWith('p2p://')

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video group">
      {/* Video or Mock/P2P Placeholder */}
      {streamInfo?.type === 'mock' || isP2P ? (
        <div className="w-full h-full relative">
          <img src={`https://picsum.photos/seed/${device.id}live/1280/720`} alt="live" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          
          {/* P2P / Mock overlay with helpful setup */}
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="bg-black/85 backdrop-blur-xl rounded-2xl px-5 py-4 border border-white/10 text-center max-w-[440px] w-full max-h-[90%] overflow-auto">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isP2P ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/10'}`}>
                <Circle className={`w-6 h-6 animate-pulse fill-current ${isP2P ? 'text-amber-400' : 'text-white'}`} />
              </div>
              <p className="text-sm font-bold text-white">{device.name} • {device.platform.toUpperCase()} {isP2P ? 'P2P Mode' : 'Mock'}</p>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">{device.uid?.slice(0,20)}</p>
              
              {isP2P && (
                <>
                  <div className="mt-4 text-left rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1"><Wifi className="w-3 h-3" /> Why Stream Error? p2p:// URL</p>
                    <p className="text-[11px] text-zinc-400">Your camera <span className="text-white font-mono">{device.uid?.slice(0,14)}...</span> is 4G solar using Ubox P2P. No local RTSP reachable from PC (toll gate remote).</p>
                    <div className="text-[10px] text-zinc-500 font-mono bg-black/60 rounded-lg p-2 mt-2 break-all">
                      Current: {streamInfo?.rtspUrl}<br/>
                      Error: {error || 'networkError - no FFmpeg source'}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                      <p className="text-[10px] font-bold text-emerald-300">Option 1: Enable RTSP</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Ubox App → Settings → Local → Enable RTSP. Then Devices → Edit → Add RTSP URL: rtsp://admin:pass@IP:554/live/ch0</p>
                    </div>
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5">
                      <p className="text-[10px] font-bold text-blue-300">Option 2: Same WiFi</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Connect PC to same WiFi as camera. Find camera IP in router, use admin/888888</p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-left">
                    <p className="text-[10px] font-bold text-amber-300">Option 3: Remote 4G (Toll Gate)</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Deploy P2P gateway (requires Ubox SDK from supplier) or use cloud relay. See Production APIs → Gateway Instructions.</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => window.location.href = '/devices'} className="flex-1 py-2.5 rounded-xl bg-white text-black text-[11px] font-bold flex items-center justify-center gap-1"><Settings className="w-3 h-3" /> Edit → Add RTSP URL</button>
                    <button onClick={() => window.location.href = '/production'} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white text-[11px] font-medium border border-zinc-700">Gateway Guide</button>
                  </div>

                  <p className="text-[10px] text-zinc-500 mt-3">PTZ controls on right still work via cloud API even without video. Try pan/tilt!</p>
                </>
              )}

              {!isP2P && (
                <>
                  <p className="text-[11px] text-zinc-400 mt-2 max-w-[280px] mx-auto">Enable RTSP in camera app and set MOCK_MODE=false to see real stream. HLS transcoding via FFmpeg.</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-2">{streamInfo?.rtspUrl || 'rtsp://...'}</p>
                </>
              )}
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
      {loading && streamInfo?.type !== 'mock' && !isP2P && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="text-xs text-zinc-400">Connecting to {device.platform.toUpperCase()}...</span>
          </div>
        </div>
      )}

      {/* Error for non-p2p */}
      {error && !isP2P && streamInfo?.type !== 'mock' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-red-400">Stream Error</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
            <p className="text-[11px] text-zinc-600 mt-3 font-mono break-all">{streamInfo?.rtspUrl}</p>
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
