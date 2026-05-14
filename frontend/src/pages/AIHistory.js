import React, { useState, useEffect } from 'react';
import { API } from '../App';

const ENDPOINTS = [
  '', '/ai/repair-cost-estimate', '/ai/downtime-prediction', '/ai/compliance-check',
  '/ai/parts-analysis', '/ai/safety-analysis', '/ai/fleet-optimization',
  '/ai/mel-analysis', '/ai/document-review', '/ai/purchase-analysis',
  '/ai/predict-maintenance', '/ai/match-technician', '/ai/anomaly-detect', '/ai/optimize-shifts',
  '/analytics/component-reliability'
];

function AIHistory({ token }) {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [endpoint, setEndpoint] = useState('');
  const [expanded, setExpanded] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchHistory = (pg, ep) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: pg, limit: 20 });
    if (ep) params.set('endpoint', ep);
    fetch(`${API}/ai/history?${params}`, { headers: authHeaders })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Failed');
        setRecords(d.records || []);
        setPagination(d.pagination || null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(page, endpoint); }, [page, endpoint]); // eslint-disable-line

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';

  const endpointLabel = (ep) => ep.replace('/ai/', '').replace('/analytics/', '').replace(/-/g, ' ').replace(/_/g, ' ');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>AI Results History</h1>
          <p className="subtitle">Persisted AI analysis results</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Filter by Endpoint</label>
          <select value={endpoint} onChange={e => { setEndpoint(e.target.value); setPage(1); }}>
            {ENDPOINTS.map(ep => (
              <option key={ep} value={ep}>{ep || 'All Endpoints'}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchHistory(page, endpoint)} disabled={loading}>Refresh</button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading AI history...</div>}

      {!loading && records.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No AI results found. Run some analyses to see history here.</div>
      )}

      {records.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Endpoint</th>
                  <th>Model</th>
                  <th>Tokens</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td>#{r.id}</td>
                      <td>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{endpointLabel(r.endpoint)}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(r.model || '').split('/').pop()}</td>
                      <td style={{ textAlign: 'center' }}>{r.tokens_used || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(r.created_at)}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                          {expanded === r.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan="6">
                          <pre style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: 12,
                            fontSize: '0.78rem',
                            overflow: 'auto',
                            maxHeight: 400,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {r.parsed_result ? JSON.stringify(r.parsed_result, null, 2) : 'No parsed result'}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>Page {page} of {pagination.totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIHistory;
