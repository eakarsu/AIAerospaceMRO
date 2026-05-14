import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  directive_number: '', title: '', authority: 'FAA', aircraft_type: '',
  applicability: '', compliance_date: '', due_date: '', status: 'Open',
  priority: 'High', description: '', corrective_action: '',
  inspector_name: '', documentation_ref: ''
};

const authorityOptions = ['FAA', 'EASA', 'Transport Canada', 'CASA', 'CAAC'];
const statusOptions = ['Open', 'In Progress', 'Completed', 'Overdue', 'Deferred'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

const statusBadge = (status) => {
  const map = { Completed: 'success', 'In Progress': 'info', Open: 'warning', Overdue: 'danger', Deferred: 'secondary' };
  return map[status] || 'secondary';
};

const priorityColor = (priority) => {
  const map = { Critical: 'var(--danger)', High: 'var(--warning)', Medium: 'var(--primary)', Low: 'var(--text-muted)' };
  return map[priority] || 'var(--text-secondary)';
};

function isOverdue(item) {
  if (!item.due_date || item.status === 'Completed') return false;
  return new Date(item.due_date) < new Date();
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

function Compliance({ token }) {
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
    setTimeout(() => setToast(null), 3500);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/compliance`);
      const data = await res.json();
      setItems(data.records || (Array.isArray(data) ? data : []));
    } catch {
      showToast('Failed to load compliance records', 'error');
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
      directive_number: selectedItem.directive_number || '',
      title: selectedItem.title || '',
      authority: selectedItem.authority || 'FAA',
      aircraft_type: selectedItem.aircraft_type || '',
      applicability: selectedItem.applicability || '',
      compliance_date: selectedItem.compliance_date ? selectedItem.compliance_date.substring(0, 10) : '',
      due_date: selectedItem.due_date ? selectedItem.due_date.substring(0, 10) : '',
      status: selectedItem.status || 'Open',
      priority: selectedItem.priority || 'High',
      description: selectedItem.description || '',
      corrective_action: selectedItem.corrective_action || '',
      inspector_name: selectedItem.inspector_name || '',
      documentation_ref: selectedItem.documentation_ref || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode
      ? `${API}/compliance/${selectedItem.id}`
      : `${API}/compliance`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Request failed');
      showToast(editMode ? 'Compliance record updated' : 'Compliance record created');
      setShowForm(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to save compliance record', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this compliance record?')) return;
    try {
      const res = await fetch(`${API}/compliance/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Compliance record deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete compliance record', 'error');
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/compliance-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive_number: selectedItem.directive_number,
          aircraft_type: selectedItem.aircraft_type,
          description: selectedItem.description,
          current_status: selectedItem.status
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
          <h1>FAA Compliance Tracking</h1>
          <p className="subtitle">Track airworthiness directives, compliance status, and regulatory requirements</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Record</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading compliance records...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No compliance records found</p>
          <p style={{ fontSize: '0.85rem' }}>Click "Add Record" to create your first compliance record.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Directive #</th>
                <th>Title</th>
                <th>Authority</th>
                <th>Aircraft Type</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={isOverdue(item) ? { borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.04)' } : {}}
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.directive_number}</td>
                  <td>{item.title}</td>
                  <td>{item.authority || '-'}</td>
                  <td>{item.aircraft_type || '-'}</td>
                  <td style={isOverdue(item) ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                    {formatDate(item.due_date)}
                  </td>
                  <td><span className={`badge badge-${statusBadge(item.status)}`}>{item.status}</span></td>
                  <td>
                    <span style={{
                      color: priorityColor(item.priority),
                      fontWeight: 600, fontSize: '0.85rem'
                    }}>
                      {item.priority}
                    </span>
                  </td>
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
              <h2>{selectedItem.directive_number} - {selectedItem.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {isOverdue(selectedItem) && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px',
                  color: '#f87171', fontWeight: 600, fontSize: '0.9rem'
                }}>
                  OVERDUE - This directive was due on {formatDate(selectedItem.due_date)}
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Directive Number</label>
                  <div className="value">{selectedItem.directive_number}</div>
                </div>
                <div className="detail-item">
                  <label>Title</label>
                  <div className="value">{selectedItem.title}</div>
                </div>
                <div className="detail-item">
                  <label>Authority</label>
                  <div className="value">{selectedItem.authority || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Type</label>
                  <div className="value">{selectedItem.aircraft_type || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Applicability</label>
                  <div className="value">{selectedItem.applicability || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value">
                    <span className={`badge badge-${statusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Priority</label>
                  <div className="value" style={{ color: priorityColor(selectedItem.priority), fontWeight: 600 }}>
                    {selectedItem.priority}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Compliance Date</label>
                  <div className="value">{formatDate(selectedItem.compliance_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Due Date</label>
                  <div className="value" style={isOverdue(selectedItem) ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                    {formatDate(selectedItem.due_date)}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Inspector</label>
                  <div className="value">{selectedItem.inspector_name || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Documentation Ref</label>
                  <div className="value">{selectedItem.documentation_ref || '-'}</div>
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

              {selectedItem.corrective_action && (
                <div style={{ marginTop: '16px' }}>
                  <label>Corrective Action</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.corrective_action}
                  </div>
                </div>
              )}

              {/* AI Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI Compliance Check'}
                </button>

                {aiLoading && (
                  <div className="ai-loading">Generating AI compliance analysis...</div>
                )}

                {aiResult && (
                  <div className="ai-result">
                    <h3>AI Compliance Analysis</h3>
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
              <h2>{editMode ? 'Edit Compliance Record' : 'Add Compliance Record'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Directive Number</label>
                    <input name="directive_number" value={formData.directive_number} onChange={handleChange} required placeholder="e.g., AD 2024-15-08" />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Wing Spar Inspection" />
                  </div>
                  <div className="form-group">
                    <label>Authority</label>
                    <select name="authority" value={formData.authority} onChange={handleChange}>
                      {authorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Aircraft Type</label>
                    <input name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} placeholder="e.g., Boeing 737-800" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Applicability</label>
                    <input name="applicability" value={formData.applicability} onChange={handleChange} placeholder="e.g., All 737-800 aircraft with MSN 28000-35000" />
                  </div>
                  <div className="form-group">
                    <label>Compliance Date</label>
                    <input name="compliance_date" type="date" value={formData.compliance_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleChange}>
                      {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the compliance directive..." />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Corrective Action</label>
                    <textarea name="corrective_action" value={formData.corrective_action} onChange={handleChange} placeholder="Describe the corrective action taken or planned..." />
                  </div>
                  <div className="form-group">
                    <label>Inspector Name</label>
                    <input name="inspector_name" value={formData.inspector_name} onChange={handleChange} placeholder="e.g., John Smith" />
                  </div>
                  <div className="form-group">
                    <label>Documentation Reference</label>
                    <input name="documentation_ref" value={formData.documentation_ref} onChange={handleChange} placeholder="e.g., DOC-2024-001" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update Record' : 'Create Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compliance;
