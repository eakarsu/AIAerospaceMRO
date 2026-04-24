import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const CUSTOMER_TYPES = ['Airline', 'Charter', 'Cargo', 'Military', 'Private'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Prospect', 'Suspended'];

const emptyForm = {
  customer_code: '', company_name: '', contact_name: '', email: '', phone: '',
  address: '', city: '', country: '', customer_type: '', fleet_size: '',
  contract_start: '', contract_end: '', account_manager: '', credit_limit: '',
  total_revenue: '', total_work_orders: '', status: '', notes: ''
};

const statusBadge = (status) => {
  switch (status) {
    case 'Active': return 'badge-success';
    case 'Inactive': return 'badge-secondary';
    case 'Prospect': return 'badge-info';
    case 'Suspended': return 'badge-danger';
    default: return 'badge-secondary';
  }
};

const typeBadge = (type) => {
  switch (type) {
    case 'Airline': return 'badge-primary';
    case 'Charter': return 'badge-info';
    case 'Cargo': return 'badge-warning';
    case 'Military': return 'badge-danger';
    case 'Private': return 'badge-secondary';
    default: return 'badge-secondary';
  }
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

function Customers({ token }) {
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
      const res = await fetch(`${API}/customers`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load customers', 'error');
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
    const url = editMode ? `${API}/customers/${selectedItem.id}` : `${API}/customers`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Customer updated successfully' : 'Customer added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save customer', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      const res = await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Customer deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete customer', 'error');
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
      customer_code: item.customer_code || '',
      company_name: item.company_name || '',
      contact_name: item.contact_name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      city: item.city || '',
      country: item.country || '',
      customer_type: item.customer_type || '',
      fleet_size: item.fleet_size || '',
      contract_start: item.contract_start ? item.contract_start.split('T')[0] : '',
      contract_end: item.contract_end ? item.contract_end.split('T')[0] : '',
      account_manager: item.account_manager || '',
      credit_limit: item.credit_limit || '',
      total_revenue: item.total_revenue || '',
      total_work_orders: item.total_work_orders || '',
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
          <h1>Customer Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Manage airline and operator client accounts
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading customers...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No customers found</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first customer to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer Code</th>
                <th>Company</th>
                <th>Type</th>
                <th>Fleet Size</th>
                <th>Total Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600 }}>{item.customer_code}</td>
                  <td>{item.company_name}</td>
                  <td><span className={`badge ${typeBadge(item.customer_type)}`}>{item.customer_type || '-'}</span></td>
                  <td>{Number(item.fleet_size || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(item.total_revenue)}</td>
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
              <h2>{selectedItem.company_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Customer Code & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Code</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.customer_code}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${typeBadge(selectedItem.customer_type)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.customer_type}
                  </span>
                  <span className={`badge ${statusBadge(selectedItem.status)}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="detail-grid" style={{ marginBottom: '20px' }}>
                <div className="detail-item"><label>Contact Name</label><div className="value">{selectedItem.contact_name || '-'}</div></div>
                <div className="detail-item"><label>Email</label><div className="value">{selectedItem.email || '-'}</div></div>
                <div className="detail-item"><label>Phone</label><div className="value">{selectedItem.phone || '-'}</div></div>
                <div className="detail-item"><label>Account Manager</label><div className="value">{selectedItem.account_manager || '-'}</div></div>
                <div className="detail-item"><label>Address</label><div className="value">{selectedItem.address || '-'}</div></div>
                <div className="detail-item"><label>City</label><div className="value">{selectedItem.city || '-'}</div></div>
                <div className="detail-item"><label>Country</label><div className="value">{selectedItem.country || '-'}</div></div>
                <div className="detail-item"><label>Fleet Size</label><div className="value">{Number(selectedItem.fleet_size || 0).toLocaleString()}</div></div>
              </div>

              {/* Contract Details */}
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credit Limit</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{formatCurrency(selectedItem.credit_limit)}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Financial Summary</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Work Orders</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {Number(selectedItem.total_work_orders || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {formatCurrency(selectedItem.total_revenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Notes</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{selectedItem.notes}</div>
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
              <h2>{editMode ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Customer Code</label>
                    <input name="customer_code" value={formData.customer_code} onChange={handleChange} required placeholder="e.g. CUS-001" />
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
                    <label>Customer Type</label>
                    <select name="customer_type" value={formData.customer_type} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
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
                    <label>Fleet Size</label>
                    <input name="fleet_size" type="number" value={formData.fleet_size} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Account Manager</label>
                    <input name="account_manager" value={formData.account_manager} onChange={handleChange} placeholder="Manager name" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} required>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Credit Limit ($)</label>
                    <input name="credit_limit" type="number" value={formData.credit_limit} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
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
                    <label>Total Work Orders</label>
                    <input name="total_work_orders" type="number" value={formData.total_work_orders} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Total Revenue ($)</label>
                    <input name="total_revenue" type="number" value={formData.total_revenue} onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
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

export default Customers;
