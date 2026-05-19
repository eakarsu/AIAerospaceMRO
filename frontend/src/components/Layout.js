import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/custom-views', label: 'Hangar Views', icon: '🏭' },
  // AI Tools
  { section: 'AI Tools' },
  { path: '/cost-estimator', label: 'Cost Estimator', icon: '💸' },
  { path: '/predict-maintenance', label: 'Predictive Maint.', icon: '🔮' },
  { path: '/technician-matcher', label: 'Tech Matcher', icon: '🤝' },
  { path: '/component-reliability', label: 'Reliability Score', icon: '📈' },
  { path: '/ai-tools', label: 'AI Tools Hub', icon: '🧠' },
  { path: '/technician-workload', label: 'Tech Workload', icon: '📊' },
  { path: '/compliance-calendar', label: 'Compliance Cal.', icon: '📅' },
  { path: '/ai-history', label: 'AI History', icon: '🕑' },
  // Operations
  { section: 'Operations' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/parts', label: 'Parts Lifecycle', icon: '⚙' },
  { path: '/compliance', label: 'FAA Compliance', icon: '📋' },
  { path: '/work-orders', label: 'Work Orders', icon: '📝' },
  { path: '/inventory', label: 'Inventory', icon: '📦' },
  { path: '/incidents', label: 'Safety Incidents', icon: '⚠' },
  { path: '/technicians', label: 'Technicians', icon: '👷' },
  { path: '/fleet', label: 'Fleet Health', icon: '✈' },
  { path: '/vendors', label: 'Vendors', icon: '🏢' },
  { path: '/tool-calibration', label: 'Tool Calibration', icon: '🔬' },
  { path: '/mel-tracking', label: 'MEL Tracking', icon: '📄' },
  { path: '/documents', label: 'Documents', icon: '🗂' },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: '💰' },
  { path: '/audit-log', label: 'Audit Log', icon: '🔍' },
  { path: '/shift-scheduling', label: 'Shift Scheduling', icon: '🕐' },
  { path: '/hangar-management', label: 'Hangars', icon: '🏗' },
  { path: '/training-records', label: 'Training', icon: '🎓' },
  { path: '/customers', label: 'Customers', icon: '✈' },
  { path: '/warranty-tracking', label: 'Warranties', icon: '🛡' },
];

function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>AeroMRO Pro</h1>
          <span>AI Maintenance Platform</span>
        </div>
        <nav>
          {navItems.map((item, idx) => (
            item.section ? (
              <div key={`section-${idx}`} style={{
                padding: '12px 20px 4px',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600
              }}>
                {item.section}
              </div>
            ) : (
              <div
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div>{user?.email}</div>
            <div style={{ textTransform: 'capitalize', color: 'var(--accent)', fontSize: '0.75rem', marginTop: '2px' }}>{user?.role}</div>
          </div>
          <button onClick={onLogout} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
