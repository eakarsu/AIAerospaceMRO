import React, { useState } from 'react';
import { API } from '../App';

const AIRCRAFT_TYPES = [
  'Boeing 737-800', 'Boeing 787-9', 'Airbus A320neo', 'Airbus A350-900',
  'Embraer E175', 'Bombardier CRJ-900'
];
const MAINTENANCE_TYPES = ['Inspection', 'Repair', 'Overhaul', 'Modification', 'Scheduled Maintenance'];

function parseAI(text) {
  if (!text) return [];
  const sections = [];
  let current = null;
  text.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const isHeader = (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.includes('. '))
      || trimmed.startsWith('## ')
      || (trimmed.startsWith('**') && trimmed.endsWith('**'));
    if (isHeader) {
      const title = trimmed.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:$/, '');
      current = { title, content: [] };
      sections.push(current);
    } else {
      if (!current) { current = { title: '', content: [] }; sections.push(current); }
      current.content.push(trimmed);
    }
  });
  return sections;
}

function CostEstimator({ token }) {
  const [form, setForm] = useState({
    aircraft_type: AIRCRAFT_TYPES[0],
    maintenance_type: MAINTENANCE_TYPES[0],
    parts_needed: '',
    labor_hours: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/ai/repair-cost-estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.analysis || data.result || data);
      setToast({ type: 'success', message: 'Cost estimate generated' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isJsonResult = result && typeof result === 'object' && !Array.isArray(result);
  const sections = isJsonResult ? [] : parseAI(typeof result === 'string' ? result : '');

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1>AI Repair Cost Estimator</h1>
          <p className="subtitle">Get detailed labor + parts + overhead breakdowns powered by Claude</p>
        </div>
      </div>

      <form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Aircraft Type</label>
            <select value={form.aircraft_type} onChange={e => update('aircraft_type', e.target.value)}>
              {AIRCRAFT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Maintenance Type</label>
            <select value={form.maintenance_type} onChange={e => update('maintenance_type', e.target.value)}>
              {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Parts Needed</label>
            <input type="text" value={form.parts_needed} onChange={e => update('parts_needed', e.target.value)}
              placeholder="e.g. 2x landing gear bushings, hydraulic seals" />
          </div>
          <div className="form-group">
            <label>Labor Hours (estimated)</label>
            <input type="number" value={form.labor_hours} onChange={e => update('labor_hours', e.target.value)}
              placeholder="e.g. 48" min="0" />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4}
            placeholder="Describe the maintenance scope..." />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Estimating...' : 'Generate Cost Estimate'}
        </button>
      </form>

      {loading && <div className="ai-loading" style={{ marginTop: 24 }}>Analyzing maintenance scope with AI...</div>}

      {result && (
        <div className="ai-result" style={{ marginTop: 24 }}>
          <h3>AI Cost Estimate</h3>
          {isJsonResult ? (
            <div>
              {result.summary && <p style={{ marginBottom: 16 }}>{result.summary}</p>}
              {result.total_estimate !== undefined && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>Total Estimate</strong>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>${result.total_estimate?.toLocaleString()}</span>
                </div>
              )}
              {result.labor_cost_breakdown && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Labor Cost Breakdown</strong>
                  <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
                    Rate: ${result.labor_cost_breakdown.rate_per_hour}/hr &times; {result.labor_cost_breakdown.estimated_hours} hrs = <strong>${result.labor_cost_breakdown.total_labor?.toLocaleString()}</strong>
                  </div>
                </div>
              )}
              {Array.isArray(result.parts_cost_breakdown) && result.parts_cost_breakdown.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Parts Breakdown</strong>
                  <ul style={{ marginTop: 4 }}>
                    {result.parts_cost_breakdown.map((p, i) => (
                      <li key={i} style={{ fontSize: '0.9rem' }}>{p.part} &times; {p.quantity} @ ${p.unit_cost} = ${p.total?.toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(result.cost_saving_recommendations) && result.cost_saving_recommendations.length > 0 && (
                <div>
                  <strong>Cost-Saving Recommendations</strong>
                  <ul style={{ marginTop: 4 }}>
                    {result.cost_saving_recommendations.map((r, i) => <li key={i} style={{ fontSize: '0.9rem' }}>{r}</li>)}
                  </ul>
                </div>
              )}
              {result.confidence_level && <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confidence: {result.confidence_level} | {result.notes}</div>}
            </div>
          ) : sections.length > 0 ? sections.map((s, i) => (
            <div key={i} className="ai-section">
              {s.title && <div className="ai-section-title">{s.title}</div>}
              <div className="ai-result-content">{s.content.map((l, j) => <div key={j}>{l}</div>)}</div>
            </div>
          )) : <div className="ai-result-content">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</div>}
        </div>
      )}
    </div>
  );
}

export default CostEstimator;
