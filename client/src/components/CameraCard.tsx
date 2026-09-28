import { Device } from '../types'
import { Battery, Signal, Sun, MapPin, Circle, Video, Zap } from 'lucide-react'
import { cn } from '../lib/utils'

export function CameraCard({ device, active, onClick }: { device: Device, active?: boolean, onClick?: () => void }) {
  const status = device.status as any
  const online = status?.online === 1 || status?.online === true
  const battery = status?.battery ?? 0
  const charging = status?.charging === 1 || status?.charging === true

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden border bg-zinc-900/50 cursor-pointer transition-all",
        active ? "border-white ring-1 ring-white" : "border-zinc-800 hover:border-zinc-700",
        !online && "opacity-70"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-950 relative overflow-hidden">
        <img
          src={`https://picsum.photos/seed/${device.id}/640/360`}
          alt={device.name}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <div className="flex gap-1.5">
            <span className={cn(
              "text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border backdrop-blur",
              device.platform === 'ubox' ? "bg-blue-500/20 border-blue-500/30 text-blue-300" :
              device.platform === 'v380' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
              "bg-zinc-500/20 border-zinc-500/30 text-zinc-300"
            )}>
              {device.platform.toUpperCase()}
            </span>
            {charging && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <Zap className="w-3 h-3" /> CHARGING
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-2.5 py-1 border border-white/10">
            <Circle className={cn("w-2 h-2 fill-current", online ? "text-emerald-400" : "text-red-400")} />
            <span className="text-[10px] font-medium text-white">{online ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-[13px] leading-tight text-white">{device.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <MapPin className="w-3 h-3" /> {device.location || device.groupName}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Video className="w-3 h-3" /> {device.uid?.slice(0,12)}
            </span>
          </div>
        </div>

        {/* PTZ indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="p-2.5 bg-zinc-900 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-400">
            <Battery className={cn("w-3.5 h-3.5", battery < 20 ? "text-red-400" : battery < 50 ? "text-amber-400" : "text-emerald-400")} />
            {battery}%
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Signal className="w-3.5 h-3.5" />
            {status?.signal ?? 0}%
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            {status?.solarVoltage ? `${status.solarVoltage.toFixed(1)}V` : 'Solar'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">
          {status?.storageUsed ? `${Math.floor(status.storageUsed/1000)}GB` : ''} / {status?.storageTotal ? `${Math.floor(status.storageTotal/1000)}GB` : '128GB'}
        </span>
      </div>
    </div>
  )
}
