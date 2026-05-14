import React, { useState, useEffect } from 'react';
import { API } from '../App';

function TechnicianMatcher({ token }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWO, setSelectedWO] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch(`${API}/work-orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setWorkOrders(d.records || (Array.isArray(d) ? d : [])))
      .catch(() => {});
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedWO) {
      setToast({ type: 'error', message: 'Choose a work order' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/ai/match-technician`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ work_order_id: selectedWO })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
      setToast({ type: 'success', message: 'Match recommendation ready' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const m = result?.match || {};

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1>Technician Skill Matrix Matcher</h1>
          <p className="subtitle">AI-recommended best technician for a work order</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="form-group">
          <label>Work Order</label>
          <select value={selectedWO} onChange={e => setSelectedWO(e.target.value)} required>
            <option value="">-- Select a work order --</option>
            {workOrders.map(wo => (
              <option key={wo.id || wo._id} value={wo.id || wo._id}>
                #{wo.id || wo._id} - {wo.title || wo.maintenance_type} ({wo.aircraft_reg})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Matching...' : 'Find Best Technician'}
        </button>
      </form>

      {loading && <div className="ai-loading" style={{ marginTop: 24 }}>Analyzing technician certifications...</div>}

      {result && (
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '2px solid #10b981' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>RECOMMENDED MATCH</div>
            <h2 style={{ marginBottom: 8 }}>{m.recommended_technician_name || 'No name'}</h2>
            <div style={{ marginBottom: 16 }}>
              <span className="badge badge-success">Match Score: {m.match_score ?? '-'}/100</span>
              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>Tech ID: {m.recommended_technician_id ?? '-'}</span>
            </div>
            <p style={{ lineHeight: 1.7 }}>{m.reasoning || 'No reasoning provided'}</p>
          </div>

          {Array.isArray(m.alternative_technicians) && m.alternative_technicians.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2>Alternative Candidates</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>ID</th><th>Name</th><th>Score</th><th>Reasoning</th></tr>
                  </thead>
                  <tbody>
                    {m.alternative_technicians.map((t, i) => (
                      <tr key={i}>
                        <td>{t.id}</td>
                        <td>{t.name}</td>
                        <td><span className="badge">{t.match_score}/100</span></td>
                        <td>{t.reasoning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Evaluated {result.technicians_evaluated} active technician(s).
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicianMatcher;
