import AIReport from '../components/AIReport';
import useCancellableAIRequest from '../services/useCancellableAIRequest';
import CompleteAIExamples, { AIRequiredButton } from "../components/CompleteAIExamples";
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
  const { request: nativeRequest, cancel: cancelAI, busy: aiRequestBusy } = useCancellableAIRequest();
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
      const res = await nativeRequest(`${API}/ai/repair-cost-estimate`, {
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
      if (err.name === 'AbortError') return;
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
      {aiRequestBusy && <div role="status" className="ai-loading">Generating with OpenRouter… <button type="button" className="btn btn-secondary" onClick={cancelAI}>Cancel AI request</button></div>}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1>AI Repair Cost Estimator</h1>
          <p className="subtitle">Get detailed labor + parts + overhead breakdowns powered by Claude</p>
        </div>
      </div>

      <CompleteAIExamples busy={loading} context="MRO cost planning"><form onSubmit={submit} style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Aircraft Type</label>
            <select data-ai-field="aircraft_type" value={form.aircraft_type} onChange={e => update('aircraft_type', e.target.value)}>
              {AIRCRAFT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Maintenance Type</label>
            <select data-ai-field="maintenance_type" value={form.maintenance_type} onChange={e => update('maintenance_type', e.target.value)}>
              {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Parts Needed</label>
            <input data-ai-field="parts_needed" type="text" value={form.parts_needed} onChange={e => update('parts_needed', e.target.value)}
              placeholder="e.g. 2x landing gear bushings, hydraulic seals" />
          </div>
          <div className="form-group">
            <label>Labor Hours (estimated)</label>
            <input data-ai-field="labor_hours" type="number" value={form.labor_hours} onChange={e => update('labor_hours', e.target.value)}
              placeholder="e.g. 48" min="0" />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea data-ai-field="description" value={form.description} onChange={e => update('description', e.target.value)} rows={4}
            placeholder="Describe the maintenance scope..." />
        </div>
        <AIRequiredButton data-ai-generate type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Estimating...' : 'Generate Cost Estimate'}
        </AIRequiredButton>
      </form></CompleteAIExamples>

      {loading && <div className="ai-loading" style={{ marginTop: 24 }}>Analyzing maintenance scope with AI...</div>}

      {result && <AIReport response={result} title="AI repair cost estimate" />}
    </div>
  );
}

export default CostEstimator;
