import React, { useState } from 'react';
import { API } from '../App';

function PredictiveMaintenance({ token }) {
  const [aircraftId, setAircraftId] = useState('');
  const [lookahead, setLookahead] = useState(90);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!aircraftId.trim()) {
      setToast({ type: 'error', message: 'Aircraft ID is required' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/ai/predict-maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ aircraft_id: aircraftId, lookahead_days: Number(lookahead) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
      setToast({ type: 'success', message: 'Prediction generated' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const a = result?.analysis || {};

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1>Predictive Maintenance Scheduling</h1>
          <p className="subtitle">ML forecast of upcoming maintenance windows from history</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Aircraft Registration</label>
            <input type="text" value={aircraftId} onChange={e => setAircraftId(e.target.value)}
              placeholder="e.g. N12345" required />
          </div>
          <div className="form-group">
            <label>Lookahead Days</label>
            <input type="number" value={lookahead} onChange={e => setLookahead(e.target.value)}
              min="1" max="365" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Predicting...' : 'Run Prediction'}
        </button>
      </form>

      {loading && <div className="ai-loading" style={{ marginTop: 24 }}>Analyzing {aircraftId} maintenance history...</div>}

      {result && (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h2>Summary</h2>
            <p>{a.summary || 'No summary available'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
              <div className="card">
                <div className="card-title">AOG Risk</div>
                <div className="card-value" style={{ color: '#ef4444' }}>{a.aog_risk_percentage ?? '?'}%</div>
              </div>
              <div className="card">
                <div className="card-title">Records Analyzed</div>
                <div className="card-value">{result.maintenance_records_analyzed || 0}</div>
              </div>
              <div className="card">
                <div className="card-title">Est. Labor Cost</div>
                <div className="card-value" style={{ color: '#0ea5e9' }}>${a.estimated_labor_cost?.toLocaleString() || '-'}</div>
              </div>
              <div className="card">
                <div className="card-title">Est. Parts Cost</div>
                <div className="card-value" style={{ color: '#8b5cf6' }}>${a.estimated_parts_cost?.toLocaleString() || '-'}</div>
              </div>
            </div>
          </div>

          {Array.isArray(a.predicted_maintenance_windows) && a.predicted_maintenance_windows.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Predicted Maintenance Windows</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Probability</th><th>Priority</th></tr>
                  </thead>
                  <tbody>
                    {a.predicted_maintenance_windows.map((w, i) => (
                      <tr key={i}>
                        <td>{w.date || '-'}</td>
                        <td>{w.type || '-'}</td>
                        <td>{w.probability != null ? `${w.probability}%` : '-'}</td>
                        <td><span className="badge">{w.priority || '-'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(a.parts_likely_to_fail) && a.parts_likely_to_fail.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Parts Likely to Fail</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Part</th><th>Probability</th><th>Recommended Action</th></tr>
                  </thead>
                  <tbody>
                    {a.parts_likely_to_fail.map((p, i) => (
                      <tr key={i}>
                        <td>{p.part}</td>
                        <td>{p.probability}%</td>
                        <td>{p.recommended_action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(a.preventive_actions) && a.preventive_actions.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Preventive Actions</h2>
              <ul>{a.preventive_actions.map((act, i) => <li key={i}>{act}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PredictiveMaintenance;
