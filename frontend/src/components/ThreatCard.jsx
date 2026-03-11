export default function ThreatCard({ threat }) {
  const severityColor = {
    critical: '#f87171', high: '#fbbf24',
    medium: '#a855f7',   low: '#00e5ff',
  }
  const color = severityColor[threat.severity] || '#64748b'

  return (
    <div style={{
      background: '#0d1526', border: `1px solid ${color}44`,
      borderLeft: `3px solid ${color}`, borderRadius: 8,
      padding: '12px 16px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
            {threat.filename || 'Unknown file'}
          </div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
            {threat.filepath || 'Path not recorded'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span className={`badge badge-${threat.severity === 'critical' || threat.severity === 'high' ? 'red' : 'yellow'}`}>
            {threat.severity?.toUpperCase()}
          </span>
          <span className="badge badge-blue">{threat.threat_type}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#64748b' }}>
        <span>🎯 Score: <strong style={{ color }}>{(threat.ai_score * 100).toFixed(1)}%</strong></span>
        <span>📁 Source: {threat.source}</span>
        <span>🕒 {new Date(threat.detected_at).toLocaleString()}</span>
        <span style={{ marginLeft: 'auto' }}>
          Action: <span style={{ color: threat.action_taken === 'quarantined' ? '#00ff88' : '#fbbf24' }}>
            {threat.action_taken}
          </span>
        </span>
      </div>
    </div>
  )
}