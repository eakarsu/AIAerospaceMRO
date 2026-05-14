import React, { useState } from 'react';
import { API } from '../App';

const TOOLS = {
  'compliance-check': {
    title: 'Compliance Directive Analyzer',
    description: 'Analyze FAA/EASA airworthiness directives and bulletins',
    endpoint: '/ai/compliance-check',
    fields: [
      { name: 'directive_number', label: 'Directive Number', placeholder: 'AD 2024-XX-YY' },
      { name: 'aircraft_type', label: 'Aircraft Type', placeholder: 'Boeing 737-800' },
      { name: 'description', label: 'Directive Description', textarea: true },
      { name: 'current_status', label: 'Current Compliance Status', placeholder: 'Pending / In Progress / Done' }
    ]
  },
  'parts-analysis': {
    title: 'Part Lifecycle Analyzer',
    description: 'Predict remaining useful life and replacement plan',
    endpoint: '/ai/parts-analysis',
    fields: [
      { name: 'part_number', label: 'Part Number' },
      { name: 'part_name', label: 'Part Name' },
      { name: 'cycle_count', label: 'Cycle Count', type: 'number' },
      { name: 'max_cycles', label: 'Max Cycles', type: 'number' },
      { name: 'flight_hours', label: 'Flight Hours', type: 'number' },
      { name: 'condition_status', label: 'Condition Status', placeholder: 'Good / Fair / Poor' },
      { name: 'installed_date', label: 'Installed Date', type: 'date' }
    ]
  },
  'safety-analysis': {
    title: 'Safety Incident Analyzer',
    description: 'Root cause analysis with reporting requirements',
    endpoint: '/ai/safety-analysis',
    fields: [
      { name: 'incident_title', label: 'Incident Title' },
      { name: 'severity', label: 'Severity', placeholder: 'Minor / Major / Critical' },
      { name: 'aircraft_type', label: 'Aircraft Type' },
      { name: 'location', label: 'Location' },
      { name: 'description', label: 'Description', textarea: true }
    ]
  },
  'fleet-optimization': {
    title: 'Fleet Optimization',
    description: 'Recommend resource allocation and 90-day plan',
    endpoint: '/ai/fleet-optimization',
    fields: [
      { name: 'fleet_data', label: 'Fleet Data Summary', textarea: true,
        placeholder: 'Provide aircraft list, operational status, maintenance burden...' }
    ]
  },
  'mel-analysis': {
    title: 'MEL Deferral Analyzer',
    description: 'MEL category assessment + dispatch considerations',
    endpoint: '/ai/mel-analysis',
    fields: [
      { name: 'mel_number', label: 'MEL Number' },
      { name: 'title', label: 'Title' },
      { name: 'category', label: 'Category', placeholder: 'A / B / C / D' },
      { name: 'aircraft_reg', label: 'Aircraft Registration' },
      { name: 'description', label: 'Description', textarea: true },
      { name: 'operational_restriction', label: 'Operational Restriction' },
      { name: 'deferral_date', label: 'Deferral Date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry Date', type: 'date' }
    ]
  },
  'document-review': {
    title: 'Technical Document Review',
    description: 'Compliance + revision history analysis',
    endpoint: '/ai/document-review',
    fields: [
      { name: 'document_number', label: 'Document Number' },
      { name: 'title', label: 'Title' },
      { name: 'document_type', label: 'Type', placeholder: 'Manual / Bulletin / AD' },
      { name: 'revision', label: 'Revision' },
      { name: 'aircraft_type', label: 'Aircraft Type' },
      { name: 'description', label: 'Description', textarea: true }
    ]
  },
  'purchase-analysis': {
    title: 'Purchase Order Analyzer',
    description: 'Vendor evaluation + sourcing alternatives',
    endpoint: '/ai/purchase-analysis',
    fields: [
      { name: 'po_number', label: 'PO Number' },
      { name: 'vendor_name', label: 'Vendor Name' },
      { name: 'total_amount', label: 'Total Amount ($)', type: 'number' },
      { name: 'priority', label: 'Priority', placeholder: 'High / Medium / Low' },
      { name: 'aircraft_reg', label: 'Aircraft Reg' },
      { name: 'items_description', label: 'Items Description', textarea: true }
    ]
  },
  'anomaly-detect': {
    title: 'Sensor Anomaly Detector',
    description: 'AI detection of engine/systems telemetry anomalies',
    endpoint: '/ai/anomaly-detect',
    fields: [
      { name: 'aircraft_reg', label: 'Aircraft Registration', placeholder: 'e.g. N12345' },
      { name: 'system_type', label: 'System Type', placeholder: 'Engine / Hydraulic / Avionics / General' },
      { name: 'sensor_readings', label: 'Sensor Readings', textarea: true, placeholder: 'EGT: 650°C (normal: 580-620°C)\nOil Pressure: 28 PSI (normal: 40-60 PSI)\nVibration: 0.8 IPS (normal: <0.5 IPS)' }
    ]
  },
  'optimize-shifts': {
    title: 'Shift Coverage Optimizer',
    description: 'AI analysis of shift coverage vs upcoming work orders',
    endpoint: '/ai/optimize-shifts',
    fields: [
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' }
    ]
  },
  'training-path': {
    title: 'Technician Training Path',
    description: 'AI-recommended upskilling / certification roadmap',
    endpoint: '/ai/training-path',
    fields: [
      { name: 'technician_id', label: 'Technician ID (optional)', type: 'number' },
      { name: 'target_role', label: 'Target Role', placeholder: 'Lead A&P / Avionics Specialist' },
      { name: 'current_skills', label: 'Current Skills (free text)', textarea: true }
    ]
  },
  'fleet-reallocation': {
    title: 'Cross-Fleet Reallocation Advisor',
    description: 'Recommend technician/parts/hangar moves across fleet',
    endpoint: '/ai/fleet-reallocation',
    fields: [
      { name: 'priority_threshold', label: 'Priority Threshold', placeholder: 'High / Medium / Low' },
      { name: 'horizon_days', label: 'Horizon (days)', type: 'number', placeholder: '14' }
    ]
  }
};

function parseAI(text) {
  if (!text) return [];
  const sections = [];
  let cur = null;
  text.split('\n').forEach(line => {
    const t = line.trim();
    if (!t) return;
    const isHeader = (t.endsWith(':') && t.length < 80 && !t.includes('. '))
      || t.startsWith('## ') || (t.startsWith('**') && t.endsWith('**'));
    if (isHeader) {
      const title = t.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:$/, '');
      cur = { title, content: [] };
      sections.push(cur);
    } else {
      if (!cur) { cur = { title: '', content: [] }; sections.push(cur); }
      cur.content.push(t);
    }
  });
  return sections;
}

function AITools({ token }) {
  const [active, setActive] = useState('compliance-check');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const tool = TOOLS[active];

  const switchTool = (key) => {
    setActive(key);
    setForm({});
    setResult(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}${tool.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // API now returns structured JSON in data.analysis
      setResult(data.analysis || data.result || data);
      setToast({ type: 'success', message: 'Analysis complete' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Render structured JSON result
  const renderValue = (val, depth = 0) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    if (typeof val === 'boolean') return <span style={{ color: val ? '#10b981' : '#ef4444' }}>{val.toString()}</span>;
    if (typeof val === 'number') return <span style={{ color: '#0ea5e9', fontWeight: 600 }}>{val}</span>;
    if (typeof val === 'string') return <span>{val}</span>;
    if (Array.isArray(val)) {
      return (
        <ul style={{ margin: '4px 0', paddingLeft: depth > 0 ? 16 : 0 }}>
          {val.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {typeof item === 'object' ? renderValue(item, depth + 1) : <span>{item}</span>}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof val === 'object') {
      return (
        <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {k.replace(/_/g, ' ')}:
              </span>{' '}
              {renderValue(v, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  const isJsonResult = result && typeof result === 'object';
  const sections = isJsonResult ? [] : parseAI(typeof result === 'string' ? result : '');

  return (
    <div className="fade-in">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1>AI Tools Hub</h1>
          <p className="subtitle">Specialized AI analyses for MRO operations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.entries(TOOLS).map(([k, t]) => (
          <button key={k} onClick={() => switchTool(k)}
            className={`btn btn-sm ${active === k ? 'btn-primary' : 'btn-secondary'}`}>
            {t.title}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <h2>{tool.title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{tool.description}</p>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {tool.fields.map(f => (
              <div key={f.name} className="form-group" style={f.textarea ? { gridColumn: '1 / -1' } : {}}>
                <label>{f.label}</label>
                {f.textarea ? (
                  <textarea value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                    rows={4} placeholder={f.placeholder || ''} />
                ) : (
                  <input type={f.type || 'text'} value={form[f.name] || ''}
                    onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.placeholder || ''} />
                )}
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </form>
      </div>

      {loading && <div className="ai-loading">Running AI analysis...</div>}

      {result && (
        <div className="ai-result">
          <h3>AI Analysis</h3>
          {isJsonResult ? (
            <div style={{ padding: '0 4px' }}>{renderValue(result)}</div>
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

export default AITools;
