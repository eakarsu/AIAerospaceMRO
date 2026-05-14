import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const SPECIALIZATION_OPTIONS = [
  'Powerplant', 'Avionics', 'Structures', 'Sheet Metal', 'Composites',
  'NDT', 'Electrical', 'General Maintenance', 'Interiors', 'Paint/Coatings'
];
const LICENSE_TYPE_OPTIONS = ['A&P', 'IA', 'FCC', 'EASA Part-66', 'Repairman'];
const RATING_OPTIONS = ['A', 'B', 'C', 'D'];
const STATUS_OPTIONS = ['Active', 'On Leave', 'Inactive', 'Terminated'];

const STATUS_BADGE = { Active: 'badge-success', 'On Leave': 'badge-warning', Inactive: 'badge-secondary', Terminated: 'badge-danger' };
const RATING_BADGE = { A: 'badge-success', B: 'badge-info', C: 'badge-warning', D: 'badge-danger' };

const emptyForm = {
  employee_id: '', name: '', email: '', phone: '', specialization: 'General Maintenance',
  license_type: 'A&P', license_number: '', license_expiry: '', certifications: '',
  rating: 'B', status: 'Active', hire_date: '', total_experience_years: ''
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpiringWithin90Days(dateStr) {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 90;
}

function Technicians({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/technicians`);
      if (!res.ok) throw new Error('Failed to fetch technicians');
      const data = await res.json();
      setItems(data.records || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(true);
  };

  const openEdit = () => {
    const item = selected;
    const certs = Array.isArray(item.certifications)
      ? item.certifications.join(', ')
      : (item.certifications || '');
    setForm({
      _id: item._id || item.id,
      employee_id: item.employee_id || '',
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      specialization: item.specialization || 'General Maintenance',
      license_type: item.license_type || 'A&P',
      license_number: item.license_number || '',
      license_expiry: item.license_expiry ? item.license_expiry.substring(0, 10) : '',
      certifications: certs,
      rating: item.rating || 'B',
      status: item.status || 'Active',
      hire_date: item.hire_date ? item.hire_date.substring(0, 10) : '',
      total_experience_years: item.total_experience_years ?? ''
    });
    setEditing(true);
    setSelected(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const isEdit = editing && form._id;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `${API}/technicians/${form._id}` : `${API}/technicians`;
      const body = { ...form };
      delete body._id;

      // Convert certifications string to array
      if (typeof body.certifications === 'string') {
        body.certifications = body.certifications
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }

      // Convert experience to number
      if (body.total_experience_years !== '') {
        body.total_experience_years = Number(body.total_experience_years);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(isEdit ? 'Failed to update technician' : 'Failed to create technician');
      showToast(isEdit ? 'Technician updated successfully' : 'Technician created successfully');
      setShowForm(false);
      setForm(emptyForm);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this technician?')) return;
    try {
      const res = await fetch(`${API}/technicians/${selected._id || selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete technician');
      showToast('Technician deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const renderCertBadges = (certs) => {
    const arr = Array.isArray(certs) ? certs : (certs || '').split(',').map(s => s.trim()).filter(Boolean);
    if (arr.length === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {arr.map((cert, i) => (
          <span key={i} className="badge badge-info">{cert}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Technician Certification Tracking</h1>
          <p className="subtitle">Manage technician qualifications and license compliance</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Technician</button>
      </div>

      {loading && <div className="ai-loading">Loading technicians...</div>}
      {error && <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No technicians found</p>
          <p>Add your first technician to get started.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Specialization</th>
                <th>License Type</th>
                <th>License Expiry</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const expiring = isExpiringWithin90Days(item.license_expiry);
                return (
                  <tr
                    key={item._id || item.id}
                    onClick={() => setSelected(item)}
                    style={expiring ? { borderLeft: '4px solid var(--warning)' } : {}}
                  >
                    <td style={{ fontWeight: 600 }}>{item.employee_id || '-'}</td>
                    <td>{item.name || '-'}</td>
                    <td>{item.specialization || '-'}</td>
                    <td>{item.license_type || '-'}</td>
                    <td style={expiring ? { color: 'var(--warning)', fontWeight: 600 } : {}}>
                      {formatDate(item.license_expiry)}
                      {expiring && <span style={{ marginLeft: '6px', fontSize: '0.75rem' }}>(Expiring soon)</span>}
                    </td>
                    <td><span className={`badge ${RATING_BADGE[item.rating] || 'badge-secondary'}`}>{item.rating || '-'}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[item.status] || 'badge-secondary'}`}>{item.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{selected.name || 'Technician Details'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Employee ID</label>
                  <div className="value">{selected.employee_id || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Name</label>
                  <div className="value">{selected.name || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <div className="value">{selected.email || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Phone</label>
                  <div className="value">{selected.phone || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Specialization</label>
                  <div className="value">{selected.specialization || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>License Type</label>
                  <div className="value">{selected.license_type || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>License Number</label>
                  <div className="value">{selected.license_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>License Expiry</label>
                  <div className="value" style={isExpiringWithin90Days(selected.license_expiry) ? { color: 'var(--warning)', fontWeight: 600 } : {}}>
                    {formatDate(selected.license_expiry)}
                    {isExpiringWithin90Days(selected.license_expiry) && <span style={{ marginLeft: '6px', fontSize: '0.8rem' }}>(Expiring soon)</span>}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Rating</label>
                  <div className="value"><span className={`badge ${RATING_BADGE[selected.rating] || 'badge-secondary'}`}>{selected.rating || '-'}</span></div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value"><span className={`badge ${STATUS_BADGE[selected.status] || 'badge-secondary'}`}>{selected.status}</span></div>
                </div>
                <div className="detail-item">
                  <label>Hire Date</label>
                  <div className="value">{formatDate(selected.hire_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Total Experience (Years)</label>
                  <div className="value">{selected.total_experience_years ?? '-'}</div>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div className="detail-item">
                  <label>Certifications</label>
                  <div className="value" style={{ marginTop: '6px' }}>{renderCertBadges(selected.certifications)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={openEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Technician' : 'New Technician'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input type="text" value={form.employee_id} onChange={e => setField('employee_id', e.target.value)} placeholder="EMP-001" required />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Full name" required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div className="form-group">
                    <label>Specialization</label>
                    <select value={form.specialization} onChange={e => setField('specialization', e.target.value)}>
                      {SPECIALIZATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>License Type</label>
                    <select value={form.license_type} onChange={e => setField('license_type', e.target.value)}>
                      {LICENSE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>License Number</label>
                    <input type="text" value={form.license_number} onChange={e => setField('license_number', e.target.value)} placeholder="License #" />
                  </div>
                  <div className="form-group">
                    <label>License Expiry</label>
                    <input type="date" value={form.license_expiry} onChange={e => setField('license_expiry', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Rating</label>
                    <select value={form.rating} onChange={e => setField('rating', e.target.value)}>
                      {RATING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setField('status', e.target.value)}>
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hire Date</label>
                    <input type="date" value={form.hire_date} onChange={e => setField('hire_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Total Experience (Years)</label>
                    <input type="number" min="0" value={form.total_experience_years} onChange={e => setField('total_experience_years', e.target.value)} placeholder="Years of experience" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label>Certifications (comma separated)</label>
                  <input type="text" value={form.certifications} onChange={e => setField('certifications', e.target.value)} placeholder="NDT Level II, Composite Repair, Boeing 737 Type Rating" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editing ? 'Update Technician' : 'Create Technician'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Technicians;
