import React, { useState, useEffect } from 'react';
import { API } from '../App';

const MAINTENANCE_TYPES = ['Scheduled Maintenance', 'Unscheduled Repair', 'Modification', 'Inspection', 'Overhaul', 'Component Replacement'];
const PRIORITIES = ['AOG', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'Assigned', 'In Progress', 'Pending Parts', 'Completed', 'Cancelled'];

const emptyForm = {
  wo_number: '', title: '', aircraft_reg: '', maintenance_type: '', priority: '', status: 'Open',
  assigned_to: '', estimated_hours: '', actual_hours: '', labor_cost: '', parts_cost: '',
  description: '', notes: '', start_date: '', target_completion: '', completed_date: ''
};

function WorkOrders({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/work-orders`);
      if (!res.ok) throw new Error('Failed to fetch work orders');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
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
    const url = editing ? `${API}/work-orders/${selected.id}` : `${API}/work-orders`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editing ? 'Work order updated successfully' : 'Work order created successfully');
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
    if (!window.confirm('Delete this work order?')) return;
    try {
      const res = await fetch(`${API}/work-orders/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Work order deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = () => {
    setForm({
      wo_number: selected.wo_number || '',
      title: selected.title || '',
      aircraft_reg: selected.aircraft_reg || '',
      maintenance_type: selected.maintenance_type || '',
      priority: selected.priority || '',
      status: selected.status || 'Open',
      assigned_to: selected.assigned_to || '',
      estimated_hours: selected.estimated_hours || '',
      actual_hours: selected.actual_hours || '',
      labor_cost: selected.labor_cost || '',
      parts_cost: selected.parts_cost || '',
      description: selected.description || '',
      notes: selected.notes || '',
      start_date: selected.start_date ? selected.start_date.substring(0, 10) : '',
      target_completion: selected.target_completion ? selected.target_completion.substring(0, 10) : '',
      completed_date: selected.completed_date ? selected.completed_date.substring(0, 10) : ''
    });
    setEditing(true);
    setShowForm(true);
  };

  const handleAiAnalysis = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/repair-cost-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aircraft_type: selected.aircraft_reg,
          maintenance_type: selected.maintenance_type,
          parts_needed: selected.description,
          labor_hours: selected.estimated_hours,
          description: selected.description
        })
      });
      if (!res.ok) throw new Error('AI analysis failed');
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      showToast('AI analysis failed: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const map = { AOG: 'badge-danger', Critical: 'badge-danger', High: 'badge-warning', Medium: 'badge-info', Low: 'badge-secondary' };
    return <span className={`badge ${map[priority] || 'badge-secondary'}`}>{priority || '-'}</span>;
  };

  const getStatusBadge = (status) => {
    const map = {
      'Open': 'badge-info', 'Assigned': 'badge-info', 'In Progress': 'badge-warning',
      'Pending Parts': 'badge-warning', 'Completed': 'badge-success', 'Cancelled': 'badge-secondary'
    };
    return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status || '-'}</span>;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(true);
  };

  const totalCost = (item) => (parseFloat(item.labor_cost) || 0) + (parseFloat(item.parts_cost) || 0);

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Work Order Management</h1>
          <p className="subtitle">Track and manage maintenance work orders</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Work Order</button>
      </div>

      {loading && <div className="ai-loading">Loading work orders...</div>}
      {error && <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px' }}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No work orders found</p>
          <p>Create your first work order to get started.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>WO Number</th>
                <th>Title</th>
                <th>Aircraft</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Est. Hours</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => { setSelected(item); setAiResult(null); }}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.wo_number || '-'}</td>
                  <td>{item.title || '-'}</td>
                  <td>{item.aircraft_reg || '-'}</td>
                  <td>{getPriorityBadge(item.priority)}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>{item.estimated_hours || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(totalCost(item))}</td>
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
              <h2>Work Order: {selected.wo_number || 'N/A'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>WO Number</label>
                  <div className="value">{selected.wo_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Title</label>
                  <div className="value">{selected.title || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Registration</label>
                  <div className="value">{selected.aircraft_reg || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Maintenance Type</label>
                  <div className="value">{selected.maintenance_type || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Priority</label>
                  <div className="value">{getPriorityBadge(selected.priority)}</div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value">{getStatusBadge(selected.status)}</div>
                </div>
                <div className="detail-item">
                  <label>Assigned To</label>
                  <div className="value">{selected.assigned_to || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Estimated Hours</label>
                  <div className="value">{selected.estimated_hours || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Actual Hours</label>
                  <div className="value">{selected.actual_hours || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Start Date</label>
                  <div className="value">{formatDate(selected.start_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Target Completion</label>
                  <div className="value">{formatDate(selected.target_completion)}</div>
                </div>
                <div className="detail-item">
                  <label>Completed Date</label>
                  <div className="value">{formatDate(selected.completed_date)}</div>
                </div>
              </div>

              {/* Cost Summary */}
              <div style={{
                marginTop: '20px', padding: '20px', background: 'var(--bg-dark)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
              }}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '12px', fontSize: '1rem' }}>Cost Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Labor Cost</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selected.labor_cost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Parts Cost</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selected.parts_cost)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', paddingTop: '10px',
                  borderTop: '1px solid var(--border)', marginTop: '4px'
                }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Total Cost</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(totalCost(selected))}
                  </span>
                </div>
              </div>

              {/* Description & Notes */}
              {selected.description && (
                <div style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <div className="value" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{selected.description}</div>
                </div>
              )}
              {selected.notes && (
                <div style={{ marginTop: '16px' }}>
                  <label>Notes</label>
                  <div className="value" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{selected.notes}</div>
                </div>
              )}

              {/* AI Analysis */}
              <div style={{ marginTop: '20px' }}>
                <button className="btn btn-success" onClick={handleAiAnalysis} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI Repair Cost Estimate'}
                </button>
              </div>
              {aiLoading && <div className="ai-loading">AI is analyzing repair costs...</div>}
              {aiResult && (
                <div className="ai-result">
                  <h3>AI Repair Cost Estimate</h3>
                  <div className="ai-result-content">
                    {typeof aiResult === 'object' && aiResult.analysis
                      ? aiResult.analysis
                      : typeof aiResult === 'object'
                        ? JSON.stringify(aiResult, null, 2)
                        : String(aiResult)}
                  </div>
                </div>
              )}
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
              <h2>{editing ? 'Edit Work Order' : 'New Work Order'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditing(false); }}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="form-group">
                    <label>WO Number</label>
                    <input name="wo_number" value={form.wo_number} onChange={handleChange} placeholder="WO-001" required />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input name="title" value={form.title} onChange={handleChange} placeholder="Work order title" required />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={form.aircraft_reg} onChange={handleChange} placeholder="N12345" />
                  </div>
                  <div className="form-group">
                    <label>Maintenance Type</label>
                    <select name="maintenance_type" value={form.maintenance_type} onChange={handleChange}>
                      <option value="">Select type...</option>
                      {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select name="priority" value={form.priority} onChange={handleChange}>
                      <option value="">Select priority...</option>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={form.status} onChange={handleChange}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <input name="assigned_to" value={form.assigned_to} onChange={handleChange} placeholder="Technician name" />
                  </div>
                  <div className="form-group">
                    <label>Estimated Hours</label>
                    <input name="estimated_hours" type="number" step="0.5" value={form.estimated_hours} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Actual Hours</label>
                    <input name="actual_hours" type="number" step="0.5" value={form.actual_hours} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Labor Cost ($)</label>
                    <input name="labor_cost" type="number" step="0.01" value={form.labor_cost} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Parts Cost ($)</label>
                    <input name="parts_cost" type="number" step="0.01" value={form.parts_cost} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Target Completion</label>
                    <input name="target_completion" type="date" value={form.target_completion} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Completed Date</label>
                    <input name="completed_date" type="date" value={form.completed_date} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Work order description..." />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkOrders;
