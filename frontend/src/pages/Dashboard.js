import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

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

  useEffect(() => {
    features.forEach(f => {
      fetch(`${API}${f.api}`)
        .then(r => r.json())
        .then(data => {
          setCounts(prev => ({ ...prev, [f.key]: Array.isArray(data) ? data.length : 0 }));
        })
        .catch(() => {});
    });
  }, []);

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
