import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const CATEGORIES = [
  'Torque Tools', 'Electrical Test', 'Pressure Instruments', 'Dimensional',
  'NDT Equipment', 'Rigging Tools', 'Test Equipment', 'Avionics Test',
  'Inspection', 'Force Measurement'
];

const STATUSES = ['Calibrated', 'Due', 'Overdue', 'Out of Service'];
const ACCURACY_RATINGS = ['Pass', 'Fail', 'N/A'];

const emptyForm = {
  tool_id: '',
  tool_name: '',
  category: CATEGORIES[0],
  manufacturer: '',
  model_number: '',
  serial_number: '',
  calibration_date: '',
  next_calibration: '',
  calibration_interval_days: '',
  calibration_standard: '',
  location: '',
  assigned_to: '',
  status: 'Calibrated',
  accuracy_rating: 'Pass',
  certificate_number: '',
  notes: ''
};

function getStatusBadge(status) {
  const map = {
    'Calibrated': 'badge-success',
    'Due': 'badge-warning',
    'Overdue': 'badge-danger',
    'Out of Service': 'badge-secondary'
  };
  return map[status] || 'badge-secondary';
}

function getAccuracyBadge(accuracy) {
  const map = {
    'Pass': 'badge-success',
    'Fail': 'badge-danger',
    'N/A': 'badge-secondary'
  };
  return map[accuracy] || 'badge-secondary';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function getRowStyle(status) {
  if (status === 'Overdue') return { borderLeft: '4px solid var(--danger, #e74c3c)' };
  if (status === 'Due') return { borderLeft: '4px solid var(--warning, #f39c12)' };
  return {};
}

function ToolCalibration({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tool-calibration`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load tool calibration records', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        calibration_interval_days: formData.calibration_interval_days ? Number(formData.calibration_interval_days) : null
      };
      const res = await fetch(`${API}/tool-calibration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create');
      showToast('Tool calibration record created successfully');
      setShowForm(false);
      setFormData({ ...emptyForm });
      fetchItems();
    } catch (err) {
      showToast('Failed to create tool calibration record', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const payload = {
        ...formData,
        calibration_interval_days: formData.calibration_interval_days ? Number(formData.calibration_interval_days) : null
      };
      const id = selectedItem._id || selectedItem.id;
      const res = await fetch(`${API}/tool-calibration/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update');
      showToast('Tool calibration record updated successfully');
      setEditMode(false);
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to update tool calibration record', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!window.confirm('Are you sure you want to delete this tool calibration record? This action cannot be undone.')) return;
    try {
      const id = selectedItem._id || selectedItem.id;
      const res = await fetch(`${API}/tool-calibration/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Tool calibration record deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to delete tool calibration record', 'error');
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
    setEditMode(false);
  };

  const openEdit = () => {
    setFormData({
      tool_id: selectedItem.tool_id || '',
      tool_name: selectedItem.tool_name || '',
      category: selectedItem.category || CATEGORIES[0],
      manufacturer: selectedItem.manufacturer || '',
      model_number: selectedItem.model_number || '',
      serial_number: selectedItem.serial_number || '',
      calibration_date: formatDateInput(selectedItem.calibration_date),
      next_calibration: formatDateInput(selectedItem.next_calibration),
      calibration_interval_days: selectedItem.calibration_interval_days || '',
      calibration_standard: selectedItem.calibration_standard || '',
      location: selectedItem.location || '',
      assigned_to: selectedItem.assigned_to || '',
      status: selectedItem.status || 'Calibrated',
      accuracy_rating: selectedItem.accuracy_rating || 'Pass',
      certificate_number: selectedItem.certificate_number || '',
      notes: selectedItem.notes || ''
    });
    setEditMode(true);
  };

  const openNewForm = () => {
    setFormData({ ...emptyForm });
    setShowForm(true);
  };

  const closeAll = () => {
    setShowForm(false);
    setShowDetail(false);
    setEditMode(false);
    setSelectedItem(null);
  };

  // --- Render Helpers ---

  const renderFormFields = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label>Tool ID</label>
          <input
            type="text" name="tool_id" value={formData.tool_id}
            onChange={handleFormChange} placeholder="e.g. TQ-001" required
          />
        </div>
        <div className="form-group">
          <label>Tool Name</label>
          <input
            type="text" name="tool_name" value={formData.tool_name}
            onChange={handleFormChange} placeholder="e.g. Torque Wrench" required
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select name="category" value={formData.category} onChange={handleFormChange}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Manufacturer</label>
          <input
            type="text" name="manufacturer" value={formData.manufacturer}
            onChange={handleFormChange} placeholder="e.g. Snap-on"
          />
        </div>
        <div className="form-group">
          <label>Model Number</label>
          <input
            type="text" name="model_number" value={formData.model_number}
            onChange={handleFormChange} placeholder="e.g. ATECH3FR250B"
          />
        </div>
        <div className="form-group">
          <label>Serial Number</label>
          <input
            type="text" name="serial_number" value={formData.serial_number}
            onChange={handleFormChange} placeholder="e.g. SN-2024-0042"
          />
        </div>
        <div className="form-group">
          <label>Calibration Date</label>
          <input type="date" name="calibration_date" value={formData.calibration_date} onChange={handleFormChange} />
        </div>
        <div className="form-group">
          <label>Next Calibration</label>
          <input type="date" name="next_calibration" value={formData.next_calibration} onChange={handleFormChange} />
        </div>
        <div className="form-group">
          <label>Calibration Interval (Days)</label>
          <input
            type="number" name="calibration_interval_days" value={formData.calibration_interval_days}
            onChange={handleFormChange} placeholder="e.g. 365" min="0"
          />
        </div>
        <div className="form-group">
          <label>Calibration Standard</label>
          <input
            type="text" name="calibration_standard" value={formData.calibration_standard}
            onChange={handleFormChange} placeholder="e.g. ISO 6789"
          />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input
            type="text" name="location" value={formData.location}
            onChange={handleFormChange} placeholder="e.g. Hangar 3B"
          />
        </div>
        <div className="form-group">
          <label>Assigned To</label>
          <input
            type="text" name="assigned_to" value={formData.assigned_to}
            onChange={handleFormChange} placeholder="e.g. John Smith"
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleFormChange}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Accuracy Rating</label>
          <select name="accuracy_rating" value={formData.accuracy_rating} onChange={handleFormChange}>
            {ACCURACY_RATINGS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Certificate Number</label>
          <input
            type="text" name="certificate_number" value={formData.certificate_number}
            onChange={handleFormChange} placeholder="e.g. CERT-2024-0042"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes" value={formData.notes}
          onChange={handleFormChange} placeholder="Additional notes about calibration..."
        />
      </div>
    </>
  );

  const renderForm = () => (
    <div className="modal-overlay" onClick={closeAll}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editMode ? 'Edit Tool Calibration' : 'New Tool Calibration'}</h2>
          <button className="btn btn-icon btn-secondary" onClick={closeAll} title="Close">&#x2715;</button>
        </div>
        <form onSubmit={editMode ? handleUpdate : handleCreate}>
          <div className="modal-body">
            {renderFormFields()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeAll}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editMode ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedItem) return null;

    return (
      <div className="modal-overlay" onClick={closeAll}>
        <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              {selectedItem.tool_name || 'Tool Calibration Record'}
              <span style={{ marginLeft: '12px' }}>
                <span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
              </span>
            </h2>
            <button className="btn btn-icon btn-secondary" onClick={closeAll} title="Close">&#x2715;</button>
          </div>
          <div className="modal-body">
            {editMode ? (
              <form onSubmit={handleUpdate}>
                {renderFormFields()}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Record</button>
                </div>
              </form>
            ) : (
              <>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Tool ID</label>
                    <div className="value">{selectedItem.tool_id || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Tool Name</label>
                    <div className="value">{selectedItem.tool_name || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Category</label>
                    <div className="value">{selectedItem.category || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Manufacturer</label>
                    <div className="value">{selectedItem.manufacturer || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Model Number</label>
                    <div className="value">{selectedItem.model_number || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Serial Number</label>
                    <div className="value">{selectedItem.serial_number || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Calibration Date</label>
                    <div className="value">{formatDate(selectedItem.calibration_date)}</div>
                  </div>
                  <div className="detail-item">
                    <label>Next Calibration</label>
                    <div className="value">{formatDate(selectedItem.next_calibration)}</div>
                  </div>
                  <div className="detail-item">
                    <label>Calibration Interval (Days)</label>
                    <div className="value">{selectedItem.calibration_interval_days || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Calibration Standard</label>
                    <div className="value">{selectedItem.calibration_standard || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Location</label>
                    <div className="value">{selectedItem.location || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Assigned To</label>
                    <div className="value">{selectedItem.assigned_to || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <div className="value">
                      <span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Accuracy Rating</label>
                    <div className="value">
                      <span className={`badge ${getAccuracyBadge(selectedItem.accuracy_rating)}`}>{selectedItem.accuracy_rating || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Certificate Number</label>
                    <div className="value">{selectedItem.certificate_number || '—'}</div>
                  </div>
                </div>

                {selectedItem.notes && (
                  <div style={{ marginTop: '20px' }}>
                    <label>Notes</label>
                    <div className="value" style={{ marginTop: '6px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                      {selectedItem.notes}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {!editMode && (
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={openEdit}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          )}
          {toast.type === 'error' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Tool Calibration Tracking</h1>
          <p className="subtitle">Track and manage tool calibration schedules</p>
        </div>
        <button className="btn btn-primary" onClick={openNewForm}>+ New Tool</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Loading tool calibration records...</div>
          <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Please wait</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>No tool calibration records found</div>
          <p style={{ marginBottom: '20px' }}>Get started by creating your first tool calibration record.</p>
          <button className="btn btn-primary" onClick={openNewForm}>+ New Tool</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tool ID</th>
                <th>Tool Name</th>
                <th>Category</th>
                <th>Next Calibration</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item._id || item.id || idx}
                  onClick={() => openDetail(item)}
                  style={getRowStyle(item.status)}
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.tool_id || '—'}</td>
                  <td>{item.tool_name || '—'}</td>
                  <td>{item.category || '—'}</td>
                  <td>{formatDate(item.next_calibration)}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status || '—'}</span></td>
                  <td><span className={`badge ${getAccuracyBadge(item.accuracy_rating)}`}>{item.accuracy_rating || '—'}</span></td>
                  <td>{item.assigned_to || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showForm && renderForm()}
      {showDetail && renderDetail()}
    </div>
  );
}

export default ToolCalibration;
