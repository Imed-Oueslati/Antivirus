import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { userAPI } from '../api'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userAPI.getAllStats()
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a' }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>👥 User Statistics</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Total scan time, sessions and threats per user
          </p>
        </div>

        {loading
          ? <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading…</div>
          : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#070d1a' }}>
                  {['User','Email','Role','Scan Time','Sessions','Threats','Last Active'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      color: '#64748b', fontWeight: 600, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      borderBottom: '1px solid #1a2540',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1a2540' }}>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 600 }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#00e5ff', fontFamily: 'monospace' }}>
                      {u.days}d {u.minutes}m {u.seconds}s
                    </td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{u.total_sessions}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${u.total_threats_found > 0 ? 'badge-red' : 'badge-green'}`}>
                        {u.total_threats_found}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {u.last_active ? new Date(u.last_active).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}