import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const WARRANTY_TYPES = ['Full', 'Limited', 'Extended', 'Prorated'];
const CLAIM_STATUS_OPTIONS = ['No Claim', 'Pending', 'Approved', 'Denied', 'In Review'];
const STATUS_OPTIONS = ['Active', 'Expired', 'Voided', 'Claimed'];

const emptyForm = {
  warranty_number: '', part_number: '', part_name: '', serial_number: '',
  vendor_name: '', purchase_date: '', warranty_start: '', expiry_date: '',
  warranty_type: '', coverage_details: '', claim_status: '', claim_amount: '',
  claim_date: '', claim_description: '', status: '', aircraft_reg: '', notes: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Active': return 'badge-success';
    case 'Expired': return 'badge-danger';
    case 'Voided': return 'badge-secondary';
    case 'Claimed': return 'badge-warning';
    default: return 'badge-secondary';
  }
};

const claimStatusBadge = (status) => {
  switch (status) {
    case 'No Claim': return 'badge-secondary';
    case 'Pending': return 'badge-warning';
    case 'Approved': return 'badge-success';
    case 'Denied': return 'badge-danger';
    case 'In Review': return 'badge-info';
    default: return 'badge-secondary';
  }
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const getRowStyle = (expiry_date) => {
  if (!expiry_date) return {};
  const now = new Date();
  const expiry = new Date(expiry_date);
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { backgroundColor: 'rgba(239, 68, 68, 0.15)' };
  if (diffDays <= 90) return { backgroundColor: 'rgba(245, 158, 11, 0.15)' };
  return {};
};

function WarrantyTracking({ token }) {
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
      const res = await fetch(`${API}/warranty-tracking`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load warranties', 'error');
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
    const url = editMode ? `${API}/warranty-tracking/${selectedItem.id}` : `${API}/warranty-tracking`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Warranty updated successfully' : 'Warranty added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save warranty', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this warranty?')) return;
    try {
      const res = await fetch(`${API}/warranty-tracking/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Warranty deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete warranty', 'error');
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
      warranty_number: item.warranty_number || '',
      part_number: item.part_number || '',
      part_name: item.part_name || '',
      serial_number: item.serial_number || '',
      vendor_name: item.vendor_name || '',
      purchase_date: item.purchase_date ? item.purchase_date.split('T')[0] : '',
      warranty_start: item.warranty_start ? item.warranty_start.split('T')[0] : '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      warranty_type: item.warranty_type || '',
      coverage_details: item.coverage_details || '',
      claim_status: item.claim_status || '',
      claim_amount: item.claim_amount || '',
      claim_date: item.claim_date ? item.claim_date.split('T')[0] : '',
      claim_description: item.claim_description || '',
      status: item.status || '',
      aircraft_reg: item.aircraft_reg || '',
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
          <h1>Warranty Tracking</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Track part warranties, claims, and coverage
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Warranty</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading warranties...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No warranties found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first warranty to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Warranty #</th>
                <th>Part</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Expiry Date</th>
                <th>Claim Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)} style={getRowStyle(item.expiry_date)}>
                  <td style={{ fontWeight: 600 }}>{item.warranty_number}</td>
                  <td>{item.part_name || item.part_number || '-'}</td>
                  <td>{item.vendor_name || '-'}</td>
                  <td>{item.warranty_type || '-'}</td>
                  <td>{formatDate(item.expiry_date)}</td>
                  <td><span className={`badge ${claimStatusBadge(item.claim_status)}`}>{item.claim_status || '-'}</span></td>
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
              <h2>Warranty {selectedItem.warranty_number}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Warranty Number & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Warranty Number</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.warranty_number}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.status}
                  </span>
                  <span className={`badge ${claimStatusBadge(selectedItem.claim_status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.claim_status}
                  </span>
                </div>
              </div>

              {/* Part & Vendor Details */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Part Number</label><div className="value">{selectedItem.part_number || '-'}</div></div>
                <div className="detail-item"><label>Part Name</label><div className="value">{selectedItem.part_name || '-'}</div></div>
                <div className="detail-item"><label>Serial Number</label><div className="value">{selectedItem.serial_number || '-'}</div></div>
                <div className="detail-item"><label>Vendor</label><div className="value">{selectedItem.vendor_name || '-'}</div></div>
                <div className="detail-item"><label>Aircraft Reg</label><div className="value">{selectedItem.aircraft_reg || '-'}</div></div>
                <div className="detail-item"><label>Warranty Type</label><div className="value">{selectedItem.warranty_type || '-'}</div></div>
              </div>

              {/* Warranty Period */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Warranty Period</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purchase Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.purchase_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warranty Start</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.warranty_start)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.expiry_date)}</div>
                  </div>
                </div>
              </div>

              {/* Coverage Details */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Coverage Details</label>
                <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedItem.coverage_details || 'No coverage details provided.'}
                </div>
              </div>

              {/* Claim Information */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Claim Information</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claim Status</div>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge ${claimStatusBadge(selectedItem.claim_status)}`}>{selectedItem.claim_status || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claim Amount</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {formatCurrency(selectedItem.claim_amount)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claim Date</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.claim_date)}</div>
                  </div>
                </div>
                {selectedItem.claim_description && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Claim Description</div>
                    <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{selectedItem.claim_description}</div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Notes</label>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{selectedItem.notes}</div>
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
              <h2>{editMode ? 'Edit Warranty' : 'Add Warranty'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Warranty Number</label>
                    <input name="warranty_number" value={formData.warranty_number} onChange={handleChange} required placeholder="e.g. WRN-001" />
                  </div>
                  <div className="form-group">
                    <label>Part Number</label>
                    <input name="part_number" value={formData.part_number} onChange={handleChange} required placeholder="e.g. PN-12345" />
                  </div>
                  <div className="form-group">
                    <label>Part Name</label>
                    <input name="part_name" value={formData.part_name} onChange={handleChange} placeholder="Part description" />
                  </div>
                  <div className="form-group">
                    <label>Serial Number</label>
                    <input name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="Serial number" />
                  </div>
                  <div className="form-group">
                    <label>Vendor Name</label>
                    <input name="vendor_name" value={formData.vendor_name} onChange={handleChange} placeholder="Vendor / Supplier" />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={formData.aircraft_reg} onChange={handleChange} placeholder="e.g. N12345" />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input name="purchase_date" type="date" value={formData.purchase_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Warranty Start</label>
                    <input name="warranty_start" type="date" value={formData.warranty_start} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Warranty Type</label>
                    <select name="warranty_type" value={formData.warranty_type} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {WARRANTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} required>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Claim Status</label>
                    <select name="claim_status" value={formData.claim_status} onChange={handleChange}>
                      <option value="">Select claim status...</option>
                      {CLAIM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Claim Amount ($)</label>
                    <input name="claim_amount" type="number" value={formData.claim_amount} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Claim Date</label>
                    <input name="claim_date" type="date" value={formData.claim_date} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Coverage Details</label>
                    <textarea name="coverage_details" value={formData.coverage_details} onChange={handleChange} rows="3" placeholder="Describe warranty coverage..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Claim Description</label>
                    <textarea name="claim_description" value={formData.claim_description} onChange={handleChange} rows="3" placeholder="Describe the claim if applicable..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="Additional notes..." />
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

export default WarrantyTracking;
