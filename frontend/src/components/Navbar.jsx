import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const nav      = useNavigate()
  const location = useLocation()
  const user     = JSON.parse(localStorage.getItem('user') || '{}')

  const logout = () => {
    localStorage.clear()
    nav('/login')
  }

  const links = [
    { path: '/dashboard', label: '🛡️ Dashboard' },
    ...(user.role === 'admin' ? [{ path: '/users', label: '👥 Users' }] : []),
  ]

  return (
    <nav style={{
      background: '#0d1526', borderBottom: '1px solid #1a2540',
      padding: '0 28px', display: 'flex', alignItems: 'center',
      height: 56, gap: 8, position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ color: '#00e5ff', fontWeight: 800, fontSize: 16, marginRight: 24 }}>
        🛡️ AV-System
      </div>

      {links.map(l => (
        <button key={l.path} onClick={() => nav(l.path)}
          className="btn btn-outline"
          style={{
            color:       location.pathname === l.path ? '#00e5ff' : '#64748b',
            borderColor: location.pathname === l.path ? '#00e5ff' : 'transparent',
            padding: '6px 14px',
          }}>
          {l.label}
        </button>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          👤 {user.username} {user.role === 'admin' && <span style={{ color: '#a855f7' }}>(admin)</span>}
        </span>
        <button className="btn btn-danger" style={{ padding: '6px 14px' }} onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  )
}