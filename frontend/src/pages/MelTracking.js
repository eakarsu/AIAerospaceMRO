import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  mel_number: '', aircraft_reg: '', ata_chapter: '', title: '', description: '',
  category: 'B', deferral_date: '', expiry_date: '', rectification_interval: '',
  status: 'Active', operational_restriction: '', maintenance_action: '',
  deferred_by: '', approved_by: '', rectified_date: '', rectified_by: ''
};

const categoryOptions = [
  { value: 'A', label: 'A - Repair within MEL time' },
  { value: 'B', label: 'B - 3 Calendar Days' },
  { value: 'C', label: 'C - 10 Calendar Days' },
  { value: 'D', label: 'D - 120 Calendar Days' }
];

const statusOptions = ['Active', 'Rectified', 'Expired', 'Cancelled'];

const statusBadge = (status) => {
  const map = { Active: 'warning', Rectified: 'success', Expired: 'danger', Cancelled: 'secondary' };
  return map[status] || 'secondary';
};

const categoryBadge = (category) => {
  const map = { A: 'danger', B: 'warning', C: 'info', D: 'secondary' };
  return map[category] || 'secondary';
};

function isExpiredActive(item) {
  if (!item.expiry_date || item.status !== 'Active') return false;
  return new Date(item.expiry_date) < new Date();
}

function parseAISections(text) {
  if (!text) return [];
  const sections = [];
  let currentTitle = '';
  let currentContent = '';

  const lines = text.split('\n');
  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const boldMatch = line.match(/^\*\*(.+?):\*\*/);
    const colonMatch = line.match(/^([A-Z][A-Za-z\s&-]+):$/);

    if (h2Match || boldMatch || colonMatch) {
      if (currentTitle || currentContent.trim()) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
      }
      currentTitle = (h2Match && h2Match[1]) || (boldMatch && boldMatch[1]) || (colonMatch && colonMatch[1]);
      currentContent = h2Match ? '' : boldMatch ? line.replace(/^\*\*(.+?):\*\*/, '').trim() : '';
    } else {
      currentContent += line + '\n';
    }
  }
  if (currentTitle || currentContent.trim()) {
    sections.push({ title: currentTitle, content: currentContent.trim() });
  }
  return sections;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

function MelTracking({ token }) {
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/mel-tracking`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load MEL records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setFormData({ ...emptyForm });
    setEditMode(false);
    setShowForm(true);
  };

  const openEdit = () => {
    setFormData({
      mel_number: selectedItem.mel_number || '',
      aircraft_reg: selectedItem.aircraft_reg || '',
      ata_chapter: selectedItem.ata_chapter || '',
      title: selectedItem.title || '',
      description: selectedItem.description || '',
      category: selectedItem.category || 'B',
      deferral_date: selectedItem.deferral_date ? selectedItem.deferral_date.substring(0, 10) : '',
      expiry_date: selectedItem.expiry_date ? selectedItem.expiry_date.substring(0, 10) : '',
      rectification_interval: selectedItem.rectification_interval || '',
      status: selectedItem.status || 'Active',
      operational_restriction: selectedItem.operational_restriction || '',
      maintenance_action: selectedItem.maintenance_action || '',
      deferred_by: selectedItem.deferred_by || '',
      approved_by: selectedItem.approved_by || '',
      rectified_date: selectedItem.rectified_date ? selectedItem.rectified_date.substring(0, 10) : '',
      rectified_by: selectedItem.rectified_by || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode
      ? `${API}/mel-tracking/${selectedItem.id}`
      : `${API}/mel-tracking`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Request failed');
      showToast(editMode ? 'MEL record updated' : 'MEL record created');
      setShowForm(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to save MEL record', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this MEL record?')) return;
    try {
      const res = await fetch(`${API}/mel-tracking/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('MEL record deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete MEL record', 'error');
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/mel-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mel_number: selectedItem.mel_number,
          title: selectedItem.title,
          category: selectedItem.category,
          aircraft_reg: selectedItem.aircraft_reg,
          description: selectedItem.description,
          operational_restriction: selectedItem.operational_restriction,
          deferral_date: selectedItem.deferral_date,
          expiry_date: selectedItem.expiry_date
        })
      });
      const data = await res.json();
      setAiResult(data.analysis || 'No analysis returned.');
    } catch {
      showToast('AI analysis failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>MEL / Deferral Tracking</h1>
          <p className="subtitle">Track minimum equipment list deferrals, categories, and rectification status</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New MEL Item</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading MEL records...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No MEL records found</p>
          <p style={{ fontSize: '0.85rem' }}>Click "New MEL Item" to create your first MEL deferral record.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>MEL Number</th>
                <th>Aircraft</th>
                <th>ATA</th>
                <th>Title</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={isExpiredActive(item) ? { borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.04)' } : {}}
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.mel_number}</td>
                  <td>{item.aircraft_reg || '-'}</td>
                  <td>{item.ata_chapter || '-'}</td>
                  <td>{item.title}</td>
                  <td><span className={`badge badge-${categoryBadge(item.category)}`}>{item.category}</span></td>
                  <td style={isExpiredActive(item) ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                    {formatDate(item.expiry_date)}
                  </td>
                  <td><span className={`badge badge-${statusBadge(item.status)}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.mel_number} - {selectedItem.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {isExpiredActive(selectedItem) && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px',
                  color: '#f87171', fontWeight: 600, fontSize: '0.9rem'
                }}>
                  EXPIRED - This MEL deferral expired on {formatDate(selectedItem.expiry_date)} but is still Active
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-item">
                  <label>MEL Number</label>
                  <div className="value">{selectedItem.mel_number}</div>
                </div>
                <div className="detail-item">
                  <label>Title</label>
                  <div className="value">{selectedItem.title}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Registration</label>
                  <div className="value">{selectedItem.aircraft_reg || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>ATA Chapter</label>
                  <div className="value">{selectedItem.ata_chapter || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Category</label>
                  <div className="value">
                    <span className={`badge badge-${categoryBadge(selectedItem.category)}`}>
                      {categoryOptions.find(c => c.value === selectedItem.category)?.label || selectedItem.category}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value">
                    <span className={`badge badge-${statusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Deferral Date</label>
                  <div className="value">{formatDate(selectedItem.deferral_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Expiry Date</label>
                  <div className="value" style={isExpiredActive(selectedItem) ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                    {formatDate(selectedItem.expiry_date)}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Rectification Interval</label>
                  <div className="value">{selectedItem.rectification_interval || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Deferred By</label>
                  <div className="value">{selectedItem.deferred_by || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Approved By</label>
                  <div className="value">{selectedItem.approved_by || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Rectified Date</label>
                  <div className="value">{formatDate(selectedItem.rectified_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Rectified By</label>
                  <div className="value">{selectedItem.rectified_by || '-'}</div>
                </div>
              </div>

              {selectedItem.description && (
                <div style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.description}
                  </div>
                </div>
              )}

              {selectedItem.operational_restriction && (
                <div style={{ marginTop: '16px' }}>
                  <label>Operational Restriction</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.operational_restriction}
                  </div>
                </div>
              )}

              {selectedItem.maintenance_action && (
                <div style={{ marginTop: '16px' }}>
                  <label>Maintenance Action</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.maintenance_action}
                  </div>
                </div>
              )}

              {/* AI Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI MEL Analysis'}
                </button>

                {aiLoading && (
                  <div className="ai-loading">Generating AI MEL analysis...</div>
                )}

                {aiResult && (
                  <div className="ai-result">
                    <h3>AI MEL Analysis</h3>
                    {parseAISections(aiResult).length > 1 ? (
                      parseAISections(aiResult).map((section, i) => (
                        <div key={i} className="ai-section">
                          {section.title && <div className="ai-section-title">{section.title}</div>}
                          <div className="ai-result-content">{section.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className="ai-result-content">{aiResult}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={openEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit MEL Item' : 'New MEL Item'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>MEL Number</label>
                    <input name="mel_number" value={formData.mel_number} onChange={handleChange} required placeholder="e.g., MEL-2024-001" />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={formData.aircraft_reg} onChange={handleChange} required placeholder="e.g., N12345" />
                  </div>
                  <div className="form-group">
                    <label>ATA Chapter</label>
                    <input name="ata_chapter" value={formData.ata_chapter} onChange={handleChange} placeholder="e.g., 32-10" />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Left Pack Valve Inoperative" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the deferred defect..." />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleChange}>
                      {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Deferral Date</label>
                    <input name="deferral_date" type="date" value={formData.deferral_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Rectification Interval</label>
                    <input name="rectification_interval" value={formData.rectification_interval} onChange={handleChange} placeholder="e.g., 3 calendar days" />
                  </div>
                  <div className="form-group">
                    <label>Deferred By</label>
                    <input name="deferred_by" value={formData.deferred_by} onChange={handleChange} placeholder="e.g., John Smith" />
                  </div>
                  <div className="form-group">
                    <label>Approved By</label>
                    <input name="approved_by" value={formData.approved_by} onChange={handleChange} placeholder="e.g., Jane Doe" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Operational Restriction</label>
                    <textarea name="operational_restriction" value={formData.operational_restriction} onChange={handleChange} placeholder="Describe any operational restrictions..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Maintenance Action</label>
                    <textarea name="maintenance_action" value={formData.maintenance_action} onChange={handleChange} placeholder="Describe the required maintenance action..." />
                  </div>
                  <div className="form-group">
                    <label>Rectified Date</label>
                    <input name="rectified_date" type="date" value={formData.rectified_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Rectified By</label>
                    <input name="rectified_by" value={formData.rectified_by} onChange={handleChange} placeholder="e.g., Mike Johnson" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update MEL Item' : 'Create MEL Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MelTracking;
