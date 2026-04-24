import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const SHIFT_TYPES = ['Day', 'Night', 'Swing'];
const STATUS_OPTIONS = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const emptyForm = {
  shift_code: '', technician_name: '', employee_id: '', shift_type: '',
  shift_date: '', start_time: '', end_time: '', hangar_location: '',
  aircraft_reg: '', task_description: '', status: '', notes: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Scheduled': return 'badge-info';
    case 'In Progress': return 'badge-warning';
    case 'Completed': return 'badge-success';
    case 'Cancelled': return 'badge-secondary';
    default: return 'badge-secondary';
  }
};

const shiftTypeBadge = (type) => {
  switch (type) {
    case 'Day': return { background: '#f59e0b', color: '#fff' };
    case 'Night': return { background: '#6366f1', color: '#fff' };
    case 'Swing': return { background: '#ec4899', color: '#fff' };
    default: return { background: 'var(--border)', color: 'var(--text-primary)' };
  }
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

function ShiftScheduling({ token }) {
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
      const res = await fetch(`${API}/shift-scheduling`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load shifts', 'error');
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
    const url = editMode ? `${API}/shift-scheduling/${selectedItem.id}` : `${API}/shift-scheduling`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Shift updated successfully' : 'Shift added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save shift', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      const res = await fetch(`${API}/shift-scheduling/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Shift deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete shift', 'error');
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
      shift_code: item.shift_code || '',
      technician_name: item.technician_name || '',
      employee_id: item.employee_id || '',
      shift_type: item.shift_type || '',
      shift_date: item.shift_date ? item.shift_date.split('T')[0] : '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      hangar_location: item.hangar_location || '',
      aircraft_reg: item.aircraft_reg || '',
      task_description: item.task_description || '',
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
          <h1>Shift Scheduling</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Manage technician shifts and assignments
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Shift</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading shifts...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No shifts found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first shift to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Shift Code</th>
                <th>Technician</th>
                <th>Shift Type</th>
                <th>Date</th>
                <th>Hangar</th>
                <th>Aircraft</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600 }}>{item.shift_code}</td>
                  <td>{item.technician_name}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        ...shiftTypeBadge(item.shift_type),
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {item.shift_type || '-'}
                    </span>
                  </td>
                  <td>{formatDate(item.shift_date)}</td>
                  <td>{item.hangar_location || '-'}</td>
                  <td>{item.aircraft_reg || '-'}</td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
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
              <h2>{selectedItem.technician_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Shift Code & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Shift Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.shift_code}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      ...shiftTypeBadge(selectedItem.shift_type),
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '12px'
                    }}
                  >
                    {selectedItem.shift_type}
                  </span>
                  <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              {/* Shift Time Details */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Shift Schedule</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.shift_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Time</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedItem.start_time || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Time</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedItem.end_time || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Technician & Assignment Details */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Technician Name</label><div className="value">{selectedItem.technician_name || '-'}</div></div>
                <div className="detail-item"><label>Employee ID</label><div className="value">{selectedItem.employee_id || '-'}</div></div>
                <div className="detail-item"><label>Hangar Location</label><div className="value">{selectedItem.hangar_location || '-'}</div></div>
                <div className="detail-item"><label>Aircraft Registration</label><div className="value">{selectedItem.aircraft_reg || '-'}</div></div>
              </div>

              {/* Task Description */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Task Description</label>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {selectedItem.task_description || 'No task description provided.'}
                </div>
              </div>

              {/* Notes */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Notes</label>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {selectedItem.notes || 'No notes.'}
                </div>
              </div>
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
              <h2>{editMode ? 'Edit Shift' : 'Add Shift'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Shift Code</label>
                    <input name="shift_code" value={formData.shift_code} onChange={handleChange} required placeholder="e.g. SHF-001" />
                  </div>
                  <div className="form-group">
                    <label>Technician Name</label>
                    <input name="technician_name" value={formData.technician_name} onChange={handleChange} required placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input name="employee_id" value={formData.employee_id} onChange={handleChange} placeholder="e.g. EMP-001" />
                  </div>
                  <div className="form-group">
                    <label>Shift Type</label>
                    <select name="shift_type" value={formData.shift_type} onChange={handleChange} required>
                      <option value="">Select shift type...</option>
                      {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Shift Date</label>
                    <input name="shift_date" type="date" value={formData.shift_date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input name="start_time" type="time" value={formData.start_time} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input name="end_time" type="time" value={formData.end_time} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Hangar Location</label>
                    <input name="hangar_location" value={formData.hangar_location} onChange={handleChange} placeholder="e.g. Hangar A" />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={formData.aircraft_reg} onChange={handleChange} placeholder="e.g. N12345" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} required>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Task Description</label>
                    <textarea name="task_description" value={formData.task_description} onChange={handleChange} placeholder="Describe the task..." rows="3" style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional notes..." rows="2" style={{ width: '100%', resize: 'vertical' }} />
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

export default ShiftScheduling;
