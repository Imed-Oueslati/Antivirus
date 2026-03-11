import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'

import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Users          from './pages/Users'

const Guard = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Toaster position="top-right" toastOptions={{
      style: { background:'#080f1e', color:'#dde8f5', border:'1px solid #0f1f35' }
    }} />
    <Routes>
      <Route path="/login"   element={<Login />} />
      <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/admin"   element={<Guard adminOnly><AdminDashboard /></Guard>} />
      <Route path="/users"   element={<Guard adminOnly><Users /></Guard>} />
      <Route path="*"        element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
)