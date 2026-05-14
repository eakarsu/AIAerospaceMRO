import React, { useState, useEffect } from 'react';
import { API } from '../App';

function ComponentReliability({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`${API}/analytics/component-reliability`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Failed');
        setData(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  const ai = data?.ai_reliability_analysis || {};
  const components = data?.components || [];

  const riskColor = (lvl) => {
    switch ((lvl || '').toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Component Reliability Scorecard</h1>
          <p className="subtitle">Aggregate failure rates with AI-flagged risk components</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Refresh</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading reliability data...</div>}
      {error && <div className="toast toast-error">{error}</div>}

      {data && (
        <div style={{ display: 'grid', gap: 16 }}>
          {ai.overall_fleet_reliability_score != null && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>OVERALL FLEET RELIABILITY</div>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: ai.overall_fleet_reliability_score >= 80 ? '#10b981' : ai.overall_fleet_reliability_score >= 60 ? '#eab308' : '#ef4444' }}>
                {ai.overall_fleet_reliability_score}/100
              </div>
            </div>
          )}

          {Array.isArray(ai.top_3_risks) && ai.top_3_risks.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Top Reliability Risks</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
                {ai.top_3_risks.map((r, i) => (
                  <div key={i} style={{ padding: 16, border: `2px solid ${riskColor(r.risk_level)}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>{r.component_type}</strong>
                      <span style={{ background: riskColor(r.risk_level), color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                        {r.risk_level}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Failure prob: {r.failure_probability_pct}%</div>
                    <div style={{ marginTop: 8 }}><strong>Risk:</strong> {r.primary_risk_factor}</div>
                    <div style={{ marginTop: 8 }}><strong>Action:</strong> {r.recommended_action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(ai.key_findings) && ai.key_findings.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Key Findings</h2>
              <ul>{ai.key_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h2>Component Statistics ({components.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Component Type</th>
                    <th>Total Events</th>
                    <th>Completed</th>
                    <th>High/Critical</th>
                    <th>Avg Hours</th>
                    <th>Avg Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.component_type}</strong></td>
                      <td>{c.total_events}</td>
                      <td>{c.completed_events}</td>
                      <td><span className="badge badge-warning">{c.failure_count}</span></td>
                      <td>{c.avg_estimated_hours || '-'}</td>
                      <td>{c.avg_cost_per_event ? `$${c.avg_cost_per_event}` : '-'}</td>
                      <td>{c.total_cost ? `$${c.total_cost}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Generated: {data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}
            {!data.ai_available && ' (AI analysis unavailable)'}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComponentReliability;
