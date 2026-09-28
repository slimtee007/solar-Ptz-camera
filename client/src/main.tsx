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
  const token = localStorage.getItem('solar_ptz_token')
  const mockMode = true // In dev, allow bypass. In prod, check token
  // If you want to enforce auth even in mock mode, uncomment:
  // if (!token && !mockMode) { window.location.href = '/login'; return null }
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
