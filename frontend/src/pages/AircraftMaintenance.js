import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const AIRCRAFT_TYPES = [
  'Boeing 737-800', 'Boeing 787-9', 'Airbus A320neo',
  'Airbus A350-900', 'Embraer E175', 'Bombardier CRJ-900'
];

const MAINTENANCE_TYPES = [
  'A-Check', 'B-Check', 'C-Check', 'D-Check',
  'Engine Overhaul', 'Landing Gear Inspection', 'Avionics Update', 'Corrosion Treatment'
];

const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const emptyForm = {
  aircraft_reg: '',
  aircraft_type: AIRCRAFT_TYPES[0],
  maintenance_type: MAINTENANCE_TYPES[0],
  scheduled_date: '',
  due_date: '',
  status: 'Scheduled',
  priority: 'Medium',
  assigned_team: '',
  estimated_hours: '',
  description: '',
  hangar_location: ''
};

function getStatusBadge(status) {
  const map = {
    'Completed': 'badge-success',
    'In Progress': 'badge-info',
    'Scheduled': 'badge-warning',
    'Deferred': 'badge-secondary',
    'Cancelled': 'badge-danger'
  };
  return map[status] || 'badge-secondary';
}

function getPriorityBadge(priority) {
  const map = {
    'Critical': 'badge-danger',
    'High': 'badge-warning',
    'Medium': 'badge-info',
    'Low': 'badge-success'
  };
  return map[priority] || 'badge-secondary';
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

function parseAiResponse(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const isHeader = trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.includes('. ')
      || trimmed.startsWith('## ')
      || trimmed.startsWith('**') && trimmed.endsWith('**');

    if (isHeader) {
      const title = trimmed.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:$/, '');
      current = { title, content: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { title: '', content: [] };
        sections.push(current);
      }
      current.content.push(trimmed);
    }
  });

  return sections;
}

function AircraftMaintenance({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/aircraft-maintenance`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load maintenance records', 'error');
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
        estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : null
      };
      const res = await fetch(`${API}/aircraft-maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create');
      showToast('Maintenance record created successfully');
      setShowForm(false);
      setFormData({ ...emptyForm });
      fetchItems();
    } catch (err) {
      showToast('Failed to create maintenance record', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const payload = {
        ...formData,
        estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : null
      };
      const id = selectedItem._id || selectedItem.id;
      const res = await fetch(`${API}/aircraft-maintenance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update');
      showToast('Maintenance record updated successfully');
      setEditMode(false);
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to update maintenance record', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!window.confirm('Are you sure you want to delete this maintenance record? This action cannot be undone.')) return;
    try {
      const id = selectedItem._id || selectedItem.id;
      const res = await fetch(`${API}/aircraft-maintenance/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Maintenance record deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      showToast('Failed to delete maintenance record', 'error');
    }
  };

  const handleAiAnalysis = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/downtime-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(selectedItem)
      });
      if (!res.ok) throw new Error('AI analysis failed');
      const data = await res.json();
      const text = data.prediction || data.analysis || data.result || data.response || JSON.stringify(data, null, 2);
      setAiResult(text);
    } catch (err) {
      showToast('AI analysis failed. Please try again.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
    setEditMode(false);
    setAiResult(null);
  };

  const openEdit = () => {
    setFormData({
      aircraft_reg: selectedItem.aircraft_reg || '',
      aircraft_type: selectedItem.aircraft_type || AIRCRAFT_TYPES[0],
      maintenance_type: selectedItem.maintenance_type || MAINTENANCE_TYPES[0],
      scheduled_date: formatDateInput(selectedItem.scheduled_date),
      due_date: formatDateInput(selectedItem.due_date),
      status: selectedItem.status || 'Scheduled',
      priority: selectedItem.priority || 'Medium',
      assigned_team: selectedItem.assigned_team || '',
      estimated_hours: selectedItem.estimated_hours || '',
      description: selectedItem.description || '',
      hangar_location: selectedItem.hangar_location || ''
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
    setAiResult(null);
  };

  // --- Render Helpers ---

  const renderFormFields = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label>Aircraft Registration</label>
          <input
            type="text" name="aircraft_reg" value={formData.aircraft_reg}
            onChange={handleFormChange} placeholder="e.g. N12345" required
          />
        </div>
        <div className="form-group">
          <label>Aircraft Type</label>
          <select name="aircraft_type" value={formData.aircraft_type} onChange={handleFormChange}>
            {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Maintenance Type</label>
          <select name="maintenance_type" value={formData.maintenance_type} onChange={handleFormChange}>
            {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleFormChange}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Scheduled Date</label>
          <input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleFormChange} required />
        </div>
        <div className="form-group">
          <label>Due Date</label>
          <input type="date" name="due_date" value={formData.due_date} onChange={handleFormChange} />
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select name="priority" value={formData.priority} onChange={handleFormChange}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Estimated Hours</label>
          <input
            type="number" name="estimated_hours" value={formData.estimated_hours}
            onChange={handleFormChange} placeholder="e.g. 48" min="0"
          />
        </div>
        <div className="form-group">
          <label>Assigned Team</label>
          <input
            type="text" name="assigned_team" value={formData.assigned_team}
            onChange={handleFormChange} placeholder="e.g. Team Alpha"
          />
        </div>
        <div className="form-group">
          <label>Hangar Location</label>
          <input
            type="text" name="hangar_location" value={formData.hangar_location}
            onChange={handleFormChange} placeholder="e.g. Hangar 3B"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description" value={formData.description}
          onChange={handleFormChange} placeholder="Describe the maintenance work..."
        />
      </div>
    </>
  );

  const renderForm = () => (
    <div className="modal-overlay" onClick={closeAll}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editMode ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h2>
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

  const renderAiResult = () => {
    if (aiLoading) {
      return (
        <div className="ai-loading">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 1s ease-in-out infinite' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Analyzing maintenance data with AI...
        </div>
      );
    }

    if (!aiResult) return null;

    const sections = parseAiResponse(aiResult);

    return (
      <div className="ai-result">
        <h3>AI Downtime Prediction Analysis</h3>
        {sections.length > 0 ? (
          sections.map((section, idx) => (
            <div className="ai-section" key={idx}>
              {section.title && <div className="ai-section-title">{section.title}</div>}
              <div className="ai-result-content">
                {section.content.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="ai-result-content">{aiResult}</div>
        )}
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedItem) return null;

    return (
      <div className="modal-overlay" onClick={closeAll}>
        <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              {selectedItem.aircraft_reg || 'Maintenance Record'}
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
                    <label>Aircraft Registration</label>
                    <div className="value">{selectedItem.aircraft_reg || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Aircraft Type</label>
                    <div className="value">{selectedItem.aircraft_type || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Maintenance Type</label>
                    <div className="value">{selectedItem.maintenance_type || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <div className="value">
                      <span className={`badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Priority</label>
                    <div className="value">
                      <span className={`badge ${getPriorityBadge(selectedItem.priority)}`}>{selectedItem.priority || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Scheduled Date</label>
                    <div className="value">{formatDate(selectedItem.scheduled_date)}</div>
                  </div>
                  <div className="detail-item">
                    <label>Due Date</label>
                    <div className="value">{formatDate(selectedItem.due_date)}</div>
                  </div>
                  <div className="detail-item">
                    <label>Estimated Hours</label>
                    <div className="value">{selectedItem.estimated_hours ? `${selectedItem.estimated_hours} hrs` : '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Assigned Team</label>
                    <div className="value">{selectedItem.assigned_team || '—'}</div>
                  </div>
                  <div className="detail-item">
                    <label>Hangar Location</label>
                    <div className="value">{selectedItem.hangar_location || '—'}</div>
                  </div>
                </div>

                {selectedItem.description && (
                  <div style={{ marginTop: '20px' }}>
                    <label>Description</label>
                    <div className="value" style={{ marginTop: '6px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                      {selectedItem.description}
                    </div>
                  </div>
                )}

                {renderAiResult()}
              </>
            )}
          </div>
          {!editMode && (
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleAiAnalysis} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI Analysis'}
              </button>
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
          <h1>Aircraft Maintenance</h1>
          <p className="subtitle">Scheduling, tracking, and AI-powered analysis</p>
        </div>
        <button className="btn btn-primary" onClick={openNewForm}>+ New Maintenance</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Loading maintenance records...</div>
          <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Please wait</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>No maintenance records found</div>
          <p style={{ marginBottom: '20px' }}>Get started by creating your first maintenance record.</p>
          <button className="btn btn-primary" onClick={openNewForm}>+ New Maintenance</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Aircraft Reg</th>
                <th>Type</th>
                <th>Maintenance</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item._id || item.id || idx} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.aircraft_reg || '—'}</td>
                  <td>{item.aircraft_type || '—'}</td>
                  <td>{item.maintenance_type || '—'}</td>
                  <td>{formatDate(item.scheduled_date)}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status || '—'}</span></td>
                  <td><span className={`badge ${getPriorityBadge(item.priority)}`}>{item.priority || '—'}</span></td>
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

export default AircraftMaintenance;
