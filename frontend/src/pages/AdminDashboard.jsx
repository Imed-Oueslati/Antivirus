import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import Navbar from '../components/Navbar'
import { scanAPI, userAPI } from '../api'

Chart.register(...registerables)

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [threats, setThreats] = useState([])

  const typeRef     = useRef(null)
  const severityRef = useRef(null)
  const dayRef      = useRef(null)
  const sourceRef   = useRef(null)

  const charts = useRef({})

  useEffect(() => {
    scanAPI.getStats?.()     .then(r => setStats(r.data)).catch(() => {})
    userAPI.getAllStats()     .then(r => setUsers(r.data)).catch(() => {})
    scanAPI.getThreats()     .then(r => setThreats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!stats) return

    const destroy = key => { if (charts.current[key]) { charts.current[key].destroy() } }

    // Chart 1 — Threats by type (Doughnut)
    destroy('type')
    if (typeRef.current) {
      charts.current.type = new Chart(typeRef.current, {
        type: 'doughnut',
        data: {
          labels: stats.byType.map(r => r.threat_type),
          datasets: [{ data: stats.byType.map(r => parseInt(r.count)),
            backgroundColor: ['#ff4d6d','#b06aff','#ffcc00','#00d4ff','#00ff9d','#ff8c42','#64748b'] }]
        },
        options: { plugins: { legend: { labels: { color: '#dde8f5' } } },
          responsive: true }
      })
    }

    // Chart 2 — Threats by severity (Bar)
    destroy('severity')
    if (severityRef.current) {
      const colors = { critical:'#ff4d6d', high:'#ff8c42', medium:'#ffcc00', low:'#00ff9d' }
      charts.current.severity = new Chart(severityRef.current, {
        type: 'bar',
        data: {
          labels: stats.bySeverity.map(r => r.severity),
          datasets: [{ label: 'Threats', data: stats.bySeverity.map(r => parseInt(r.count)),
            backgroundColor: stats.bySeverity.map(r => colors[r.severity] || '#64748b') }]
        },
        options: { plugins: { legend: { display: false } },
          scales: { x: { ticks: { color:'#dde8f5' } }, y: { ticks: { color:'#dde8f5' }, grid: { color:'#1a2d45' } } },
          responsive: true }
      })
    }

    // Chart 3 — Threats per day (Line)
    destroy('day')
    if (dayRef.current) {
      charts.current.day = new Chart(dayRef.current, {
        type: 'line',
        data: {
          labels: stats.byDay.map(r => r.day).reverse(),
          datasets: [{ label: 'Threats/day', data: stats.byDay.map(r => parseInt(r.count)).reverse(),
            borderColor: '#00d4ff', backgroundColor: '#00d4ff22', fill: true, tension: 0.4 }]
        },
        options: { plugins: { legend: { labels: { color:'#dde8f5' } } },
          scales: { x: { ticks: { color:'#dde8f5' } }, y: { ticks: { color:'#dde8f5' }, grid: { color:'#1a2d45' } } },
          responsive: true }
      })
    }

    // Chart 4 — Threats by source (Pie)
    destroy('source')
    if (sourceRef.current) {
      charts.current.source = new Chart(sourceRef.current, {
        type: 'pie',
        data: {
          labels: stats.bySource.map(r => r.source),
          datasets: [{ data: stats.bySource.map(r => parseInt(r.count)),
            backgroundColor: ['#b06aff','#00d4ff','#ffcc00','#ff4d6d','#00ff9d'] }]
        },
        options: { plugins: { legend: { labels: { color:'#dde8f5' } } }, responsive: true }
      })
    }

    return () => { Object.values(charts.current).forEach(c => c.destroy()) }
  }, [stats])

  const sevColor = { critical:'#ff4d6d', high:'#ff8c42', medium:'#ffcc00', low:'#00ff9d' }

  return (
    <div style={{ minHeight:'100vh', background:'#04080f' }}>
      <Navbar />
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>

        <h1 style={{ color:'#dde8f5', fontSize:20, fontWeight:800, marginBottom:24 }}>
          🛡️ Admin Dashboard
        </h1>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
          {[
            { label:'Total Users',    value: users.length,                       color:'#00d4ff' },
            { label:'Total Threats',  value: threats.length,                     color:'#ff4d6d' },
            { label:'Critical',       value: threats.filter(t=>t.severity==='critical').length, color:'#ff4d6d' },
            { label:'Blocked',        value: threats.filter(t=>t.is_blocked).length, color:'#00ff9d' },
          ].map(s => (
            <div key={s.label} style={{ background:'#080f1e', border:`1px solid ${s.color}33`,
              borderRadius:10, padding:'16px 20px', textAlign:'center' }}>
              <div style={{ color:s.color, fontSize:28, fontWeight:800, fontFamily:'monospace' }}>{s.value}</div>
              <div style={{ color:'#4a6080', fontSize:12, marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
          {[
            { title:'Threats by Type',     ref: typeRef },
            { title:'Threats by Severity', ref: severityRef },
            { title:'Threats Over 30 Days',ref: dayRef },
            { title:'Threats by Source',   ref: sourceRef },
          ].map(c => (
            <div key={c.title} style={{ background:'#080f1e', border:'1px solid #0f1f35',
              borderRadius:10, padding:20 }}>
              <div style={{ color:'#dde8f5', fontWeight:700, marginBottom:14, fontSize:13 }}>{c.title}</div>
              {stats
                ? <canvas ref={c.ref} />
                : <div style={{ color:'#4a6080', textAlign:'center', padding:40 }}>Loading…</div>
              }
            </div>
          ))}
        </div>

        {/* All threats table */}
        <div style={{ background:'#080f1e', border:'1px solid #0f1f35', borderRadius:10, overflow:'hidden', marginBottom:28 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #0f1f35' }}>
            <h2 style={{ color:'#dde8f5', fontSize:15, fontWeight:700, margin:0 }}>🦠 All Detected Threats</h2>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#04080f' }}>
                  {['User','File','Path','Type','Severity','Score','Blocked','Source','Date'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#4a6080',
                      fontWeight:600, fontSize:10, textTransform:'uppercase',
                      borderBottom:'1px solid #0f1f35', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {threats.map((t,i) => (
                  <tr key={t.id} style={{ borderBottom:'1px solid #0f1f35',
                    background: i%2===0 ? '#080f1e' : '#04080f' }}>
                    <td style={{ padding:'10px 14px', color:'#00d4ff' }}>{t.User?.username || '—'}</td>
                    <td style={{ padding:'10px 14px', color:'#dde8f5', fontFamily:'monospace' }}>{t.filename}</td>
                    <td style={{ padding:'10px 14px', color:'#4a6080', fontFamily:'monospace', maxWidth:200,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                      title={t.filepath}>{t.filepath || '—'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:'#b06aff22', color:'#b06aff',
                        border:'1px solid #b06aff44', borderRadius:4, padding:'2px 8px' }}>
                        {t.threat_type}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ color: sevColor[t.severity], fontWeight:700 }}>
                        {t.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#ffcc00', fontFamily:'monospace' }}>
                      {(parseFloat(t.ai_score)*100).toFixed(1)}%
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ color: t.is_blocked ? '#00ff9d' : '#ff4d6d', fontWeight:700 }}>
                        {t.is_blocked ? '✓ Blocked' : '✗ No'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#4a6080' }}>{t.source}</td>
                    <td style={{ padding:'10px 14px', color:'#4a6080', whiteSpace:'nowrap' }}>
                      {new Date(t.detected_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users table */}
        <div style={{ background:'#080f1e', border:'1px solid #0f1f35', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #0f1f35' }}>
            <h2 style={{ color:'#dde8f5', fontSize:15, fontWeight:700, margin:0 }}>👥 User Statistics</h2>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#04080f' }}>
                {['Username','Email','Role','Scan Time','Sessions','Threats','Last Active'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#4a6080',
                    fontWeight:600, fontSize:10, textTransform:'uppercase',
                    borderBottom:'1px solid #0f1f35' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u,i) => (
                <tr key={u.id} style={{ borderBottom:'1px solid #0f1f35',
                  background: i%2===0 ? '#080f1e' : '#04080f' }}>
                  <td style={{ padding:'10px 14px', color:'#dde8f5', fontWeight:600 }}>{u.username}</td>
                  <td style={{ padding:'10px 14px', color:'#4a6080' }}>{u.email}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ background: u.role==='admin'?'#00d4ff22':'#00ff9d22',
                      color: u.role==='admin'?'#00d4ff':'#00ff9d',
                      border:`1px solid ${u.role==='admin'?'#00d4ff':'#00ff9d'}44`,
                      borderRadius:4, padding:'2px 8px', fontSize:11 }}>{u.role}</span>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#00d4ff', fontFamily:'monospace' }}>
                    {u.days}d {u.minutes}m {u.seconds}s
                  </td>
                  <td style={{ padding:'10px 14px', color:'#dde8f5' }}>{u.total_sessions}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ color: u.total_threats_found>0?'#ff4d6d':'#00ff9d', fontWeight:700 }}>
                      {u.total_threats_found}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', color:'#4a6080', fontSize:11 }}>
                    {u.last_active ? new Date(u.last_active).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}