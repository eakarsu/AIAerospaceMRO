import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  document_number: '', title: '', document_type: 'Engineering Order', category: 'Engine',
  revision: '', effective_date: '', expiry_date: '', aircraft_type: '',
  ata_chapter: '', author: '', approved_by: '', status: 'Draft',
  description: '', file_reference: '', distribution_list: ''
};

const documentTypeOptions = [
  'Engineering Order', 'Manual', 'Service Bulletin', 'Training', 'Procedure',
  'Program', 'Compliance', 'Work Instruction', 'Specification', 'Regulatory'
];

const categoryOptions = [
  'Engine', 'Quality', 'Structural', 'Human Resources', 'NDT',
  'Maintenance', 'Safety', 'Regulatory', 'Landing Gear', 'Finishing'
];

const statusOptions = ['Active', 'Draft', 'Under Review', 'Expired', 'Superseded', 'Archived'];

const statusBadge = (status) => {
  const map = {
    Active: 'success', Draft: 'secondary', 'Under Review': 'warning',
    Expired: 'danger', Superseded: 'info', Archived: 'secondary'
  };
  return map[status] || 'secondary';
};

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

function Documents({ token }) {
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
      const res = await fetch(`${API}/documents`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load documents', 'error');
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
      document_number: selectedItem.document_number || '',
      title: selectedItem.title || '',
      document_type: selectedItem.document_type || 'Engineering Order',
      category: selectedItem.category || 'Engine',
      revision: selectedItem.revision || '',
      effective_date: selectedItem.effective_date ? selectedItem.effective_date.substring(0, 10) : '',
      expiry_date: selectedItem.expiry_date ? selectedItem.expiry_date.substring(0, 10) : '',
      aircraft_type: selectedItem.aircraft_type || '',
      ata_chapter: selectedItem.ata_chapter || '',
      author: selectedItem.author || '',
      approved_by: selectedItem.approved_by || '',
      status: selectedItem.status || 'Draft',
      description: selectedItem.description || '',
      file_reference: selectedItem.file_reference || '',
      distribution_list: selectedItem.distribution_list || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode
      ? `${API}/documents/${selectedItem.id}`
      : `${API}/documents`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Request failed');
      showToast(editMode ? 'Document updated' : 'Document created');
      setShowForm(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to save document', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`${API}/documents/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Document deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete document', 'error');
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/document-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_number: selectedItem.document_number,
          title: selectedItem.title,
          document_type: selectedItem.document_type,
          revision: selectedItem.revision,
          description: selectedItem.description,
          aircraft_type: selectedItem.aircraft_type
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
          <h1>Document Management</h1>
          <p className="subtitle">Manage engineering documents, manuals, service bulletins, and procedures</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Document</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading documents...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No documents found</p>
          <p style={{ fontSize: '0.85rem' }}>Click "New Document" to create your first document.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Doc Number</th>
                <th>Title</th>
                <th>Type</th>
                <th>Revision</th>
                <th>Effective Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.document_number}</td>
                  <td>{item.title}</td>
                  <td>{item.document_type || '-'}</td>
                  <td>{item.revision || '-'}</td>
                  <td>{formatDate(item.effective_date)}</td>
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
              <h2>{selectedItem.document_number} - {selectedItem.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Document Number</label>
                  <div className="value">{selectedItem.document_number}</div>
                </div>
                <div className="detail-item">
                  <label>Title</label>
                  <div className="value">{selectedItem.title}</div>
                </div>
                <div className="detail-item">
                  <label>Document Type</label>
                  <div className="value">{selectedItem.document_type || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Category</label>
                  <div className="value">{selectedItem.category || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Revision</label>
                  <div className="value">{selectedItem.revision || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value">
                    <span className={`badge badge-${statusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Effective Date</label>
                  <div className="value">{formatDate(selectedItem.effective_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Expiry Date</label>
                  <div className="value">{formatDate(selectedItem.expiry_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Type</label>
                  <div className="value">{selectedItem.aircraft_type || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>ATA Chapter</label>
                  <div className="value">{selectedItem.ata_chapter || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Author</label>
                  <div className="value">{selectedItem.author || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Approved By</label>
                  <div className="value">{selectedItem.approved_by || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>File Reference</label>
                  <div className="value">{selectedItem.file_reference || '-'}</div>
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

              {selectedItem.distribution_list && (
                <div style={{ marginTop: '16px' }}>
                  <label>Distribution List</label>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedItem.distribution_list}
                  </div>
                </div>
              )}

              {/* AI Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI Document Review'}
                </button>

                {aiLoading && (
                  <div className="ai-loading">Generating AI document review...</div>
                )}

                {aiResult && (
                  <div className="ai-result">
                    <h3>AI Document Review</h3>
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
              <h2>{editMode ? 'Edit Document' : 'New Document'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Document Number</label>
                    <input name="document_number" value={formData.document_number} onChange={handleChange} required placeholder="e.g., DOC-2024-001" />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Engine Maintenance Manual" />
                  </div>
                  <div className="form-group">
                    <label>Document Type</label>
                    <select name="document_type" value={formData.document_type} onChange={handleChange}>
                      {documentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleChange}>
                      {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Revision</label>
                    <input name="revision" value={formData.revision} onChange={handleChange} placeholder="e.g., Rev A" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Effective Date</label>
                    <input name="effective_date" type="date" value={formData.effective_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Type</label>
                    <input name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} placeholder="e.g., Boeing 737-800" />
                  </div>
                  <div className="form-group">
                    <label>ATA Chapter</label>
                    <input name="ata_chapter" value={formData.ata_chapter} onChange={handleChange} placeholder="e.g., ATA 72" />
                  </div>
                  <div className="form-group">
                    <label>Author</label>
                    <input name="author" value={formData.author} onChange={handleChange} placeholder="e.g., John Smith" />
                  </div>
                  <div className="form-group">
                    <label>Approved By</label>
                    <input name="approved_by" value={formData.approved_by} onChange={handleChange} placeholder="e.g., Jane Doe" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the document content and purpose..." />
                  </div>
                  <div className="form-group">
                    <label>File Reference</label>
                    <input name="file_reference" value={formData.file_reference} onChange={handleChange} placeholder="e.g., /docs/eng/DOC-2024-001.pdf" />
                  </div>
                  <div className="form-group">
                    <label>Distribution List</label>
                    <textarea name="distribution_list" value={formData.distribution_list} onChange={handleChange} placeholder="e.g., Engineering, Quality, Maintenance" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update Document' : 'Create Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
