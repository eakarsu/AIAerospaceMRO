import React, { useState, useEffect } from 'react';
import { API } from '../App';

const emptyForm = {
  part_number: '', part_name: '', serial_number: '', aircraft_reg: '',
  installed_date: '', last_inspection: '', next_inspection: '',
  cycle_count: '', max_cycles: '', flight_hours: '', max_flight_hours: '',
  condition_status: 'Serviceable', manufacturer: '', certificate_number: ''
};

const conditionOptions = ['Serviceable', 'Unserviceable', 'Beyond Repair', 'Overhauled', 'New'];

const conditionBadge = (status) => {
  const map = { Serviceable: 'success', Unserviceable: 'warning', 'Beyond Repair': 'danger', Overhauled: 'info', New: 'info' };
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

function cyclePercent(count, max) {
  if (!max || max === 0) return 0;
  return Math.min(Math.round((count / max) * 100), 100);
}

function progressColor(pct) {
  if (pct >= 90) return 'var(--danger)';
  if (pct >= 70) return 'var(--warning)';
  return 'var(--success)';
}

function PartLifecycle({ token }) {
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
      const res = await fetch(`${API}/part-lifecycle`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load parts', 'error');
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
      part_number: selectedItem.part_number || '',
      part_name: selectedItem.part_name || '',
      serial_number: selectedItem.serial_number || '',
      aircraft_reg: selectedItem.aircraft_reg || '',
      installed_date: selectedItem.installed_date ? selectedItem.installed_date.substring(0, 10) : '',
      last_inspection: selectedItem.last_inspection ? selectedItem.last_inspection.substring(0, 10) : '',
      next_inspection: selectedItem.next_inspection ? selectedItem.next_inspection.substring(0, 10) : '',
      cycle_count: selectedItem.cycle_count ?? '',
      max_cycles: selectedItem.max_cycles ?? '',
      flight_hours: selectedItem.flight_hours ?? '',
      max_flight_hours: selectedItem.max_flight_hours ?? '',
      condition_status: selectedItem.condition_status || 'Serviceable',
      manufacturer: selectedItem.manufacturer || '',
      certificate_number: selectedItem.certificate_number || ''
    });
    setEditMode(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode
      ? `${API}/part-lifecycle/${selectedItem.id}`
      : `${API}/part-lifecycle`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Request failed');
      showToast(editMode ? 'Part updated successfully' : 'Part created successfully');
      setShowForm(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to save part', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      const res = await fetch(`${API}/part-lifecycle/${selectedItem.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Part deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete part', 'error');
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/parts-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_number: selectedItem.part_number,
          part_name: selectedItem.part_name,
          cycle_count: selectedItem.cycle_count,
          max_cycles: selectedItem.max_cycles,
          flight_hours: selectedItem.flight_hours,
          condition_status: selectedItem.condition_status,
          installed_date: selectedItem.installed_date
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

  const ProgressBar = ({ count, max }) => {
    const pct = cyclePercent(count, max);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1, height: '8px', background: 'var(--bg-dark)',
          borderRadius: '4px', overflow: 'hidden', minWidth: '60px'
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: progressColor(pct), borderRadius: '4px',
            transition: 'width 0.4s ease'
          }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{pct}%</span>
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
          <h1>Parts Lifecycle Tracking</h1>
          <p className="subtitle">Monitor aircraft component lifecycle, inspections, and condition</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Part</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading parts...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No parts found</p>
          <p style={{ fontSize: '0.85rem' }}>Click "Add Part" to create your first part record.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Part Name</th>
                <th>Aircraft</th>
                <th>Cycles</th>
                <th>Condition</th>
                <th>Next Inspection</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => openDetail(item)}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{item.part_number}</td>
                  <td>{item.part_name}</td>
                  <td>{item.aircraft_reg || '-'}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      {item.cycle_count ?? 0} / {item.max_cycles ?? '-'}
                    </div>
                    <ProgressBar count={item.cycle_count} max={item.max_cycles} />
                  </td>
                  <td><span className={`badge badge-${conditionBadge(item.condition_status)}`}>{item.condition_status}</span></td>
                  <td>{formatDate(item.next_inspection)}</td>
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
              <h2>{selectedItem.part_number} - {selectedItem.part_name}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Part Number</label>
                  <div className="value">{selectedItem.part_number}</div>
                </div>
                <div className="detail-item">
                  <label>Part Name</label>
                  <div className="value">{selectedItem.part_name}</div>
                </div>
                <div className="detail-item">
                  <label>Serial Number</label>
                  <div className="value">{selectedItem.serial_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Registration</label>
                  <div className="value">{selectedItem.aircraft_reg || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Manufacturer</label>
                  <div className="value">{selectedItem.manufacturer || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Certificate Number</label>
                  <div className="value">{selectedItem.certificate_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Installed Date</label>
                  <div className="value">{formatDate(selectedItem.installed_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Last Inspection</label>
                  <div className="value">{formatDate(selectedItem.last_inspection)}</div>
                </div>
                <div className="detail-item">
                  <label>Next Inspection</label>
                  <div className="value">{formatDate(selectedItem.next_inspection)}</div>
                </div>
                <div className="detail-item">
                  <label>Condition</label>
                  <div className="value">
                    <span className={`badge badge-${conditionBadge(selectedItem.condition_status)}`}>{selectedItem.condition_status}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Flight Hours</label>
                  <div className="value">{selectedItem.flight_hours ?? 0} / {selectedItem.max_flight_hours ?? '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Cycle Count</label>
                  <div className="value">{selectedItem.cycle_count ?? 0} / {selectedItem.max_cycles ?? '-'}</div>
                </div>
              </div>

              {/* Cycle Progress */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ marginBottom: '8px' }}>Cycle Usage</label>
                <ProgressBar count={selectedItem.cycle_count} max={selectedItem.max_cycles} />
              </div>

              {/* AI Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI Parts Analysis'}
                </button>

                {aiLoading && (
                  <div className="ai-loading">Generating AI analysis...</div>
                )}

                {aiResult && (
                  <div className="ai-result">
                    <h3>AI Parts Analysis</h3>
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
              <h2>{editMode ? 'Edit Part' : 'Add New Part'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Part Number</label>
                    <input name="part_number" value={formData.part_number} onChange={handleChange} required placeholder="e.g., PN-737-1234" />
                  </div>
                  <div className="form-group">
                    <label>Part Name</label>
                    <input name="part_name" value={formData.part_name} onChange={handleChange} required placeholder="e.g., Landing Gear Actuator" />
                  </div>
                  <div className="form-group">
                    <label>Serial Number</label>
                    <input name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="e.g., SN-00456" />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={formData.aircraft_reg} onChange={handleChange} placeholder="e.g., N12345" />
                  </div>
                  <div className="form-group">
                    <label>Installed Date</label>
                    <input name="installed_date" type="date" value={formData.installed_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Last Inspection</label>
                    <input name="last_inspection" type="date" value={formData.last_inspection} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Next Inspection</label>
                    <input name="next_inspection" type="date" value={formData.next_inspection} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Condition Status</label>
                    <select name="condition_status" value={formData.condition_status} onChange={handleChange}>
                      {conditionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cycle Count</label>
                    <input name="cycle_count" type="number" value={formData.cycle_count} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Max Cycles</label>
                    <input name="max_cycles" type="number" value={formData.max_cycles} onChange={handleChange} placeholder="e.g., 10000" />
                  </div>
                  <div className="form-group">
                    <label>Flight Hours</label>
                    <input name="flight_hours" type="number" value={formData.flight_hours} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Max Flight Hours</label>
                    <input name="max_flight_hours" type="number" value={formData.max_flight_hours} onChange={handleChange} placeholder="e.g., 20000" />
                  </div>
                  <div className="form-group">
                    <label>Manufacturer</label>
                    <input name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="e.g., Boeing" />
                  </div>
                  <div className="form-group">
                    <label>Certificate Number</label>
                    <input name="certificate_number" value={formData.certificate_number} onChange={handleChange} placeholder="e.g., CERT-2024-001" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update Part' : 'Create Part'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartLifecycle;
