import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD', 'Prepaid'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Suspended', 'Pending Review'];

const emptyForm = {
  vendor_code: '', company_name: '', contact_name: '', email: '', phone: '',
  address: '', city: '', country: '', specialization: '', rating: '',
  contract_start: '', contract_end: '', payment_terms: '', status: '',
  total_orders: '', total_spent: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Active': return 'badge-success';
    case 'Inactive': return 'badge-secondary';
    case 'Suspended': return 'badge-danger';
    case 'Pending Review': return 'badge-warning';
    default: return 'badge-secondary';
  }
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const renderStars = (rating) => {
  const r = Number(rating) || 0;
  const full = Math.floor(r);
  const partial = r - full;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<span key={i} style={{ color: '#f59e0b', fontSize: '1rem' }}>&#9733;</span>);
    } else if (i === full && partial > 0) {
      stars.push(
        <span key={i} style={{ position: 'relative', display: 'inline-block', fontSize: '1rem' }}>
          <span style={{ color: 'var(--border)' }}>&#9733;</span>
          <span style={{
            position: 'absolute', left: 0, top: 0, overflow: 'hidden',
            width: `${partial * 100}%`, color: '#f59e0b'
          }}>&#9733;</span>
        </span>
      );
    } else {
      stars.push(<span key={i} style={{ color: 'var(--border)', fontSize: '1rem' }}>&#9733;</span>);
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ display: 'inline-flex', gap: '1px' }}>{stars}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{r.toFixed(2)}</span>
    </div>
  );
};

function Vendors({ token }) {
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
      const res = await fetch(`${API}/vendors`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load vendors', 'error');
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
    const url = editMode ? `${API}/vendors/${selectedItem.id}` : `${API}/vendors`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Vendor updated successfully' : 'Vendor added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save vendor', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;
    try {
      const res = await fetch(`${API}/vendors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Vendor deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete vendor', 'error');
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
      vendor_code: item.vendor_code || '',
      company_name: item.company_name || '',
      contact_name: item.contact_name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      city: item.city || '',
      country: item.country || '',
      specialization: item.specialization || '',
      rating: item.rating || '',
      contract_start: item.contract_start ? item.contract_start.split('T')[0] : '',
      contract_end: item.contract_end ? item.contract_end.split('T')[0] : '',
      payment_terms: item.payment_terms || '',
      status: item.status || '',
      total_orders: item.total_orders || '',
      total_spent: item.total_spent || ''
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
          <h1>Vendor Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Manage suppliers, contracts, and vendor performance
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Vendor</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading vendors...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No vendors found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first vendor to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Specialization</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600 }}>{item.vendor_code}</td>
                  <td>{item.company_name}</td>
                  <td>{item.contact_name}</td>
                  <td>{item.specialization || '-'}</td>
                  <td>{renderStars(item.rating)}</td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(item.total_spent)}</td>
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
              <h2>{selectedItem.company_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Vendor Code & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vendor Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.vendor_code}</div>
                </div>
                <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                  {selectedItem.status}
                </span>
              </div>

              {/* Rating */}
              <div style={{ marginBottom: '20px', textAlign: 'center', padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Vendor Rating</label>
                <div style={{ marginTop: '8px' }}>{renderStars(selectedItem.rating)}</div>
              </div>

              {/* Contact Details */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Contact Name</label><div className="value">{selectedItem.contact_name || '-'}</div></div>
                <div className="detail-item"><label>Email</label><div className="value">{selectedItem.email || '-'}</div></div>
                <div className="detail-item"><label>Phone</label><div className="value">{selectedItem.phone || '-'}</div></div>
                <div className="detail-item"><label>Specialization</label><div className="value">{selectedItem.specialization || '-'}</div></div>
                <div className="detail-item"><label>Address</label><div className="value">{selectedItem.address || '-'}</div></div>
                <div className="detail-item"><label>City</label><div className="value">{selectedItem.city || '-'}</div></div>
                <div className="detail-item"><label>Country</label><div className="value">{selectedItem.country || '-'}</div></div>
              </div>

              {/* Contract Period */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Contract Details</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract Start</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.contract_start)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract End</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatDate(selectedItem.contract_end)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Terms</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedItem.payment_terms || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Financial Summary</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Orders</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {Number(selectedItem.total_orders || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Spent</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {formatCurrency(selectedItem.total_spent)}
                    </div>
                  </div>
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
              <h2>{editMode ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Vendor Code</label>
                    <input name="vendor_code" value={formData.vendor_code} onChange={handleChange} required placeholder="e.g. VND-001" />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input name="company_name" value={formData.company_name} onChange={handleChange} required placeholder="Company name" />
                  </div>
                  <div className="form-group">
                    <label>Contact Name</label>
                    <input name="contact_name" value={formData.contact_name} onChange={handleChange} placeholder="Contact person" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1-555-0100" />
                  </div>
                  <div className="form-group">
                    <label>Specialization</label>
                    <input name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g. Avionics, Engines" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Address</label>
                    <input name="address" value={formData.address} onChange={handleChange} placeholder="Street address" />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
                  </div>
                  <div className="form-group">
                    <label>Rating (1-5)</label>
                    <input name="rating" type="number" value={formData.rating} onChange={handleChange} min="1" max="5" step="0.01" placeholder="1.00 - 5.00" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} required>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contract Start</label>
                    <input name="contract_start" type="date" value={formData.contract_start} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Contract End</label>
                    <input name="contract_end" type="date" value={formData.contract_end} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Payment Terms</label>
                    <select name="payment_terms" value={formData.payment_terms} onChange={handleChange}>
                      <option value="">Select terms...</option>
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Total Orders</label>
                    <input name="total_orders" type="number" value={formData.total_orders} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Total Spent ($)</label>
                    <input name="total_spent" type="number" value={formData.total_spent} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
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

export default Vendors;
