import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const HANGAR_TYPES = ['Wide Body', 'Narrow Body', 'Regional', 'General'];
const STATUS_OPTIONS = ['Available', 'Occupied', 'Under Maintenance', 'Reserved'];

const emptyForm = {
  hangar_code: '', hangar_name: '', location: '', capacity: '', current_occupancy: '',
  aircraft_reg: '', hangar_type: '', status: '', equipment_available: '',
  contact_person: '', phone: '', daily_rate: '', notes: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Available': return 'badge-success';
    case 'Occupied': return 'badge-warning';
    case 'Under Maintenance': return 'badge-danger';
    case 'Reserved': return 'badge-info';
    default: return 'badge-secondary';
  }
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const renderOccupancyBar = (current, total) => {
  const c = Number(current) || 0;
  const t = Number(total) || 1;
  const pct = Math.min(Math.round((c / t) * 100), 100);
  let color = 'var(--success)';
  if (pct > 80) color = 'var(--danger)';
  else if (pct > 50) color = '#f59e0b';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
      <div style={{
        flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color, borderRadius: '4px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {c}/{t}
      </span>
    </div>
  );
};

function HangarManagement({ token }) {
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
      const res = await fetch(`${API}/hangar-management`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load hangars', 'error');
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
    const url = editMode ? `${API}/hangar-management/${selectedItem.id}` : `${API}/hangar-management`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Hangar updated successfully' : 'Hangar added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save hangar', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hangar?')) return;
    try {
      const res = await fetch(`${API}/hangar-management/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Hangar deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete hangar', 'error');
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
      hangar_code: item.hangar_code || '',
      hangar_name: item.hangar_name || '',
      location: item.location || '',
      capacity: item.capacity || '',
      current_occupancy: item.current_occupancy || '',
      aircraft_reg: item.aircraft_reg || '',
      hangar_type: item.hangar_type || '',
      status: item.status || '',
      equipment_available: item.equipment_available || '',
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      daily_rate: item.daily_rate || '',
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
          <h1>Hangar Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Track hangar bays, capacity, and aircraft assignments
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Hangar</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading hangars...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No hangars found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first hangar to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Hangar Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th>Aircraft</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600 }}>{item.hangar_code}</td>
                  <td>{item.hangar_name}</td>
                  <td>{item.hangar_type || '-'}</td>
                  <td>{item.capacity || 0}</td>
                  <td>{renderOccupancyBar(item.current_occupancy, item.capacity)}</td>
                  <td style={{ fontWeight: 600 }}>{item.aircraft_reg || '-'}</td>
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
              <h2>{selectedItem.hangar_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Hangar Code & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hangar Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.hangar_code}</div>
                </div>
                <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                  {selectedItem.status}
                </span>
              </div>

              {/* Capacity Utilization */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Capacity Utilization</label>
                <div style={{ marginBottom: '8px' }}>
                  {renderOccupancyBar(selectedItem.current_occupancy, selectedItem.capacity)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Capacity</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{selectedItem.capacity || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Occupancy</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{selectedItem.current_occupancy || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Slots</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {(Number(selectedItem.capacity) || 0) - (Number(selectedItem.current_occupancy) || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hangar Details */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Hangar Type</label><div className="value">{selectedItem.hangar_type || '-'}</div></div>
                <div className="detail-item"><label>Location</label><div className="value">{selectedItem.location || '-'}</div></div>
                <div className="detail-item"><label>Aircraft Assigned</label><div className="value">{selectedItem.aircraft_reg || '-'}</div></div>
                <div className="detail-item"><label>Contact Person</label><div className="value">{selectedItem.contact_person || '-'}</div></div>
                <div className="detail-item"><label>Phone</label><div className="value">{selectedItem.phone || '-'}</div></div>
              </div>

              {/* Equipment */}
              {selectedItem.equipment_available && (
                <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Equipment Available</label>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedItem.equipment_available}</div>
                </div>
              )}

              {/* Financial Info */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Financial Info</label>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                    {formatCurrency(selectedItem.daily_rate)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Notes</label>
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
              <h2>{editMode ? 'Edit Hangar' : 'Add Hangar'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Hangar Code</label>
                    <input name="hangar_code" value={formData.hangar_code} onChange={handleChange} required placeholder="e.g. HGR-001" />
                  </div>
                  <div className="form-group">
                    <label>Hangar Name</label>
                    <input name="hangar_name" value={formData.hangar_name} onChange={handleChange} required placeholder="Hangar name" />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Terminal A, Bay 3" />
                  </div>
                  <div className="form-group">
                    <label>Hangar Type</label>
                    <select name="hangar_type" value={formData.hangar_type} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {HANGAR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Capacity</label>
                    <input name="capacity" type="number" value={formData.capacity} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Current Occupancy</label>
                    <input name="current_occupancy" type="number" value={formData.current_occupancy} onChange={handleChange} min="0" placeholder="0" />
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
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Contact name" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1-555-0100" />
                  </div>
                  <div className="form-group">
                    <label>Daily Rate ($)</label>
                    <input name="daily_rate" type="number" value={formData.daily_rate} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Equipment Available</label>
                    <input name="equipment_available" value={formData.equipment_available} onChange={handleChange} placeholder="e.g. Crane, Jacks, Scaffolding" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Additional notes..." />
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

export default HangarManagement;
