import { useState, useEffect } from 'react'
import { RecordingClip } from '../types'
import { api } from '../services/api'
import { Calendar, Clock, Download, Play } from 'lucide-react'

export function PlaybackTimeline({ deviceId }: { deviceId: string }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [daysWithData, setDaysWithData] = useState<string[]>([])
  const [clips, setClips] = useState<RecordingClip[]>([])
  const [selectedClip, setSelectedClip] = useState<RecordingClip | null>(null)
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))

  useEffect(() => {
    api.getPlaybackDays(deviceId, month).then(r => setDaysWithData(r.days)).catch(() => {})
  }, [deviceId, month])

  useEffect(() => {
    setLoading(true)
    api.getPlayback(deviceId, selectedDate)
      .then(r => {
        setClips(r.clips)
        if (r.clips.length > 0) setSelectedClip(r.clips[0])
      })
      .catch(() => setClips([]))
      .finally(() => setLoading(false))
  }, [deviceId, selectedDate])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold tracking-widest text-zinc-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> PLAYBACK CALENDAR
          </h3>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white" />
        </div>
        
        <div className="grid grid-cols-7 gap-1.5">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-[10px] text-zinc-600 text-center py-1">{d}</div>
          ))}
          {(() => {
            const [y,m] = month.split('-').map(Number)
            const daysInMonth = new Date(y,m,0).getDate()
            const firstDay = new Date(y,m-1,1).getDay()
            const offset = firstDay === 0 ? 6 : firstDay - 1
            const cells = []
            for (let i=0;i<offset;i++) cells.push(<div key={`empty-${i}`} />)
            for (let d=1; d<=daysInMonth; d++) {
              const dateStr = `${month}-${String(d).padStart(2,'0')}`
              const hasData = daysWithData.includes(dateStr)
              const isSelected = dateStr === selectedDate
              cells.push(
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-xl text-xs font-medium border transition-all flex flex-col items-center justify-center gap-0.5
                    ${isSelected ? 'bg-white text-black border-white' : hasData ? 'bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600' : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-800'}`}
                >
                  <span>{d}</span>
                  {hasData && !isSelected && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                </button>
              )
            }
            return cells
          })()}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold tracking-widest text-zinc-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {selectedDate} • {clips.length} CLIPS
          </h3>
          <div className="flex gap-1.5">
            <span className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-full bg-zinc-500" /> Continuous</span>
            <span className="flex items-center gap-1 text-[10px]"><div className="w-2 h-2 rounded-full bg-amber-500" /> Motion</span>
          </div>
        </div>

        {/* Hour ruler */}
        <div className="relative h-12 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden mb-4">
          <div className="absolute inset-0 flex">
            {hours.map(h => (
              <div key={h} className="flex-1 border-r border-zinc-900/50 relative">
                {h % 3 === 0 && <span className="absolute -bottom-0 left-1 text-[9px] text-zinc-600 font-mono">{String(h).padStart(2,'0')}</span>}
              </div>
            ))}
          </div>
          {/* Clips */}
          <div className="absolute inset-0 top-2 bottom-4">
            {clips.map(clip => {
              const start = new Date(clip.startTime)
              const end = new Date(clip.endTime)
              const startMin = start.getHours() * 60 + start.getMinutes()
              const duration = (end.getTime() - start.getTime()) / 60000
              const left = (startMin / 1440) * 100
              const width = Math.max(0.5, (duration / 1440) * 100)
              const isSelected = selectedClip?.id === clip.id
              return (
                <button
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className={`absolute top-0 bottom-0 rounded-sm border transition-all ${isSelected ? 'ring-1 ring-white z-10' : ''} ${clip.type === 'motion' ? 'bg-amber-500/70 border-amber-400' : 'bg-zinc-600/70 border-zinc-500'}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${clip.type} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`}
                />
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-500 text-xs">Loading recordings...</div>
        ) : clips.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-xs">No recordings for this date</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {clips.map(clip => (
              <div
                key={clip.id}
                onClick={() => setSelectedClip(clip)}
                className={`group rounded-xl overflow-hidden border cursor-pointer transition-all ${selectedClip?.id === clip.id ? 'border-white bg-zinc-800' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}
              >
                <div className="aspect-video relative bg-zinc-900">
                  <img src={clip.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${clip.type === 'motion' ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{clip.type.toUpperCase()}</span>
                    <span className="text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded-full font-mono">{new Date(clip.startTime).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">{Math.floor((new Date(clip.endTime).getTime() - new Date(clip.startTime).getTime())/1000)}s • {(clip.size/1024/1024).toFixed(1)}MB</span>
                  <button className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700">
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player */}
      {selectedClip && (
        <div className="rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video relative">
          <img src={selectedClip.thumbnail} alt="playback" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-3">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <p className="text-sm text-white font-medium">Playback Preview</p>
              <p className="text-xs text-zinc-400 mt-1 font-mono">{selectedClip.startTime} → {selectedClip.endTime}</p>
              <p className="text-[10px] text-zinc-500 mt-2">In production, HLS clip streaming from device SD card via RTSP playback URL</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div className="h-full bg-white w-1/3" />
          </div>
        </div>
      )}
    </div>
  )
}
