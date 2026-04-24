import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const TRAINING_TYPES = ['Initial', 'Recurrent', 'Type Rating', 'Safety', 'Regulatory', 'OJT'];
const STATUS_OPTIONS = ['Completed', 'In Progress', 'Expired', 'Scheduled'];
const PASS_FAIL_OPTIONS = ['Pass', 'Fail', 'Pending'];

const emptyForm = {
  record_number: '', employee_id: '', technician_name: '', training_type: '',
  course_name: '', provider: '', start_date: '', completion_date: '', expiry_date: '',
  score: '', pass_fail: '', certificate_number: '', status: '', notes: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Completed': return 'badge-success';
    case 'In Progress': return 'badge-warning';
    case 'Expired': return 'badge-danger';
    case 'Scheduled': return 'badge-info';
    default: return 'badge-secondary';
  }
};

const passFailBadge = (pf) => {
  switch (pf) {
    case 'Pass': return 'badge-success';
    case 'Fail': return 'badge-danger';
    case 'Pending': return 'badge-warning';
    default: return 'badge-secondary';
  }
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const getRowHighlight = (expiry_date) => {
  if (!expiry_date) return {};
  const now = new Date();
  const expiry = new Date(expiry_date);
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { backgroundColor: 'rgba(239, 68, 68, 0.15)' };
  if (diffDays <= 90) return { backgroundColor: 'rgba(245, 158, 11, 0.15)' };
  return {};
};

function TrainingRecords({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/training-records`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load training records', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editMode ? 'PUT' : 'POST';
    const url = editMode ? `${API}/training-records/${selectedItem.id}` : `${API}/training-records`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Training record updated successfully' : 'Training record added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save training record', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this training record?')) return;
    try {
      const res = await fetch(`${API}/training-records/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Training record deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete training record', 'error');
    }
  };

  const openCreate = () => {
    setEditMode(false);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditMode(true);
    setFormData({
      record_number: item.record_number || '',
      employee_id: item.employee_id || '',
      technician_name: item.technician_name || '',
      training_type: item.training_type || '',
      course_name: item.course_name || '',
      provider: item.provider || '',
      start_date: item.start_date ? item.start_date.split('T')[0] : '',
      completion_date: item.completion_date ? item.completion_date.split('T')[0] : '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      score: item.score || '',
      pass_fail: item.pass_fail || '',
      certificate_number: item.certificate_number || '',
      status: item.status || '',
      notes: item.notes || ''
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowForm(true);
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Training Records</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Track technician training, certifications, and renewals
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Training Record</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading training records...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No training records found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first training record to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Record #</th>
                <th>Technician</th>
                <th>Course</th>
                <th>Type</th>
                <th>Score</th>
                <th>Status</th>
                <th>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)} style={getRowHighlight(item.expiry_date)}>
                  <td style={{ fontWeight: 600 }}>{item.record_number}</td>
                  <td>{item.technician_name}</td>
                  <td>{item.course_name || '-'}</td>
                  <td>{item.training_type || '-'}</td>
                  <td>{item.score != null ? Number(item.score).toFixed(2) : '-'}</td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
                  <td>{formatDate(item.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.course_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Record Number & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Record Number</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.record_number}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.status}
                  </span>
                  <span className={`badge ${passFailBadge(selectedItem.pass_fail)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.pass_fail || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Score Display */}
              <div style={{ marginBottom: '20px', textAlign: 'center', padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Score</label>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '8px' }}>
                  {selectedItem.score != null ? Number(selectedItem.score).toFixed(2) : 'N/A'}
                </div>
              </div>

              {/* Training Details */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Technician</label><div className="value">{selectedItem.technician_name || '-'}</div></div>
                <div className="detail-item"><label>Employee ID</label><div className="value">{selectedItem.employee_id || '-'}</div></div>
                <div className="detail-item"><label>Training Type</label><div className="value">{selectedItem.training_type || '-'}</div></div>
                <div className="detail-item"><label>Provider</label><div className="value">{selectedItem.provider || '-'}</div></div>
                <div className="detail-item"><label>Course Name</label><div className="value">{selectedItem.course_name || '-'}</div></div>
                <div className="detail-item"><label>Certificate Number</label><div className="value">{selectedItem.certificate_number || '-'}</div></div>
              </div>

              {/* Dates */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Training Dates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.start_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completion Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.completion_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.expiry_date)}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Notes</label>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedItem.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={() => openEdit(selectedItem)}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Training Record' : 'Add Training Record'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Record Number</label>
                    <input name="record_number" value={formData.record_number} onChange={handleChange} required placeholder="e.g. TR-001" />
                  </div>
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input name="employee_id" value={formData.employee_id} onChange={handleChange} placeholder="e.g. EMP-001" />
                  </div>
                  <div className="form-group">
                    <label>Technician Name</label>
                    <input name="technician_name" value={formData.technician_name} onChange={handleChange} required placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label>Training Type</label>
                    <select name="training_type" value={formData.training_type} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Course Name</label>
                    <input name="course_name" value={formData.course_name} onChange={handleChange} required placeholder="Course title" />
                  </div>
                  <div className="form-group">
                    <label>Provider</label>
                    <input name="provider" value={formData.provider} onChange={handleChange} placeholder="Training provider" />
                  </div>
                  <div className="form-group">
                    <label>Certificate Number</label>
                    <input name="certificate_number" value={formData.certificate_number} onChange={handleChange} placeholder="Certificate #" />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Completion Date</label>
                    <input name="completion_date" type="date" value={formData.completion_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Score</label>
                    <input name="score" type="number" value={formData.score} onChange={handleChange} min="0" max="100" step="0.01" placeholder="0.00 - 100.00" />
                  </div>
                  <div className="form-group">
                    <label>Pass / Fail</label>
                    <select name="pass_fail" value={formData.pass_fail} onChange={handleChange}>
                      <option value="">Select result...</option>
                      {PASS_FAIL_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} required>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional notes..." rows="3" style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingRecords;
