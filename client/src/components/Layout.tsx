import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Video, History, Settings, Cpu, Sun, Battery, Wifi } from 'lucide-react'
import { cn } from '../lib/utils'

const nav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live', label: 'Live View', icon: Video },
  { path: '/playback', label: 'Playback', icon: History },
  { path: '/devices', label: 'Devices', icon: Cpu },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-zinc-800 bg-[#111113] flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <Sun className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-[15px] leading-none">Solar PTZ</h1>
              <p className="text-[11px] text-zinc-500 mt-1 tracking-wide">CENTRAL • UBOX + V380</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <div className="flex items-center gap-1.5 text-[11px] bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              MOCK MODE
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Battery className="w-3 h-3" /> Solar
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            const active = loc.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                  active ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
              <span>SYSTEM HEALTH</span>
              <Wifi className="w-3 h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">P2P Gateway</span>
                <span className="text-emerald-400">Online</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">RTSP Proxy</span>
                <span className="text-emerald-400">Active</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">FFmpeg</span>
                <span className="text-zinc-500">Mock</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-3 text-center">v1.0 • Solar PTZ Central</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-[#0a0a0b]">
        {children}
      </main>
    </div>
  )
}
