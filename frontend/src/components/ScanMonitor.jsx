import { useState, useEffect, useRef } from 'react'
import { scanAPI } from '../api'
import toast from 'react-hot-toast'

export default function ScanMonitor({ onThreatFound }) {
  const [scanning,    setScanning]    = useState(false)
  const [sessionId,   setSessionId]   = useState(null)
  const [elapsed,     setElapsed]     = useState(0)
  const [scanCount,   setScanCount]   = useState(0)
  const [threatCount, setThreatCount] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const startScan = async () => {
    try {
      const { data } = await scanAPI.startSession('realtime')
      setSessionId(data.id)
      setScanning(true)
      setElapsed(0)
      setScanCount(0)
      setThreatCount(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      toast.success('Real-time scan started')
    } catch (e) {
      toast.error('Could not start scan: ' + e.message)
    }
  }

  const stopScan = async () => {
    clearInterval(timerRef.current)
    if (sessionId) {
      await scanAPI.endSession(sessionId)
      toast('Scan session saved', { icon: '💾' })
    }
    setScanning(false)
    setSessionId(null)
  }

  const fmt = s => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h ? h + 'h ' : ''}${m}m ${sec}s`
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>
            {scanning
              ? <><span style={{ color: '#00ff88' }}>● </span>Scanning…</>
              : <><span style={{ color: '#64748b' }}>○ </span>Scanner Idle</>}
          </h2>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            {scanning ? `Running for ${fmt(elapsed)}` : 'Click Start to begin real-time protection'}
          </div>
        </div>
        <button
          className={`btn ${scanning ? 'btn-danger' : 'btn-success'}`}
          onClick={scanning ? stopScan : startScan}
          style={{ minWidth: 100 }}>
          {scanning ? '■ Stop' : '▶ Start'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Time Active',    value: fmt(elapsed),   color: '#00e5ff' },
          { label: 'Items Scanned',  value: scanCount,      color: '#00ff88' },
          { label: 'Threats Found',  value: threatCount,    color: threatCount > 0 ? '#f87171' : '#64748b' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#070d1a', borderRadius: 8, padding: '12px 16px',
            border: '1px solid #1a2540', textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>
              {s.value}
            </div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}