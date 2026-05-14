import React, { useState, useEffect } from 'react';
import { API } from '../App';

function TechnicianWorkload({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchWorkload = () => {
    setLoading(true);
    setError(null);
    fetch(`${API}/technicians/workload?start=${start}&end=${end}`, { headers: authHeaders })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Failed');
        setData(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWorkload(); }, []); // eslint-disable-line

  const workload = data?.workload || [];

  const utilizationColor = (hours) => {
    if (hours >= 40) return '#ef4444';
    if (hours >= 30) return '#f97316';
    if (hours >= 20) return '#eab308';
    return '#10b981';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Technician Workload Dashboard</h1>
          <p className="subtitle">Work order allocation by technician for selected period</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Start Date</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>End Date</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={fetchWorkload} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      {data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div className="card">
              <div className="card-title">Total Technicians</div>
              <div className="card-value">{workload.length}</div>
            </div>
            <div className="card">
              <div className="card-title">Overloaded (40+ hrs)</div>
              <div className="card-value" style={{ color: '#ef4444' }}>
                {workload.filter(t => parseFloat(t.total_estimated_hours) >= 40).length}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Active Work Orders</div>
              <div className="card-value" style={{ color: '#0ea5e9' }}>
                {workload.reduce((sum, t) => sum + (t.open_work_orders || 0), 0)}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Total Estimated Hours</div>
              <div className="card-value" style={{ color: '#8b5cf6' }}>
                {workload.reduce((sum, t) => sum + (parseFloat(t.total_estimated_hours) || 0), 0).toFixed(0)}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
            <h2 style={{ marginBottom: 16 }}>Technician Workload Heatmap</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Specialization</th>
                    <th>Status</th>
                    <th>Open Work Orders</th>
                    <th>Est. Hours</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No workload data available</td></tr>
                  ) : (
                    workload.map(t => {
                      const hours = parseFloat(t.total_estimated_hours) || 0;
                      const pct = Math.min(100, (hours / 40) * 100);
                      return (
                        <tr key={t.id}>
                          <td><strong>{t.name}</strong></td>
                          <td>{t.specialization || '-'}</td>
                          <td>
                            <span className="badge" style={{ background: t.status === 'Active' ? '#d1fae5' : '#fef3c7', color: t.status === 'Active' ? '#065f46' : '#92400e' }}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{t.open_work_orders}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: utilizationColor(hours) }}>{hours.toFixed(0)}h</td>
                          <td style={{ minWidth: 150 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8 }}>
                                <div style={{ width: `${pct}%`, background: utilizationColor(hours), borderRadius: 4, height: '100%', transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: utilizationColor(hours), minWidth: 35 }}>{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading workload data...</div>
      )}
    </div>
  );
}

export default TechnicianWorkload;
