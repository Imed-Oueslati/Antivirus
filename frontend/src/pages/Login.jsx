import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const set = field => e => setForm({ ...form, [field]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const fn = mode === 'login' ? authAPI.login : authAPI.register
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password }

      const { data } = await fn(payload)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(`Welcome, ${data.user.username}!`)
      nav('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', background: '#070d1a', border: '1px solid #1a2540',
    borderRadius: 8, padding: '11px 14px', color: '#e2e8f0',
    marginBottom: 12, fontSize: 14, outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#070d1a',
    }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ color: '#00e5ff', fontSize: 24, fontWeight: 800 }}>AV-System</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>AI-Powered Antivirus Protection</p>
        </div>

        <div className="card">
          <h2 style={{ color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create new account'}
          </h2>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <input style={inp} placeholder="Username" value={form.username}
                onChange={set('username')} required />
            )}
            <input style={inp} type="email" placeholder="Email" value={form.email}
              onChange={set('email')} required />
            <input style={inp} type="password" placeholder="Password" value={form.password}
              onChange={set('password')} required />

            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}
              disabled={loading}>
              {loading ? '…' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, color: '#64748b', fontSize: 13 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              style={{ color: '#00e5ff', cursor: 'pointer' }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}