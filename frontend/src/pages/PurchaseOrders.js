import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  po_number: '', vendor_name: '', vendor_code: '', order_date: '', expected_delivery: '',
  actual_delivery: '', status: 'Draft', priority: 'Medium', total_amount: '', currency: 'USD',
  items_description: '', quantity: 1, unit_price: '', requested_by: '', approved_by: '',
  aircraft_reg: '', department: '', payment_status: 'Pending', notes: ''
};

function PurchaseOrders({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchItems = async () => {
    try { const res = await fetch(`${API}/purchase-orders`); const data = await res.json(); setItems(Array.isArray(data) ? data : []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editMode ? `${API}/purchase-orders/${selectedItem.id}` : `${API}/purchase-orders`;
      const res = await fetch(url, { method: editMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Failed');
      showToast(editMode ? 'PO updated' : 'PO created');
      setShowForm(false); setShowDetail(false); setEditMode(false);
      fetchItems();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase order?')) return;
    try { await fetch(`${API}/purchase-orders/${id}`, { method: 'DELETE' }); showToast('PO deleted'); setShowDetail(false); fetchItems(); } catch (e) { showToast(e.message, 'error'); }
  };

  const handleAI = async () => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/purchase-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_number: selectedItem.po_number, vendor_name: selectedItem.vendor_name, total_amount: selectedItem.total_amount, items_description: selectedItem.items_description, priority: selectedItem.priority, aircraft_reg: selectedItem.aircraft_reg })
      });
      const data = await res.json(); setAiResult(data.analysis || data.error);
    } catch (e) { setAiResult('Error: ' + e.message); }
    setAiLoading(false);
  };

  const openCreate = () => { setFormData({ ...emptyForm }); setEditMode(false); setShowForm(true); };
  const openEdit = () => {
    const s = selectedItem;
    setFormData({ po_number: s.po_number||'', vendor_name: s.vendor_name||'', vendor_code: s.vendor_code||'', order_date: s.order_date?.split('T')[0]||'', expected_delivery: s.expected_delivery?.split('T')[0]||'', actual_delivery: s.actual_delivery?.split('T')[0]||'', status: s.status||'Draft', priority: s.priority||'Medium', total_amount: s.total_amount||'', currency: s.currency||'USD', items_description: s.items_description||'', quantity: s.quantity||1, unit_price: s.unit_price||'', requested_by: s.requested_by||'', approved_by: s.approved_by||'', aircraft_reg: s.aircraft_reg||'', department: s.department||'', payment_status: s.payment_status||'Pending', notes: s.notes||'' });
    setEditMode(true); setShowForm(true); setShowDetail(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const fmtCurrency = (v) => v ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

  const statusBadge = (s) => ({ Delivered: 'badge-success', Ordered: 'badge-info', 'In Transit': 'badge-info', Approved: 'badge-info', Draft: 'badge-secondary', 'Pending Approval': 'badge-warning', Cancelled: 'badge-danger' }[s] || 'badge-secondary');
  const payBadge = (s) => ({ Paid: 'badge-success', Pending: 'badge-warning', Invoiced: 'badge-info', Overdue: 'badge-danger', Cancelled: 'badge-secondary' }[s] || 'badge-secondary');
  const priBadge = (s) => ({ Critical: 'badge-danger', High: 'badge-warning', Medium: 'badge-info', Low: 'badge-secondary' }[s] || 'badge-secondary');

  const parseAI = (text) => {
    if (!text) return null;
    const sections = []; let current = null;
    text.split('\n').forEach(line => {
      const t = line.trim();
      if (!t) return;
      if (t.match(/^#{1,3}\s/) || t.match(/^\*\*[^*]+\*\*:?$/) || (t.endsWith(':') && t.length < 80 && !t.includes(','))) {
        if (current) sections.push(current);
        current = { title: t.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:$/, ''), content: '' };
      } else { if (!current) current = { title: '', content: '' }; current.content += line + '\n'; }
    });
    if (current) sections.push(current);
    return sections.length > 0 ? sections : [{ title: '', content: text }];
  };

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const renderForm = () => (
    <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(false); }}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{editMode ? 'Edit Purchase Order' : 'New Purchase Order'}</h2><button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="detail-grid">
              <div className="form-group"><label>PO Number</label><input value={formData.po_number} onChange={e => set('po_number', e.target.value)} required /></div>
              <div className="form-group"><label>Vendor Name</label><input value={formData.vendor_name} onChange={e => set('vendor_name', e.target.value)} required /></div>
              <div className="form-group"><label>Vendor Code</label><input value={formData.vendor_code} onChange={e => set('vendor_code', e.target.value)} /></div>
              <div className="form-group"><label>Aircraft Reg</label><input value={formData.aircraft_reg} onChange={e => set('aircraft_reg', e.target.value)} /></div>
              <div className="form-group"><label>Order Date</label><input type="date" value={formData.order_date} onChange={e => set('order_date', e.target.value)} /></div>
              <div className="form-group"><label>Expected Delivery</label><input type="date" value={formData.expected_delivery} onChange={e => set('expected_delivery', e.target.value)} /></div>
              <div className="form-group"><label>Actual Delivery</label><input type="date" value={formData.actual_delivery} onChange={e => set('actual_delivery', e.target.value)} /></div>
              <div className="form-group"><label>Department</label><input value={formData.department} onChange={e => set('department', e.target.value)} /></div>
              <div className="form-group"><label>Status</label><select value={formData.status} onChange={e => set('status', e.target.value)}>{['Draft','Pending Approval','Approved','Ordered','In Transit','Delivered','Cancelled'].map(o => <option key={o}>{o}</option>)}</select></div>
              <div className="form-group"><label>Priority</label><select value={formData.priority} onChange={e => set('priority', e.target.value)}>{['Critical','High','Medium','Low'].map(o => <option key={o}>{o}</option>)}</select></div>
              <div className="form-group"><label>Total Amount</label><input type="number" step="0.01" value={formData.total_amount} onChange={e => set('total_amount', e.target.value)} /></div>
              <div className="form-group"><label>Currency</label><select value={formData.currency} onChange={e => set('currency', e.target.value)}>{['USD','EUR','GBP','SGD','CAD'].map(o => <option key={o}>{o}</option>)}</select></div>
              <div className="form-group"><label>Quantity</label><input type="number" value={formData.quantity} onChange={e => set('quantity', e.target.value)} /></div>
              <div className="form-group"><label>Unit Price</label><input type="number" step="0.01" value={formData.unit_price} onChange={e => set('unit_price', e.target.value)} /></div>
              <div className="form-group"><label>Requested By</label><input value={formData.requested_by} onChange={e => set('requested_by', e.target.value)} /></div>
              <div className="form-group"><label>Approved By</label><input value={formData.approved_by} onChange={e => set('approved_by', e.target.value)} /></div>
              <div className="form-group"><label>Payment Status</label><select value={formData.payment_status} onChange={e => set('payment_status', e.target.value)}>{['Pending','Invoiced','Paid','Overdue','Cancelled'].map(o => <option key={o}>{o}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Items Description</label><textarea value={formData.items_description} onChange={e => set('items_description', e.target.value)} /></div>
            <div className="form-group"><label>Notes</label><textarea value={formData.notes} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button><button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create'}</button></div>
        </form>
      </div>
    </div>
  );

  const renderDetail = () => (
    <div className="modal-overlay" onClick={() => { setShowDetail(false); setAiResult(null); }}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selectedItem.po_number}</h2><button className="btn btn-secondary btn-sm" onClick={() => { setShowDetail(false); setAiResult(null); }}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span className={`badge ${statusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
            <span className={`badge ${priBadge(selectedItem.priority)}`}>{selectedItem.priority}</span>
            <span className={`badge ${payBadge(selectedItem.payment_status)}`}>{selectedItem.payment_status}</span>
          </div>

          <div style={{ background: 'rgba(14,165,233,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Amount</div>
            <div style={{ color: 'var(--primary)', fontSize: '2rem', fontWeight: 800 }}>{fmtCurrency(selectedItem.total_amount)}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedItem.currency || 'USD'}</div>
          </div>

          <div className="detail-grid">
            <div className="detail-item"><label>Vendor</label><div>{selectedItem.vendor_name || '—'}</div></div>
            <div className="detail-item"><label>Vendor Code</label><div>{selectedItem.vendor_code || '—'}</div></div>
            <div className="detail-item"><label>Aircraft</label><div>{selectedItem.aircraft_reg || '—'}</div></div>
            <div className="detail-item"><label>Department</label><div>{selectedItem.department || '—'}</div></div>
            <div className="detail-item"><label>Order Date</label><div>{fmtDate(selectedItem.order_date)}</div></div>
            <div className="detail-item"><label>Expected Delivery</label><div>{fmtDate(selectedItem.expected_delivery)}</div></div>
            <div className="detail-item"><label>Actual Delivery</label><div>{fmtDate(selectedItem.actual_delivery)}</div></div>
            <div className="detail-item"><label>Quantity</label><div>{selectedItem.quantity || '—'}</div></div>
            <div className="detail-item"><label>Unit Price</label><div>{fmtCurrency(selectedItem.unit_price)}</div></div>
            <div className="detail-item"><label>Requested By</label><div>{selectedItem.requested_by || '—'}</div></div>
            <div className="detail-item"><label>Approved By</label><div>{selectedItem.approved_by || '—'}</div></div>
          </div>
          {selectedItem.items_description && <div style={{ marginTop: '16px' }}><label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Items Description</label><p style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{selectedItem.items_description}</p></div>}
          {selectedItem.notes && <div style={{ marginTop: '12px' }}><label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Notes</label><p style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{selectedItem.notes}</p></div>}

          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAI} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : '🤖 AI Purchase Analysis'}</button>
          </div>
          {aiLoading && <div className="ai-loading" style={{ marginTop: '16px' }}>AI is analyzing this purchase order...</div>}
          {aiResult && (
            <div className="ai-result">
              <h3>🤖 AI Purchase Analysis</h3>
              {parseAI(aiResult).map((section, i) => (
                <div key={i} className="ai-section">
                  {section.title && <div className="ai-section-title">{section.title}</div>}
                  <div className="ai-result-content">{section.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
          <button className="btn btn-primary btn-sm" onClick={openEdit}>Edit</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1>Purchase Order Management</h1><p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Procurement and supply chain tracking</p></div><button className="btn btn-primary" onClick={openCreate}>+ New Purchase Order</button></div>
      {loading ? <div className="ai-loading">Loading...</div> : items.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No purchase orders found.</p> : (
        <div className="table-container"><table>
          <thead><tr><th>PO Number</th><th>Vendor</th><th>Priority</th><th>Total Amount</th><th>Status</th><th>Payment</th><th>Expected Delivery</th></tr></thead>
          <tbody>{items.map(item => (
            <tr key={item.id} onClick={() => { setSelectedItem(item); setShowDetail(true); setAiResult(null); }}>
              <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.po_number}</td>
              <td>{item.vendor_name || '—'}</td>
              <td><span className={`badge ${priBadge(item.priority)}`}>{item.priority}</span></td>
              <td style={{ fontWeight: 600 }}>{fmtCurrency(item.total_amount)}</td>
              <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
              <td><span className={`badge ${payBadge(item.payment_status)}`}>{item.payment_status}</span></td>
              <td>{fmtDate(item.expected_delivery)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {showForm && renderForm()}
      {showDetail && selectedItem && renderDetail()}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}
    </div>
  );
}

export default PurchaseOrders;
