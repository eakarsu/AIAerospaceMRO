import React, { useState, useEffect } from 'react';
import { API } from '../App';

const CATEGORIES = ['Engine', 'Avionics', 'Hydraulic', 'Structural', 'Electrical', 'Consumable', 'Landing Gear', 'Pneumatic', 'Fuel System', 'Safety Equipment'];
const CONDITION_CODES = ['NEW', 'OH', 'SV', 'AR', 'INS'];

const emptyForm = {
  part_number: '', part_name: '', category: '', quantity: '', min_quantity: '', unit_cost: '',
  location: '', warehouse: '', supplier: '', condition_code: '', certification: '',
  last_received: '', expiry_date: ''
};

function Inventory({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (v) => {
    const num = parseFloat(v) || 0;
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const isLowStock = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const minQty = parseFloat(item.min_quantity) || 0;
    return qty <= minQty && minQty > 0;
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/inventory`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      setItems(data.records || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/inventory/${selected.id}` : `${API}/inventory`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editing ? 'Inventory item updated successfully' : 'Inventory item created successfully');
      setShowForm(false);
      setEditing(false);
      setSelected(null);
      setForm(emptyForm);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      const res = await fetch(`${API}/inventory/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Inventory item deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = () => {
    setForm({
      part_number: selected.part_number || '',
      part_name: selected.part_name || '',
      category: selected.category || '',
      quantity: selected.quantity || '',
      min_quantity: selected.min_quantity || '',
      unit_cost: selected.unit_cost || '',
      location: selected.location || '',
      warehouse: selected.warehouse || '',
      supplier: selected.supplier || '',
      condition_code: selected.condition_code || '',
      certification: selected.certification || '',
      last_received: selected.last_received ? selected.last_received.substring(0, 10) : '',
      expiry_date: selected.expiry_date ? selected.expiry_date.substring(0, 10) : ''
    });
    setEditing(true);
    setShowForm(true);
  };

  const getStockBadge = (item) => {
    if (isLowStock(item)) {
      return <span className="badge badge-danger">Low Stock</span>;
    }
    return <span className="badge badge-success">In Stock</span>;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(true);
  };

  const totalValue = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p className="subtitle">Track parts, supplies, and stock levels</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Item</button>
      </div>

      {loading && <div className="ai-loading">Loading inventory...</div>}
      {error && <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px' }}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No inventory items found</p>
          <p>Add your first inventory item to get started.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Part Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Min Qty</th>
                <th>Unit Cost</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={isLowStock(item) ? { borderLeft: '4px solid var(--warning)' } : {}}
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.part_number || '-'}</td>
                  <td>{item.part_name || '-'}</td>
                  <td>{item.category || '-'}</td>
                  <td style={isLowStock(item) ? { color: 'var(--danger)', fontWeight: 700 } : {}}>{item.quantity ?? '-'}</td>
                  <td>{item.min_quantity ?? '-'}</td>
                  <td>{formatCurrency(item.unit_cost)}</td>
                  <td>{getStockBadge(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && !showForm && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Part: {selected.part_number || 'N/A'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>{getStockBadge(selected)}</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Part Number</label>
                  <div className="value">{selected.part_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Part Name</label>
                  <div className="value">{selected.part_name || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Category</label>
                  <div className="value">{selected.category || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Condition Code</label>
                  <div className="value">{selected.condition_code || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Quantity</label>
                  <div className="value" style={isLowStock(selected) ? { color: 'var(--danger)', fontWeight: 700 } : {}}>
                    {selected.quantity ?? '-'}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Min Quantity</label>
                  <div className="value">{selected.min_quantity ?? '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Unit Cost</label>
                  <div className="value">{formatCurrency(selected.unit_cost)}</div>
                </div>
                <div className="detail-item">
                  <label>Total Value</label>
                  <div className="value" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {formatCurrency(totalValue(selected))}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Location</label>
                  <div className="value">{selected.location || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Warehouse</label>
                  <div className="value">{selected.warehouse || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Supplier</label>
                  <div className="value">{selected.supplier || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Certification</label>
                  <div className="value">{selected.certification || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Last Received</label>
                  <div className="value">{formatDate(selected.last_received)}</div>
                </div>
                <div className="detail-item">
                  <label>Expiry Date</label>
                  <div className="value">{formatDate(selected.expiry_date)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Inventory Item' : 'New Inventory Item'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditing(false); }}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="form-group">
                    <label>Part Number</label>
                    <input name="part_number" value={form.part_number} onChange={handleChange} placeholder="PN-12345" required />
                  </div>
                  <div className="form-group">
                    <label>Part Name</label>
                    <input name="part_name" value={form.part_name} onChange={handleChange} placeholder="Part name" required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={form.category} onChange={handleChange}>
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Condition Code</label>
                    <select name="condition_code" value={form.condition_code} onChange={handleChange}>
                      <option value="">Select condition...</option>
                      {CONDITION_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input name="quantity" type="number" value={form.quantity} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Min Quantity</label>
                    <input name="min_quantity" type="number" value={form.min_quantity} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Unit Cost ($)</label>
                    <input name="unit_cost" type="number" step="0.01" value={form.unit_cost} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input name="location" value={form.location} onChange={handleChange} placeholder="Shelf/Bin location" />
                  </div>
                  <div className="form-group">
                    <label>Warehouse</label>
                    <input name="warehouse" value={form.warehouse} onChange={handleChange} placeholder="Warehouse name" />
                  </div>
                  <div className="form-group">
                    <label>Supplier</label>
                    <input name="supplier" value={form.supplier} onChange={handleChange} placeholder="Supplier name" />
                  </div>
                  <div className="form-group">
                    <label>Certification</label>
                    <input name="certification" value={form.certification} onChange={handleChange} placeholder="Certification info" />
                  </div>
                  <div className="form-group">
                    <label>Last Received</label>
                    <input name="last_received" type="date" value={form.last_received} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
