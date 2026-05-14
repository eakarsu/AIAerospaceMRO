import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

const aiTools = [
  { key: 'cost', path: '/cost-estimator', title: 'Cost Estimator', subtitle: 'Labor + parts + overhead', icon: '💸', color: '#10b981' },
  { key: 'predict', path: '/predict-maintenance', title: 'Predictive Maintenance', subtitle: 'Forecast next windows', icon: '🔮', color: '#8b5cf6' },
  { key: 'matcher', path: '/technician-matcher', title: 'Technician Matcher', subtitle: 'AI-recommend best match', icon: '🤝', color: '#f59e0b' },
  { key: 'reliability', path: '/component-reliability', title: 'Reliability Scorecard', subtitle: 'Top failure risks', icon: '📈', color: '#ef4444' },
  { key: 'aitools', path: '/ai-tools', title: 'AI Tools Hub', subtitle: 'Compliance, MEL, safety, more', icon: '🧠', color: '#0ea5e9' },
  { key: 'workload', path: '/technician-workload', title: 'Tech Workload', subtitle: 'Utilization heatmap', icon: '📊', color: '#6366f1' },
  { key: 'calendar', path: '/compliance-calendar', title: 'Compliance Calendar', subtitle: 'AD due date calendar', icon: '📅', color: '#0d9488' },
  { key: 'aihistory', path: '/ai-history', title: 'AI History', subtitle: 'Past AI results', icon: '🕑', color: '#78716c' },
];

const features = [
  { key: 'maintenance', path: '/maintenance', title: 'Aircraft Maintenance', subtitle: 'Scheduling & tracking', icon: '🔧', color: '#0ea5e9', api: '/aircraft-maintenance' },
  { key: 'parts', path: '/parts', title: 'Parts Lifecycle', subtitle: 'Component tracking', icon: '⚙', color: '#8b5cf6', api: '/part-lifecycle' },
  { key: 'compliance', path: '/compliance', title: 'FAA Compliance', subtitle: 'Regulatory tracking', icon: '📋', color: '#10b981', api: '/compliance' },
  { key: 'workorders', path: '/work-orders', title: 'Work Orders', subtitle: 'Task management', icon: '📝', color: '#f59e0b', api: '/work-orders' },
  { key: 'inventory', path: '/inventory', title: 'Inventory', subtitle: 'Parts & supplies', icon: '📦', color: '#06b6d4', api: '/inventory' },
  { key: 'incidents', path: '/incidents', title: 'Safety Incidents', subtitle: 'Incident reporting', icon: '⚠', color: '#ef4444', api: '/incidents' },
  { key: 'technicians', path: '/technicians', title: 'Technicians', subtitle: 'Certifications', icon: '👷', color: '#ec4899', api: '/technicians' },
  { key: 'fleet', path: '/fleet', title: 'Fleet Health', subtitle: 'Aircraft monitoring', icon: '✈', color: '#14b8a6', api: '/fleet-health' },
  { key: 'vendors', path: '/vendors', title: 'Vendors', subtitle: 'Supplier management', icon: '🏢', color: '#a855f7', api: '/vendors' },
  { key: 'toolcal', path: '/tool-calibration', title: 'Tool Calibration', subtitle: 'Calibration tracking', icon: '🔬', color: '#6366f1', api: '/tool-calibration' },
  { key: 'mel', path: '/mel-tracking', title: 'MEL Tracking', subtitle: 'Deferral management', icon: '📄', color: '#e11d48', api: '/mel-tracking' },
  { key: 'documents', path: '/documents', title: 'Documents', subtitle: 'Records management', icon: '🗂', color: '#0d9488', api: '/documents' },
  { key: 'po', path: '/purchase-orders', title: 'Purchase Orders', subtitle: 'Procurement', icon: '💰', color: '#ca8a04', api: '/purchase-orders' },
  { key: 'audit', path: '/audit-log', title: 'Audit Log', subtitle: 'Activity tracking', icon: '🔍', color: '#78716c', api: '/audit-log' },
  { key: 'shifts', path: '/shift-scheduling', title: 'Shift Scheduling', subtitle: 'Crew assignments', icon: '🕐', color: '#7c3aed', api: '/shift-scheduling' },
  { key: 'hangars', path: '/hangar-management', title: 'Hangars', subtitle: 'Bay management', icon: '🏗', color: '#059669', api: '/hangar-management' },
  { key: 'training', path: '/training-records', title: 'Training', subtitle: 'Certifications', icon: '🎓', color: '#d97706', api: '/training-records' },
  { key: 'customers', path: '/customers', title: 'Customers', subtitle: 'Client accounts', icon: '✈', color: '#2563eb', api: '/customers' },
  { key: 'warranties', path: '/warranty-tracking', title: 'Warranties', subtitle: 'Coverage tracking', icon: '🛡', color: '#dc2626', api: '/warranty-tracking' },
];

function Dashboard({ token }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [aogAlerts, setAogAlerts] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    features.forEach(f => {
      fetch(`${API}${f.api}`, { headers: authHeaders })
        .then(r => r.json())
        .then(data => {
          // Handle both paginated { records, pagination } and raw arrays
          const count = data.pagination ? data.pagination.total : (Array.isArray(data) ? data.length : 0);
          setCounts(prev => ({ ...prev, [f.key]: count }));
        })
        .catch(() => {});
    });

    // Fetch AOG alerts
    fetch(`${API}/analytics/aog-alerts`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => setAogAlerts(data))
      .catch(() => {});
  }, []); // eslint-disable-line

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Mission Control Dashboard</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>AI-Powered Aerospace MRO Management System</p>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* AOG Alert Banner */}
      {aogAlerts && aogAlerts.total_alerts > 0 && (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>⚠</span>
            <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>
              AOG Alert Center – {aogAlerts.total_alerts} Active Alert{aogAlerts.total_alerts !== 1 ? 's' : ''}
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {aogAlerts.critical_aircraft?.length > 0 && (
              <div style={{ background: '#fee2e2', padding: '8px 12px', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, color: '#dc2626' }}>Critical Aircraft</div>
                {aogAlerts.critical_aircraft.slice(0, 3).map((a, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>{a.aircraft_reg} – Score: {a.health_score}</div>
                ))}
              </div>
            )}
            {aogAlerts.aog_work_orders?.length > 0 && (
              <div style={{ background: '#fef3c7', padding: '8px 12px', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, color: '#d97706' }}>AOG Work Orders</div>
                {aogAlerts.aog_work_orders.slice(0, 3).map((wo, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: '#92400e' }}>{wo.aircraft_reg} – {wo.title}</div>
                ))}
              </div>
            )}
            {aogAlerts.overdue_compliance?.length > 0 && (
              <div style={{ background: '#ffe4e6', padding: '8px 12px', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, color: '#e11d48' }}>Overdue Compliance</div>
                {aogAlerts.overdue_compliance.slice(0, 3).map((c, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: '#9f1239' }}>{c.directive_number} – Due: {new Date(c.due_date).toLocaleDateString()}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>AI Tools</h2>
      <div className="card-grid" style={{ marginBottom: 32 }}>
        {aiTools.map(f => (
          <div key={f.key} className="card" onClick={() => navigate(f.path)} style={{ borderLeft: `3px solid ${f.color}` }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: `${f.color}20`, color: f.color }}>
                <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>OPEN →</span>
            </div>
            <div className="card-title">{f.title}</div>
            <div className="card-subtitle">{f.subtitle}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 12 }}>Operations</h2>
      <div className="card-grid">
        {features.map(f => (
          <div key={f.key} className="card" onClick={() => navigate(f.path)}>
            <div className="card-header">
              <div className="card-icon" style={{ background: `${f.color}20`, color: f.color }}>
                <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>VIEW →</span>
            </div>
            <div className="card-value" style={{ color: f.color }}>
              {counts[f.key] !== undefined ? counts[f.key] : '...'}
            </div>
            <div className="card-title">{f.title}</div>
            <div className="card-subtitle">{f.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
