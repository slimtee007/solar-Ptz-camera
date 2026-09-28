import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { LiveView } from './pages/LiveView'
import { Playback } from './pages/Playback'
import { Devices } from './pages/Devices'
import { Settings } from './pages/Settings'
import { Production } from './pages/Production'
import { Login } from './pages/Login'
import './index.css'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const token = localStorage.getItem('solar_ptz_token')
    if (token) {
      setReady(true)
      return
    }
    // Auto-login with default admin/admin123 for mock mode / first run
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('solar_ptz_token', data.token)
          localStorage.setItem('solar_ptz_user', JSON.stringify(data.user))
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-zinc-500 text-sm">
        Connecting to API server...
      </div>
    )
  }

  return <Layout>{children}</Layout>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveView />} />
              <Route path="/playback" element={<Playback />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/production" element={<Production />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </ProtectedLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
