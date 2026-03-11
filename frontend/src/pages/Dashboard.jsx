import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import Navbar      from '../components/Navbar'
import ScanMonitor from '../components/ScanMonitor'
import ThreatCard  from '../components/ThreatCard'
import { scanAPI, userAPI } from '../api'

const socket = io('http://localhost:4000')

export default function Dashboard() {
  const [threats,     setThreats]     = useState([])
  const [myStats,     setMyStats]     = useState({})
  const [usbDrive,    setUsbDrive]    = useState(null)
  const [usbScanning, setUsbScanning] = useState(false)
  const [usbResults,  setUsbResults]  = useState(null)

  const reload = () => {
    scanAPI.getThreats().then(r => setThreats(r.data)).catch(() => {})
    userAPI.getMyStats().then(r => setMyStats(r.data)).catch(() => {})
  }

  useEffect(() => {
    reload()

    socket.on('threat_detected', data => {
      toast.error(
        `🚨 ${data.threat_type?.toUpperCase()} detected!\n${data.filename}\n📁 ${data.filepath || ''}`,
        { duration: 8000 }
      )
      reload()
    })

    socket.on('usb_detected', data => {
      setUsbDrive(data.drive)
      toast(`💾 USB detected: ${data.drive}`, { icon:'🔌', duration: 5000 })
      // Auto-scan immediately
      handleUsbScan(data.drive)
    })

    socket.on('usb_removed', () => {
      setUsbDrive(null)
      setUsbResults(null)
    })

    return () => {
      socket.off('threat_detected')
      socket.off('usb_detected')
      socket.off('usb_removed')
    }
  }, [])

  const handleUsbScan = async (drive) => {
    setUsbScanning(true)
    setUsbResults(null)
    toast.loading(`Scanning USB ${drive}…`, { id: 'usb-scan' })
    try {
      const { data } = await scanAPI.scanUsb(drive)
      setUsbResults(data)
      toast.success(
        data.threats.length > 0
          ? `⚠️ ${data.threats.length} threats found and blocked on ${drive}`
          : `✅ USB ${drive} is clean — ${data.scanned} files scanned`,
        { id: 'usb-scan', duration: 8000 }
      )
      reload()
    } catch (e) {
      toast.error('USB scan failed: ' + e.message, { id: 'usb-scan' })
    } finally {
      setUsbScanning(false)
    }
  }

  const statItems = [
    { label:'Scan Time',      value:`${myStats.days||0}d ${myStats.minutes||0}m ${myStats.seconds||0}s`, color:'#00d4ff' },
    { label:'Sessions',       value: myStats.total_sessions || 0,       color:'#00ff9d' },
    { label:'Threats Found',  value: myStats.total_threats_found || 0,  color:'#ff4d6d' },
    { label:'Blocked',        value: threats.filter(t=>t.is_blocked).length, color:'#b06aff' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#04080f' }}>
      <Navbar />
      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 20px' }}>

        {/* USB alert banner */}
        {usbDrive && (
          <div style={{ background:'#ffcc0015', border:'1px solid #ffcc0044',
            borderRadius:10, padding:'14px 20px', marginBottom:20,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ color:'#ffcc00', fontWeight:700 }}>
                💾 USB detected: {usbDrive}
              </span>
              <span style={{ color:'#4a6080', fontSize:12, marginLeft:12 }}>
                {usbScanning ? '⏳ Scanning in progress…' : usbResults
                  ? `✅ Done — ${usbResults.scanned} files scanned, ${usbResults.threats.length} threats`
                  : 'Auto-scan triggered'}
              </span>
            </div>
            {!usbScanning && (
              <button onClick={() => handleUsbScan(usbDrive)}
                style={{ background:'#ffcc00', color:'#04080f', border:'none',
                  borderRadius:8, padding:'8px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                Re-scan
              </button>
            )}
          </div>
        )}

        {/* USB scan results — show blocked file paths */}
        {usbResults && usbResults.threats.length > 0 && (
          <div style={{ background:'#ff4d6d12', border:'1px solid #ff4d6d44',
            borderRadius:10, padding:'16px 20px', marginBottom:20 }}>
            <div style={{ color:'#ff4d6d', fontWeight:700, marginBottom:10 }}>
              🚨 {usbResults.threats.length} threats found and blocked on USB:
            </div>
            {usbResults.threats.map((t,i) => (
              <div key={i} style={{ fontFamily:'monospace', fontSize:12,
                color:'#dde8f5', padding:'5px 0', borderBottom:'1px solid #1a2d45',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>📁 {t.filepath}</span>
                <span style={{ color: t.blocked ? '#00ff9d' : '#ff4d6d', fontWeight:700 }}>
                  {t.blocked ? '✓ Blocked' : '⚠ Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background:'#080f1e',
              border:`1px solid ${s.color}33`, borderRadius:10, padding:'16px 20px', textAlign:'center' }}>
              <div style={{ color:s.color, fontSize:24, fontWeight:800, fontFamily:'monospace' }}>{s.value}</div>
              <div style={{ color:'#4a6080', fontSize:11, marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <ScanMonitor onThreatFound={reload} />

        {/* Threat history */}
        <div style={{ background:'#080f1e', border:'1px solid #0f1f35', borderRadius:10, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ color:'#dde8f5', fontWeight:700, margin:0 }}>🦠 My Threat History</h3>
            <span style={{ color:'#4a6080', fontSize:12 }}>{threats.length} records</span>
          </div>
          {threats.length === 0
            ? <div style={{ color:'#4a6080', textAlign:'center', padding:'32px 0' }}>✅ No threats detected yet</div>
            : threats.map(t => <ThreatCard key={t.id} threat={t} />)
          }
        </div>
      </div>
    </div>
  )
}