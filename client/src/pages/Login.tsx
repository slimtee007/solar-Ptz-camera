import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Lock, User, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

export function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.login(username, password)
      localStorage.setItem('solar_ptz_token', res.token)
      localStorage.setItem('solar_ptz_user', JSON.stringify(res.user))
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Sun className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Solar PTZ Central</h1>
          <p className="text-sm text-zinc-500 mt-1">Ubox + V380 Unified Portal • Production Ready</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <h2 className="font-bold text-white">Login</h2>
          
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div>
            <label className="text-[11px] tracking-widest text-zinc-500 font-bold">USERNAME</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-white" />
            </div>
          </div>

          <div>
            <label className="text-[11px] tracking-widest text-zinc-500 font-bold">PASSWORD</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-white" />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <p className="text-[11px] text-zinc-500">Default: <span className="font-mono text-zinc-300">admin / admin123</span> — change in production!</p>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-200">
              <strong>Mock Mode:</strong> Auth is bypassed when MOCK_MODE=true. In production (MOCK_MODE=false), JWT auth is enforced. Set JWT_SECRET env.
            </div>
          </div>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3 text-[11px]">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <p className="font-bold text-white">Production APIs</p>
            <p className="text-zinc-500 mt-1">ONVIF discovery, V380 local CGI (5050), Ubox local, RTSP→HLS, snapshots, SD card, cloud proxies</p>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <p className="font-bold text-white">Docs</p>
            <p className="text-zinc-500 mt-1">GET /api/docs for full endpoint list. See Settings for integration guide.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
