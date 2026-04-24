import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  log_number: '', action_type: 'CREATE', module: 'Work Orders', record_id: '',
  record_reference: '', description: '', performed_by: '', user_role: 'technician',
  ip_address: '', old_value: '', new_value: '', severity: 'Info'
};

const actionTypeOptions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REVIEW'];
const moduleOptions = [
  'Work Orders', 'Aircraft Maintenance', 'Compliance', 'Inventory', 'Safety Incidents',
  'Fleet Health', 'Technicians', 'Vendors', 'Purchase Orders', 'MEL Tracking',
  'Tool Calibration', 'Documents', 'Authentication'
];
const userRoleOptions = ['admin', 'manager', 'technician'];
const severityOptions = ['Info', 'Warning', 'Critical'];

const actionBadge = (action) => {
  const map = {
    CREATE: 'success', UPDATE: 'info', DELETE: 'danger',
    LOGIN: 'secondary', LOGOUT: 'secondary', EXPORT: 'info',
    APPROVE: 'success', REVIEW: 'warning'
  };
  return map[action] || 'secondary';
};

const severityBadge = (severity) => {
  const map = { Info: 'info', Warning: 'warning', Critical: 'danger' };
  return map[severity] || 'secondary';
};

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function AuditLog({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/audit-log`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load audit log entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setFormData({ ...emptyForm });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/audit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          record_id: formData.record_id ? Number(formData.record_id) : null
        })
      });
      if (!res.ok) throw new Error('Request failed');
      showToast('Audit log entry created');
      setShowForm(false);
      fetchItems();
    } catch {
      showToast('Failed to create audit log entry', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this audit log entry?')) return;
    try {
      const res = await fetch(`${API}/audit-log/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Audit log entry deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete audit log entry', 'error');
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Audit Trail</h1>
          <p className="subtitle">View system activity logs and track all user actions across modules</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Log Entry</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading audit log entries...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No audit log entries found</p>
          <p style={{ fontSize: '0.85rem' }}>Click "New Log Entry" to create a manual log entry.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Log #</th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Module</th>
                <th>Reference</th>
                <th>Performed By</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.log_number}</td>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td><span className={`badge badge-${actionBadge(item.action_type)}`}>{item.action_type}</span></td>
                  <td>{item.module || '-'}</td>
                  <td>{item.record_reference || '-'}</td>
                  <td>{item.performed_by || '-'}</td>
                  <td><span className={`badge badge-${severityBadge(item.severity)}`}>{item.severity || 'Info'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.log_number} - {selectedItem.action_type}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Log Number</label>
                  <div className="value">{selectedItem.log_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Timestamp</label>
                  <div className="value">{formatDateTime(selectedItem.created_at)}</div>
                </div>
                <div className="detail-item">
                  <label>Action Type</label>
                  <div className="value">
                    <span className={`badge badge-${actionBadge(selectedItem.action_type)}`}>{selectedItem.action_type}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Module</label>
                  <div className="value">{selectedItem.module || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Record ID</label>
                  <div className="value">{selectedItem.record_id || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Record Reference</label>
                  <div className="value">{selectedItem.record_reference || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Performed By</label>
                  <div className="value">{selectedItem.performed_by || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>User Role</label>
                  <div className="value" style={{ textTransform: 'capitalize' }}>{selectedItem.user_role || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>IP Address</label>
                  <div className="value">{selectedItem.ip_address || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Severity</label>
                  <div className="value">
                    <span className={`badge badge-${severityBadge(selectedItem.severity)}`}>{selectedItem.severity || 'Info'}</span>
                  </div>
                </div>
              </div>

              {selectedItem.description && (
                <div style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.description}
                  </div>
                </div>
              )}

              {/* Old Value / New Value side by side */}
              {(selectedItem.old_value || selectedItem.new_value) && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <label style={{ marginBottom: '8px', display: 'block' }}>Changes</label>
                  {selectedItem.old_value && selectedItem.new_value ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Old Value</label>
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px',
                          fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5
                        }}>
                          {selectedItem.old_value}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--success)' }}>New Value</label>
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px',
                          fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5
                        }}>
                          {selectedItem.new_value}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedItem.old_value && (
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Old Value</label>
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px',
                            fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5
                          }}>
                            {selectedItem.old_value}
                          </div>
                        </div>
                      )}
                      {selectedItem.new_value && (
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--success)' }}>New Value</label>
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px',
                            fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5
                          }}>
                            {selectedItem.new_value}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Log Entry</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Log Number</label>
                    <input name="log_number" value={formData.log_number} onChange={handleChange} required placeholder="e.g., LOG-2026-001" />
                  </div>
                  <div className="form-group">
                    <label>Action Type</label>
                    <select name="action_type" value={formData.action_type} onChange={handleChange}>
                      {actionTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Module</label>
                    <select name="module" value={formData.module} onChange={handleChange}>
                      {moduleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Record ID</label>
                    <input name="record_id" type="number" value={formData.record_id} onChange={handleChange} placeholder="e.g., 42" />
                  </div>
                  <div className="form-group">
                    <label>Record Reference</label>
                    <input name="record_reference" value={formData.record_reference} onChange={handleChange} placeholder="e.g., WO-2026-015" />
                  </div>
                  <div className="form-group">
                    <label>Performed By</label>
                    <input name="performed_by" value={formData.performed_by} onChange={handleChange} required placeholder="e.g., John Smith" />
                  </div>
                  <div className="form-group">
                    <label>User Role</label>
                    <select name="user_role" value={formData.user_role} onChange={handleChange}>
                      {userRoleOptions.map(opt => <option key={opt} value={opt} style={{ textTransform: 'capitalize' }}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>IP Address</label>
                    <input name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="e.g., 192.168.1.100" />
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select name="severity" value={formData.severity} onChange={handleChange}>
                      {severityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the action performed..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Old Value</label>
                    <textarea name="old_value" value={formData.old_value} onChange={handleChange} placeholder="Previous value before the change..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>New Value</label>
                    <textarea name="new_value" value={formData.new_value} onChange={handleChange} placeholder="New value after the change..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Create Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLog;
